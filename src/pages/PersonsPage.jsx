import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { Users, Search, RefreshCw, Plus, Trash2, Edit, ChevronLeft, ChevronRight, X, Camera, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = { name: '', employee_no: '', department: '', email: '', phone: '' };

// Аватар: фото если есть, иначе инициалы
function Avatar({ person, size = 'md' }) {
  const [imgError, setImgError] = useState(false);
  const dim = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-9 h-9 text-sm';

  const nameStr = String(person?.name || person?.employee_no || '?');
  const initials = nameStr
    .split(' ')
    .map(w => w[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  const photoUrl = person?.photo_url || person?.face_url || person?.avatar_url;

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={nameStr}
        onError={() => setImgError(true)}
        className={`${dim} rounded-full object-cover ring-2 ring-violet-500/30 flex-shrink-0`}
      />
    );
  }

  const colors = [
    'from-violet-600 to-indigo-600',
    'from-pink-600 to-rose-600',
    'from-emerald-600 to-teal-600',
    'from-amber-600 to-orange-600',
    'from-sky-600 to-blue-600',
  ];
  // Safe index — avoid NaN
  const keyStr = String(person?.employee_no || person?.name || '0');
  const colorIdx = (keyStr.charCodeAt(0) || 0) % colors.length;
  const color = colors[colorIdx];

  return (
    <div className={`${dim} rounded-full bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 font-semibold text-white`}>
      {initials}
    </div>
  );
}


export default function PersonsPage() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // null | 'create' | person_obj
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const limit = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, offset: page * limit });
      if (search) params.set('search', search);
      const res = await apiFetch(`/ext/v1/persons?${params}`);
      setData(res?.data || []);
      setTotal(res?.pagination?.total || 0);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setPhotoFile(null);
    setPhotoPreview(null);
    setModal('create');
  };

  const openEdit = (p) => {
    setForm({ name: p.name || '', employee_no: p.employee_no || '', department: p.department || '', email: p.email || '', phone: p.phone || '' });
    setPhotoFile(null);
    setPhotoPreview(p.photo_url || p.face_url || null);
    setModal(p);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Upload face photo to device management
  const uploadFacePhoto = async (employeeNo) => {
    if (!photoFile || !employeeNo) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('employee_no', employeeNo);
      fd.append('image', photoFile);
      const token = localStorage.getItem('acs_user_token');
      // Route through our backend proxy
      await fetch('/api/acs/v1/device-management/face/upload?gateway=gateway-a', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      toast.success('Фото лица загружено на устройство');
    } catch (e) {
      toast.error('Ошибка загрузки фото: ' + e.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      let savedPerson;
      if (modal === 'create') {
        const res = await apiFetch('/ext/v1/persons', { method: 'POST', body: JSON.stringify(form) });
        savedPerson = res?.data || res;
        toast.success('Персона создана');
      } else {
        // PATCH — partial update (only changed fields)
        const patch = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
        const res = await apiFetch(`/ext/v1/persons/${modal.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
        savedPerson = res?.data || res;
        toast.success('Персона обновлена');
      }
      // Upload photo if selected
      const empNo = form.employee_no || savedPerson?.employee_no;
      if (photoFile && empNo) {
        await uploadFacePhoto(empNo);
      }
      setModal(null);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить персону?')) return;
    try {
      await apiFetch(`/ext/v1/persons/${id}`, { method: 'DELETE' });
      toast.success('Удалено');
      load();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="w-6 h-6 text-violet-400" />Персоны</h1>
          <p className="text-slate-400 text-sm mt-1">Управление сотрудниками и их данными</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all text-sm font-medium">
            <Plus className="w-4 h-4" />Добавить
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Поиск по имени или табельному номеру..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm" />
      </div>

      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-white/10">
            {['Фото', 'Имя', 'Таб. №', 'Отдел', 'Email', 'Статус', ''].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center">
                <div className="flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
              </td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-500 text-sm">Персон не найдено</td></tr>
            ) : data.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-all group">
                {/* Avatar Cell */}
                <td className="px-4 py-2.5">
                  <div className="relative">
                    <Avatar person={p} size="md" />
                    <button
                      onClick={() => openEdit(p)}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-sm text-white font-medium">{p.name || '—'}</td>
                <td className="px-4 py-2.5 text-sm text-slate-300 font-mono">{p.employee_no || '—'}</td>
                <td className="px-4 py-2.5 text-sm text-slate-300">{p.department || '—'}</td>
                <td className="px-4 py-2.5 text-sm text-slate-400">{p.email || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium
                    ${p.deploy_status === 'deployed' ? 'bg-green-500/20 text-green-400'
                    : p.deploy_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-slate-500/20 text-slate-400'}`}>
                    {p.deploy_status || 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:bg-violet-500/20 hover:text-violet-400 transition-all"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <span className="text-xs text-slate-500">Всего: {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40 transition-all"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs text-slate-400 self-center">Стр. {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40 transition-all"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">{modal === 'create' ? 'Новая персона' : 'Редактировать персону'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            {/* Photo Upload Section */}
            <div className="flex items-center gap-4 mb-5 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="relative flex-shrink-0">
                {photoPreview ? (
                  <img src={photoPreview} alt="preview"
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-violet-500/40" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border-2 border-dashed border-violet-500/40 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-violet-400/60" />
                  </div>
                )}
                {photoPreview && (
                  <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs hover:bg-red-400 transition-colors">
                    ×
                  </button>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-1">Фото персоны</p>
                <p className="text-xs text-slate-500 mb-2">Загружается на ACS устройство через gateway-a</p>
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400 hover:bg-violet-600/30 transition-all cursor-pointer text-xs font-medium w-fit">
                  <Upload className="w-3.5 h-3.5" />
                  {photoFile ? photoFile.name.slice(0, 20) + '...' : 'Выбрать фото (JPEG)'}
                  <input type="file" accept="image/jpeg,image/jpg" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {[['Имя', 'name', 'text'], ['Таб. номер', 'employee_no', 'text'], ['Отдел', 'department', 'text'], ['Email', 'email', 'email'], ['Телефон', 'phone', 'tel']].map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-sm text-slate-300 mb-1">{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm">Отмена</button>
              <button onClick={handleSave} disabled={uploadingPhoto}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2">
                {uploadingPhoto ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Загрузка...</> : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
