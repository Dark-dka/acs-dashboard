import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { CreditCard, Fingerprint, RefreshCw, Plus, Trash2, ChevronLeft, ChevronRight, X, Image, Zap, User } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'cards', label: '💳 Карты', icon: CreditCard },
  { id: 'fingerprints', label: '👆 Отпечатки', icon: Fingerprint },
  { id: 'faces', label: '🤳 Лица', icon: Image },
  { id: 'summary', label: '📊 Сводка', icon: User },
  { id: 'capabilities', label: '⚡ Возможности', icon: Zap },
];

export default function CredentialsPage() {
  const [tab, setTab] = useState('cards');
  const [cards, setCards] = useState([]);
  const [fingerprints, setFingerprints] = useState([]);
  const [faces, setFaces] = useState([]);
  const [capabilities, setCapabilities] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryEmpNo, setSummaryEmpNo] = useState('');
  const [cardTotal, setCardTotal] = useState(0);
  const [fpTotal, setFpTotal] = useState(0);
  const [cardPage, setCardPage] = useState(0);
  const [fpPage, setFpPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [empNoFilter, setEmpNoFilter] = useState('');
  const [cardForm, setCardForm] = useState({ employee_no: '', card_no: '' });
  const [showCardModal, setShowCardModal] = useState(false);
  const limit = 10;

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, offset: cardPage * limit });
      if (empNoFilter) params.set('employee_no', empNoFilter);
      const res = await apiFetch(`/ext/v1/credentials/cards?${params}`);
      setCards(res?.data || []);
      setCardTotal(res?.pagination?.total || 0);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [cardPage, empNoFilter]);

  const loadFingerprints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, offset: fpPage * limit });
      if (empNoFilter) params.set('employee_no', empNoFilter);
      const res = await apiFetch(`/ext/v1/credentials/fingerprints?${params}`);
      setFingerprints(res?.data || []);
      setFpTotal(res?.pagination?.total || 0);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [fpPage, empNoFilter]);

  const loadFaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/ext/v1/credentials/faces');
      setFaces(res?.data || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, []);

  const loadCapabilities = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/ext/v1/credentials/capabilities');
      setCapabilities(res?.data || res);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const loadSummary = async () => {
    if (!summaryEmpNo) { toast.error('Введите табельный номер'); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`/ext/v1/credentials/summary/${summaryEmpNo}`);
      setSummary(res?.data || res);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'cards') loadCards();
    if (tab === 'fingerprints') loadFingerprints();
    if (tab === 'faces') loadFaces();
    if (tab === 'capabilities' && !capabilities) loadCapabilities();
  }, [tab, loadCards, loadFingerprints, loadFaces]);

  const createCard = async () => {
    if (!cardForm.employee_no || !cardForm.card_no) { toast.error('Заполните поля'); return; }
    try {
      await apiFetch('/ext/v1/credentials/cards', { method: 'POST', body: JSON.stringify(cardForm) });
      toast.success('Карта добавлена');
      setShowCardModal(false);
      setCardForm({ employee_no: '', card_no: '' });
      loadCards();
    } catch (e) { toast.error(e.message); }
  };

  const deleteCard = async (id, employee_no) => {
    if (!confirm('Удалить карту?')) return;
    try {
      await apiFetch(`/ext/v1/credentials/cards/${id}?employee_no=${employee_no}`, { method: 'DELETE' });
      toast.success('Карта удалена');
      loadCards();
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><CreditCard className="w-6 h-6 text-violet-400" />Доступы</h1>
        <p className="text-slate-400 text-sm mt-1">Управление учётными данными системы контроля доступа</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Shared filter */}
      {(tab === 'cards' || tab === 'fingerprints') && (
        <div className="flex gap-3 items-center">
          <input value={empNoFilter} onChange={e => setEmpNoFilter(e.target.value)}
            placeholder="Фильтр по таб. номеру..."
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 w-64" />
          <button onClick={() => { if (tab === 'cards') loadCards(); else loadFingerprints(); }}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {tab === 'cards' && (
            <button onClick={() => setShowCardModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium">
              <Plus className="w-4 h-4" />Добавить карту
            </button>
          )}
        </div>
      )}

      {/* Cards table */}
      {tab === 'cards' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-white/10">
              {['Таб. №', 'Номер карты', 'Тип', 'Статус', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 uppercase font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center"><div className="flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div></td></tr>
              ) : cards.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-500 text-sm">Карт не найдено</td></tr>
              ) : cards.map((c, i) => (
                <tr key={c.id || i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2.5 text-sm text-violet-300 font-mono">{c.employee_no || '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-white font-mono">{c.card_no || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{c.card_type || 'normalCard'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${c.active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {c.active !== false ? 'Активна' : 'Нет'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => deleteCard(c.id, c.employee_no)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-xs text-slate-500">Всего: {cardTotal}</span>
            <div className="flex gap-2">
              <button onClick={() => setCardPage(p => Math.max(0, p - 1))} disabled={cardPage === 0} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-slate-400 self-center">Стр. {cardPage + 1}</span>
              <button onClick={() => setCardPage(p => p + 1)} disabled={(cardPage + 1) * limit >= cardTotal} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Fingerprints table */}
      {tab === 'fingerprints' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-white/10">
              {['Таб. №', 'ID пальца', 'Метод', 'Статус'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 uppercase font-semibold">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="py-12 text-center"><div className="flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div></td></tr>
              ) : fingerprints.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-slate-500 text-sm">Отпечатков не найдено</td></tr>
              ) : fingerprints.map((f, i) => (
                <tr key={f.id || i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2.5 text-sm text-violet-300 font-mono">{f.employee_no || '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-white font-mono">{f.finger_print_id ?? f.fingerPrintId ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{f.fp_method || f.method || 'FP'}</td>
                  <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-lg bg-green-500/20 text-green-400">Записан</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-xs text-slate-500">Всего: {fpTotal}</span>
            <div className="flex gap-2">
              <button onClick={() => setFpPage(p => Math.max(0, p - 1))} disabled={fpPage === 0} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-slate-400 self-center">Стр. {fpPage + 1}</span>
              <button onClick={() => setFpPage(p => p + 1)} disabled={(fpPage + 1) * limit >= fpTotal} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Faces tab */}
      {tab === 'faces' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Фото лиц</span>
            <button onClick={loadFaces} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : faces.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Image className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Управление лицами доступно через Device Management</p>
              <p className="text-xs mt-1 text-slate-600">API: face listing отложено, используйте /ext/v1/device-management/face/upload</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
              {faces.map((f, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  {f.photo_url ? <img src={f.photo_url} alt="" className="w-24 h-24 object-cover rounded-xl mx-auto mb-2" /> : <div className="w-24 h-24 bg-violet-500/20 rounded-xl mx-auto mb-2 flex items-center justify-center"><Image className="w-8 h-8 text-violet-400" /></div>}
                  <p className="text-xs text-white font-mono">{f.employee_no || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary tab */}
      {tab === 'summary' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input value={summaryEmpNo} onChange={e => setSummaryEmpNo(e.target.value)}
              placeholder="Таб. номер сотрудника..."
              className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 w-64" />
            <button onClick={loadSummary} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all">
              <User className="w-4 h-4" />Загрузить сводку
            </button>
          </div>
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Cards summary */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-3"><CreditCard className="w-4 h-4 text-violet-400" />Карты ({(summary.cards || []).length})</h3>
                <div className="space-y-1.5">
                  {(summary.cards || []).map((c, i) => (
                    <div key={i} className="px-3 py-1.5 bg-white/5 rounded-lg text-xs font-mono text-white">{c.card_no || c.cardNo || JSON.stringify(c)}</div>
                  ))}
                  {!(summary.cards?.length) && <p className="text-xs text-slate-500">Нет карт</p>}
                </div>
              </div>
              {/* Fingerprints summary */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-3"><Fingerprint className="w-4 h-4 text-violet-400" />Отпечатки ({(summary.fingerprints || []).length})</h3>
                <div className="space-y-1.5">
                  {(summary.fingerprints || []).map((f, i) => (
                    <div key={i} className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white">Палец #{f.finger_print_id ?? f.fingerPrintId ?? i + 1}</div>
                  ))}
                  {!(summary.fingerprints?.length) && <p className="text-xs text-slate-500">Нет отпечатков</p>}
                </div>
              </div>
              {/* Raw */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-medium text-white mb-3">Все данные</h3>
                <pre className="text-xs text-slate-400 font-mono overflow-auto max-h-40 whitespace-pre-wrap break-all">{JSON.stringify(summary, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Capabilities tab */}
      {tab === 'capabilities' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white flex items-center gap-2"><Zap className="w-4 h-4 text-violet-400" />Поддерживаемые типы учётных данных</h3>
            <button onClick={loadCapabilities} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          {!capabilities ? (
            <p className="text-slate-500 text-sm">Загрузка...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Array.isArray(capabilities) ? capabilities : Object.entries(capabilities)).map((item, i) => {
                const [k, v] = Array.isArray(item) ? item : [item, true];
                return (
                  <div key={i} className={`px-4 py-3 rounded-xl border text-center ${v ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
                    <p className="text-sm font-medium text-white">{k}</p>
                    <p className={`text-xs mt-1 ${v ? 'text-green-400' : 'text-slate-500'}`}>{v ? '✓ Поддерживается' : '✗ Нет'}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Card Modal */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">Добавить карту</h2>
              <button onClick={() => setShowCardModal(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {[['Таб. номер', 'employee_no'], ['Номер карты', 'card_no']].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-sm text-slate-300 mb-1">{label}</label>
                  <input value={cardForm[key]} onChange={e => setCardForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCardModal(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm">Отмена</button>
              <button onClick={createCard} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium">Добавить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
