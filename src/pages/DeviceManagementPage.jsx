import { useState, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { Cpu, RefreshCw, Upload, Settings, Radar, CreditCard, DoorOpen, Fingerprint, Terminal, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';

const GW_DEFAULT = 'gateway-a';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
      <h2 className="font-semibold text-white text-sm flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-violet-400" />{title}
      </h2>
      {children}
    </div>
  );
}

export default function DeviceManagementPage() {
  const [gateway, setGateway] = useState(GW_DEFAULT);
  const [capabilities, setCapabilities] = useState(null);
  const [personCount, setPersonCount] = useState(null);
  const [devPersons, setDevPersons] = useState([]);
  const [devCards, setDevCards] = useState([]);
  const [modeBStatus, setModeBStatus] = useState(null);
  const [faceForm, setFaceForm] = useState({ employee_no: '', file: null });
  const [fpCaptured, setFpCaptured] = useState(null);
  const [fpAddForm, setFpAddForm] = useState({ employee_no: '', finger_print_id: 1 });
  const [doorParams, setDoorParams] = useState({ door_no: 1, openDuration: 5, closeTimeout: 10 });
  const [passthrough, setPassthrough] = useState({ method: 'GET', isapi_path: '/ISAPI/AccessControl/AcsCfg' });
  const [passthroughResult, setPassthroughResult] = useState(null);
  const [loading, setLoading] = useState({});
  const [uploading, setUploading] = useState(false);

  const setLoad = (k, v) => setLoading(l => ({ ...l, [k]: v }));

  const apiCall = async (key, fn) => {
    setLoad(key, true);
    try { return await fn(); } catch (e) { toast.error(e.message); return null; } finally { setLoad(key, false); }
  };

  const loadCapabilities = () => apiCall('cap', async () => {
    const res = await apiFetch(`/ext/v1/device-management/capabilities?gateway=${gateway}`);
    setCapabilities(res?.data || res);
  });

  const loadPersonCount = () => apiCall('pc', async () => {
    const res = await apiFetch(`/ext/v1/device-management/person-count?gateway=${gateway}`);
    setPersonCount(res?.data || res);
  });

  const loadDevPersons = () => apiCall('dp', async () => {
    const res = await apiFetch(`/ext/v1/device-management/persons?gateway=${gateway}&max_results=30`);
    setDevPersons(res?.data || []);
  });

  const loadDevCards = () => apiCall('dc', async () => {
    const res = await apiFetch(`/ext/v1/device-management/cards?gateway=${gateway}&max_results=30`);
    setDevCards(res?.data || []);
  });

  const loadModeBStatus = () => apiCall('mb', async () => {
    const res = await apiFetch(`/ext/v1/device-management/mode-b-status?gateway=${gateway}`);
    setModeBStatus(res?.data || res);
  });

  const saveDoorParams = () => apiCall('dp_save', async () => {
    await apiFetch(`/ext/v1/device-management/doors/${doorParams.door_no}/params?gateway=${gateway}`, {
      method: 'PUT',
      body: JSON.stringify({ openDuration: Number(doorParams.openDuration), closeTimeout: Number(doorParams.closeTimeout) }),
    });
    toast.success('Параметры двери обновлены');
  });

  const captureFingerprint = () => apiCall('fpc', async () => {
    const res = await apiFetch(`/ext/v1/device-management/fingerprint/capture?gateway=${gateway}`, {
      method: 'POST',
      body: JSON.stringify({ finger_no: 1 }),
    });
    const data = res?.data || res;
    setFpCaptured(data);
    setFpAddForm(f => ({ ...f, finger_data: data?.fingerData || data?.finger_data || '' }));
    toast.success('Отпечаток захвачен');
  });

  const addFingerprint = () => apiCall('fpa', async () => {
    await apiFetch(`/ext/v1/device-management/fingerprint/add?gateway=${gateway}`, {
      method: 'POST',
      body: JSON.stringify({ ...fpAddForm, finger_print_id: Number(fpAddForm.finger_print_id) }),
    });
    toast.success('Отпечаток добавлен на устройство');
    setFpCaptured(null);
  });

  const runPassthrough = () => apiCall('pt', async () => {
    const res = await apiFetch(`/ext/v1/device-management/passthrough?gateway=${gateway}`, {
      method: 'POST',
      body: JSON.stringify(passthrough),
    });
    setPassthroughResult(res?.data || res);
  });

  const uploadFace = async (e) => {
    e.preventDefault();
    if (!faceForm.file || !faceForm.employee_no) { toast.error('Заполните все поля'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('employee_no', faceForm.employee_no);
      fd.append('image', faceForm.file);
      const token = localStorage.getItem('acs_user_token');
      await fetch(`/api/acs/v1/device-management/face/upload?gateway=${gateway}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      toast.success('Фото лица загружено');
      setFaceForm({ employee_no: '', file: null });
    } catch (ex) { toast.error(ex.message); } finally { setUploading(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Settings className="w-6 h-6 text-violet-400" />Управление устройствами</h1>
        <p className="text-slate-400 text-sm mt-1">Управление ACS устройствами через gateway</p>
      </div>

      {/* Gateway selector */}
      <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
        <Cpu className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-300">Gateway:</span>
        <input value={gateway} onChange={e => setGateway(e.target.value)}
          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 w-40" />
        <div className="ml-auto flex gap-2">
          <button onClick={loadModeBStatus} className="text-xs text-slate-400 hover:text-violet-400 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 transition-all">
            {loading.mb ? '...' : 'Mode B статус'}
          </button>
          {modeBStatus !== null && (
            <span className="text-xs text-white px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30">
              {JSON.stringify(modeBStatus).slice(0, 60)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Capabilities */}
        <Section title="Возможности ACS" icon={Cpu}>
          <button onClick={loadCapabilities} disabled={loading.cap} className="mb-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading.cap ? 'animate-spin text-violet-400' : ''}`} />Загрузить
          </button>
          {!capabilities ? (
            <p className="text-slate-500 text-sm text-center py-4">Нажмите «Загрузить»</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
              {Object.entries(capabilities).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-3 py-1.5 bg-white/5 rounded-lg">
                  <span className="text-xs text-slate-400">{k}</span>
                  <span className="text-xs text-white font-mono">{typeof v === 'boolean' ? (v ? '✓' : '✗') : String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Person count + Mode B */}
        <Section title="Счётчик персон" icon={Wifi}>
          <button onClick={loadPersonCount} disabled={loading.pc} className="mb-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading.pc ? 'animate-spin text-violet-400' : ''}`} />Загрузить
          </button>
          {personCount === null ? (
            <p className="text-slate-500 text-sm">Нажмите «Загрузить»</p>
          ) : (
            <p className="text-4xl font-bold text-violet-400">{personCount?.count ?? personCount?.total ?? JSON.stringify(personCount)}</p>
          )}
        </Section>

        {/* Persons on device */}
        <Section title="Персоны на устройстве" icon={Cpu}>
          <button onClick={loadDevPersons} disabled={loading.dp} className="mb-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading.dp ? 'animate-spin text-violet-400' : ''}`} />Загрузить
          </button>
          {devPersons.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-2">Нажмите «Загрузить»</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {devPersons.map((p, i) => (
                <div key={p.employeeNo || i} className="flex gap-3 px-3 py-1.5 bg-white/5 rounded-lg">
                  <span className="text-xs font-mono text-violet-400">{p.employeeNo || p.employee_no || '—'}</span>
                  <span className="text-xs text-slate-300">{p.name || p.Name || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Cards on device */}
        <Section title="Карты на устройстве" icon={CreditCard}>
          <button onClick={loadDevCards} disabled={loading.dc} className="mb-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading.dc ? 'animate-spin text-violet-400' : ''}`} />Загрузить
          </button>
          {devCards.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-2">Нажмите «Загрузить»</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {devCards.map((c, i) => (
                <div key={c.cardNo || i} className="flex gap-3 px-3 py-1.5 bg-white/5 rounded-lg">
                  <span className="text-xs font-mono text-violet-400">{c.employeeNo || c.employee_no || '—'}</span>
                  <span className="text-xs text-slate-300 font-mono">{c.cardNo || c.card_no || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Door params */}
        <Section title="Параметры двери" icon={DoorOpen}>
          <div className="space-y-3">
            {[['Номер двери', 'door_no'], ['Время открытия (сек)', 'openDuration'], ['Таймаут закрытия', 'closeTimeout']].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input type="number" value={doorParams[key]} onChange={e => setDoorParams(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
              </div>
            ))}
            <button onClick={saveDoorParams} disabled={loading.dp_save}
              className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50">
              {loading.dp_save ? 'Сохранение...' : 'Применить параметры'}
            </button>
          </div>
        </Section>

        {/* Face Upload */}
        <Section title="Загрузить фото лица" icon={Upload}>
          <form onSubmit={uploadFace} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Таб. номер</label>
              <input value={faceForm.employee_no} onChange={e => setFaceForm(f => ({ ...f, employee_no: e.target.value }))} placeholder="100"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-slate-500" />
            </div>
            <input type="file" accept="image/jpeg,image/jpg" onChange={e => setFaceForm(f => ({ ...f, file: e.target.files[0] }))}
              className="w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-violet-600 file:text-white file:cursor-pointer file:text-xs hover:file:bg-violet-500" />
            <button type="submit" disabled={uploading}
              className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50">
              {uploading ? 'Загрузка...' : 'Загрузить фото'}
            </button>
          </form>
        </Section>

        {/* Fingerprint Capture + Add */}
        <Section title="Биометрия (отпечаток)" icon={Fingerprint}>
          <div className="space-y-3">
            <button onClick={captureFingerprint} disabled={loading.fpc}
              className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm transition-all disabled:opacity-50">
              {loading.fpc ? 'Сканирование...' : '👆 Сканировать отпечаток'}
            </button>
            {fpCaptured && (
              <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-xs text-green-400">Отпечаток захвачен ✓</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{JSON.stringify(fpCaptured).slice(0, 80)}...</p>
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-300 mb-1">Таб. номер сотрудника</label>
              <input value={fpAddForm.employee_no} onChange={e => setFpAddForm(f => ({ ...f, employee_no: e.target.value }))} placeholder="100"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-slate-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">ID пальца (1-10)</label>
              <input type="number" min={1} max={10} value={fpAddForm.finger_print_id} onChange={e => setFpAddForm(f => ({ ...f, finger_print_id: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
            </div>
            <button onClick={addFingerprint} disabled={loading.fpa || !fpCaptured || !fpAddForm.employee_no}
              className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50">
              {loading.fpa ? 'Добавление...' : '💾 Сохранить на устройство'}
            </button>
          </div>
        </Section>

        {/* ISAPI Passthrough */}
        <Section title="ISAPI Passthrough" icon={Terminal}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select value={passthrough.method} onChange={e => setPassthrough(p => ({ ...p, method: e.target.value }))}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
                {['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m} value={m} className="bg-[#1a1d2e]">{m}</option>)}
              </select>
              <input value={passthrough.isapi_path} onChange={e => setPassthrough(p => ({ ...p, isapi_path: e.target.value }))}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500" />
            </div>
            <button onClick={runPassthrough} disabled={loading.pt}
              className="w-full py-2 rounded-xl bg-orange-600/80 hover:bg-orange-500 text-white text-sm font-medium transition-all disabled:opacity-50">
              {loading.pt ? 'Выполнение...' : '⚡ Выполнить ISAPI'}
            </button>
            {passthroughResult && (
              <div className="bg-[#0d0f18] border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">{JSON.stringify(passthroughResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
