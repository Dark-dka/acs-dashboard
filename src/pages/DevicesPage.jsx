import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import {
  Monitor, Search, RefreshCw, ChevronLeft, ChevronRight, Info,
  Radar, Plus, Wifi, WifiOff, Cpu, Users, CreditCard, DoorOpen,
  Activity, Settings, ChevronDown, X, CheckCircle, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Per docs: use device_id (platform UUID) for all device-aware endpoints

function StatusBadge({ status }) {
  const map = {
    online:     { cls: 'bg-green-500/20 text-green-400 border-green-500/30',  dot: 'bg-green-400',  label: 'Online' },
    offline:    { cls: 'bg-red-500/20 text-red-400 border-red-500/30',        dot: 'bg-red-400',    label: 'Offline' },
    unknown:    { cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30',  dot: 'bg-slate-400',  label: 'Unknown' },
    available:  { cls: 'bg-green-500/20 text-green-400 border-green-500/30',  dot: 'bg-green-400',  label: 'Available' },
  };
  const s = map[status?.toLowerCase()] || map.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {s.label}
    </span>
  );
}

function DeviceDetailPanel({ device, onClose }) {
  const [tab, setTab] = useState('info');
  const [caps, setCaps] = useState(null);
  const [personCount, setPersonCount] = useState(null);
  const [persons, setPersons] = useState([]);
  const [cards, setCards] = useState([]);
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState({});

  const deviceId = device?.id;

  const setLoad = (k, v) => setLoading(l => ({ ...l, [k]: v }));

  const loadCaps = async () => {
    setLoad('caps', true);
    try {
      const r = await apiFetch(`/ext/v1/device-management/capabilities?device_id=${deviceId}`);
      setCaps(r?.data || r);
    } catch (e) { toast.error(e.message); } finally { setLoad('caps', false); }
  };

  const loadPersonCount = async () => {
    setLoad('pc', true);
    try {
      const r = await apiFetch(`/ext/v1/device-management/person-count?device_id=${deviceId}`);
      setPersonCount(r?.data?.count ?? r?.data ?? null);
    } catch (e) { toast.error(e.message); } finally { setLoad('pc', false); }
  };

  const loadPersons = async () => {
    setLoad('persons', true);
    try {
      const r = await apiFetch(`/ext/v1/device-management/persons?device_id=${deviceId}&max_results=50`);
      setPersons(r?.data || []);
    } catch (e) { toast.error(e.message); } finally { setLoad('persons', false); }
  };

  const loadCards = async () => {
    setLoad('cards', true);
    try {
      const r = await apiFetch(`/ext/v1/device-management/cards?device_id=${deviceId}&max_results=50`);
      setCards(r?.data || []);
    } catch (e) { toast.error(e.message); } finally { setLoad('cards', false); }
  };

  const loadDoors = async () => {
    setLoad('doors', true);
    try {
      // Per docs: GET /ext/v1/devices/{device_id}/doors
      const r = await apiFetch(`/ext/v1/devices/${deviceId}/doors`);
      setDoors(r?.data || []);
    } catch (e) { toast.error(e.message); } finally { setLoad('doors', false); }
  };

  const doorAction = async (doorNo, action) => {
    try {
      // Per docs: POST /ext/v1/doors/{door_no}/actions?device_id=<uuid>
      await apiFetch(`/ext/v1/doors/${doorNo}/actions?device_id=${deviceId}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      toast.success(`Дверь ${doorNo}: ${action}`);
    } catch (e) { toast.error(e.message); }
  };

  useEffect(() => {
    if (tab === 'info') { loadCaps(); loadPersonCount(); }
    if (tab === 'persons') loadPersons();
    if (tab === 'cards') loadCards();
    if (tab === 'doors') loadDoors();
  }, [tab]);

  const tabs = [
    { id: 'info',    label: 'Инфо',    icon: Info },
    { id: 'persons', label: 'Персоны', icon: Users },
    { id: 'cards',   label: 'Карты',   icon: CreditCard },
    { id: 'doors',   label: 'Двери',   icon: DoorOpen },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-50 p-4">
      <div className="bg-[#13151f] border border-white/10 rounded-2xl w-full max-w-xl h-full max-h-[90vh] flex flex-col shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/40 to-indigo-600/40 border border-violet-500/30 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{device.name || device.dev_name || 'Устройство'}</p>
              <p className="text-xs text-slate-500 font-mono">{device.serial_no || device.serial_number || device.id?.slice(0, 16) || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={device.status || device.dev_status} />
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Device ID badge */}
        <div className="px-5 py-2 bg-violet-500/5 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
          <Activity className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-slate-400">ID: <span className="text-violet-300 font-mono">{deviceId?.slice(0, 16)}...</span></span>
          {device.ip_address && (
            <span className="text-xs text-slate-500 ml-2">IP: <span className="font-mono text-slate-300">{device.ip_address}</span></span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-white/10 flex-shrink-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === id ? 'bg-violet-500/20 text-violet-300' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* INFO TAB */}
          {tab === 'info' && (
            <div className="space-y-3">
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Персон на устройстве</p>
                  {loading.pc ? (
                    <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    <p className="text-3xl font-bold text-violet-400">{personCount ?? '—'}</p>
                  )}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Модель</p>
                  <p className="text-sm font-semibold text-white truncate">{device.model || device.dev_model || '—'}</p>
                </div>
              </div>

              {/* Device fields */}
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/10">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Параметры устройства</p>
                </div>
                <div className="divide-y divide-white/5">
                  {[
                    ['ID платформы', device.id],
                    ['Серийный №', device.serial_no || device.serial_number],
                    ['IP адрес', device.ip_address],
                    ['Модель', device.model || device.dev_model],
                    ['Тип', device.dev_type],
                    ['Статус', device.status || device.dev_status],
                    ['Dev Index', device.dev_index],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex gap-3 px-4 py-2.5">
                      <span className="text-xs text-slate-500 w-28 flex-shrink-0">{k}</span>
                      <span className="text-xs text-white font-mono break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Capabilities */}
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Возможности ACS</p>
                  <button onClick={loadCaps} disabled={loading.caps}
                    className="text-xs text-slate-500 hover:text-violet-400 transition-all flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${loading.caps ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {!caps ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    {loading.caps ? 'Загрузка...' : 'Нет данных'}
                  </p>
                ) : (
                  <div className="divide-y divide-white/5">
                    {[
                      ['Карты', caps.supports_card],
                      ['Лица', caps.supports_face],
                      ['Отпечатки', caps.supports_fingerprint],
                      ['QR-код', caps.supports_qr],
                      ['Удаленное управление', caps.supports_remote_control],
                      ['Поиск событий', caps.supports_event_search],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs text-slate-400">{k}</span>
                        {v ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>
                    ))}
                    {caps.max_persons > 0 && (
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs text-slate-400">Макс. персон</span>
                        <span className="text-xs text-white font-mono">{caps.max_persons}</span>
                      </div>
                    )}
                    {caps.max_cards > 0 && (
                      <div className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs text-slate-400">Макс. карт</span>
                        <span className="text-xs text-white font-mono">{caps.max_cards}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PERSONS TAB */}
          {tab === 'persons' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">Персоны, загруженные на устройство</p>
                <button onClick={loadPersons} disabled={loading.persons}
                  className="text-xs text-slate-400 hover:text-violet-400 flex items-center gap-1 transition-all">
                  <RefreshCw className={`w-3 h-3 ${loading.persons ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {loading.persons ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : persons.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Нет персон на устройстве</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {persons.map((p, i) => (
                    <div key={p.employee_no || i} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5 hover:border-violet-500/20 transition-all">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600/40 to-indigo-600/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-violet-300">
                          {(p.name || p.Name || '?')[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{p.name || p.Name || '—'}</p>
                        <p className="text-xs text-slate-500 font-mono">Таб: {p.employee_no || p.employeeNo || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${p.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {p.valid ? 'Активен' : 'Неакт.'}
                        </span>
                        {(p.raw?.numOfFP > 0 || p.raw?.numOfFace > 0 || p.raw?.numOfCard > 0) && (
                          <div className="flex gap-1 mt-1 justify-end">
                            {p.raw?.numOfCard > 0 && <CreditCard className="w-3 h-3 text-blue-400" />}
                            {p.raw?.numOfFP > 0 && <span className="text-xs text-amber-400">👆</span>}
                            {p.raw?.numOfFace > 0 && <span className="text-xs text-pink-400">👤</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CARDS TAB */}
          {tab === 'cards' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">Карты доступа на устройстве</p>
                <button onClick={loadCards} disabled={loading.cards}
                  className="text-xs text-slate-400 hover:text-violet-400 flex items-center gap-1 transition-all">
                  <RefreshCw className={`w-3 h-3 ${loading.cards ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {loading.cards ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : cards.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Нет карт на устройстве</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cards.map((c, i) => (
                    <div key={c.card_no || c.cardNo || i} className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/20 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/30 to-cyan-600/30 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-mono truncate">{c.card_no || c.cardNo || '—'}</p>
                        <p className="text-xs text-slate-500">Таб: <span className="font-mono">{c.employee_no || c.employeeNo || '—'}</span></p>
                      </div>
                      {c.card_type || c.cardType ? (
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400">
                          {c.card_type || c.cardType}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOORS TAB */}
          {tab === 'doors' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">Двери и шлюзы</p>
                <button onClick={loadDoors} disabled={loading.doors}
                  className="text-xs text-slate-400 hover:text-violet-400 flex items-center gap-1 transition-all">
                  <RefreshCw className={`w-3 h-3 ${loading.doors ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {loading.doors ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : doors.length === 0 ? (
                <div className="text-center py-8">
                  <DoorOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Нет данных о дверях</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {doors.map((d, i) => (
                    <div key={`${d.door_no}-${d.gateway_id}`} className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DoorOpen className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="text-sm font-medium text-white">Дверь {d.door_no}</p>
                            <p className="text-xs text-slate-500">{d.gateway_name || d.gateway_id}</p>
                          </div>
                        </div>
                        <StatusBadge status={d.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['open', 'close', 'always-open', 'always-close'].map(action => (
                          <button key={action}
                            onClick={() => doorAction(d.door_no, action)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                              action === 'open' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30' :
                              action === 'close' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' :
                              action === 'always-open' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30' :
                              'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 border border-slate-500/30'
                            }`}>
                            {action === 'open' ? '🔓 Открыть' :
                             action === 'close' ? '🔒 Закрыть' :
                             action === 'always-open' ? '♾️ Всегда открыто' : '⛔ Всегда закрыто'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const [tab, setTab] = useState('list');
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  // Discover
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState([]);
  const [registering, setRegistering] = useState({});
  const limit = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, offset: page * limit });
      if (search) params.set('search', search);
      const res = await apiFetch(`/ext/v1/devices?${params}`);
      setData(res?.data || []);
      setTotal(res?.pagination?.total || 0);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { if (tab === 'list') load(); }, [load, tab]);

  const discover = async () => {
    setDiscovering(true);
    setDiscovered([]);
    try {
      // Per docs: POST /ext/v1/devices/discover?gateway=gateway-a
      const res = await apiFetch('/ext/v1/devices/discover?gateway=gateway-a', { method: 'POST' });
      setDiscovered(res?.data || []);
      toast.success(`Найдено устройств: ${(res?.data || []).length}`);
    } catch (e) { toast.error(e.message); } finally { setDiscovering(false); }
  };

  const registerDevice = async (dev) => {
    const key = dev.dev_index || dev.index;
    setRegistering(r => ({ ...r, [key]: true }));
    try {
      await apiFetch('/ext/v1/devices/register', {
        method: 'POST',
        body: JSON.stringify({ dev_index: key, gateway_id: 'gateway-a' }),
      });
      toast.success(`Устройство зарегистрировано`);
      setDiscovered(prev => prev.map(d => d === dev ? { ...d, status: 'registered' } : d));
    } catch (e) { toast.error(e.message); } finally { setRegistering(r => ({ ...r, [key]: false })); }
  };

  const onlineCount = data.filter(d => (d.status || d.dev_status)?.toLowerCase() === 'online').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Monitor className="w-6 h-6 text-violet-400" />
            Устройства
          </h1>
          <p className="text-slate-400 text-sm mt-1">Зарегистрированные ACS устройства</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats pills */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {onlineCount} online
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
              {total} всего
            </span>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {[['list', '📋 Реестр'], ['discover', '🔍 Обнаружение']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Discover tab */}
      {tab === 'discover' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
            <Radar className="w-5 h-5 text-violet-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Обнаружение устройств</p>
              <p className="text-xs text-slate-500">Поиск устройств на gateway-a через ISAPI</p>
            </div>
            <button onClick={discover} disabled={discovering}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20">
              <Radar className={`w-4 h-4 ${discovering ? 'animate-pulse' : ''}`} />
              {discovering ? 'Поиск...' : 'Начать сканирование'}
            </button>
          </div>
          {discovered.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/10">
                  {['Устройство', 'Dev Index', 'Статус', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {discovered.map((d, i) => {
                    const key = d.dev_index || d.index;
                    const isNew = d.status === 'new';
                    return (
                      <tr key={key || i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-white">{d.name || d.serial || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">{key?.slice(0, 20) || '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-4 py-3">
                          {(isNew || d.status === 'new') && d.status !== 'registered' && (
                            <button onClick={() => registerDevice(d)} disabled={registering[key]}
                              className="flex items-center gap-1.5 text-xs text-violet-400 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 transition-all disabled:opacity-50">
                              <Plus className="w-3.5 h-3.5" />
                              {registering[key] ? 'Регистрация...' : 'Зарегистрировать'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* List tab */}
      {tab === 'list' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Поиск по имени, модели или серийному номеру..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm" />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16 bg-white/3 border border-white/10 rounded-2xl">
              <Monitor className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Устройств не найдено</p>
              <p className="text-slate-600 text-sm mt-1">Платформа не содержит зарегистрированных устройств</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {data.map((d) => (
                <div key={d.id}
                  onClick={() => setSelected(d)}
                  className="group bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 hover:border-violet-500/30 hover:bg-white/8 transition-all cursor-pointer flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0 group-hover:border-violet-500/40 transition-all">
                    <Monitor className="w-5 h-5 text-violet-400" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm truncate">{d.name || d.dev_name || 'Устройство'}</p>
                      <StatusBadge status={d.status || d.dev_status} />
                    </div>
                    <div className="flex items-center gap-4 mt-0.5">
                      <p className="text-xs text-slate-500 font-mono truncate">{d.serial_no || d.serial_number || 'N/A'}</p>
                      {d.model || d.dev_model ? (
                        <p className="text-xs text-slate-500">{d.model || d.dev_model}</p>
                      ) : null}
                      {d.ip_address ? (
                        <p className="text-xs text-slate-500 font-mono hidden sm:block">{d.ip_address}</p>
                      ) : null}
                    </div>
                  </div>
                  {/* Actions hint */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex gap-1">
                      <span className="px-1.5 py-0.5 rounded text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20">Персоны</span>
                      <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">Карты</span>
                      <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Двери</span>
                    </div>
                    <Settings className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-slate-500">Всего: {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 self-center">Стр. {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel (slide-in panel) */}
      {selected && (
        <DeviceDetailPanel
          device={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
