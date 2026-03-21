import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { Activity, RefreshCw, ChevronLeft, ChevronRight, Wifi, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EVENT_TYPES = ['', 'ACCESS_GRANTED', 'ACCESS_DENIED', 'DOOR_OPENED', 'DOOR_CLOSED', 'DOOR_ALARM', 'DEVICE_ONLINE', 'DEVICE_OFFLINE'];
const EVENT_CATS = ['', 'ACCESS_CONTROL', 'DOOR_STATUS', 'DEVICE_STATUS'];

// GET /ext/v1/events/{event_id} — реальный API вызов детали события
function EventDetailModal({ event, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!event) return;
    // If event has an id, fetch full detail via GET /events/{id}
    if (event.id) {
      setLoading(true);
      apiFetch(`/ext/v1/events/${event.id}`)
        .then(res => setDetail(res?.data || res))
        .catch(() => setDetail(event)) // fallback to cached data
        .finally(() => setLoading(false));
    } else {
      setDetail(event);
    }
  }, [event]);

  if (!event) return null;
  const displayData = detail || event;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">Детали события</h2>
            {event.id && <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {event.id}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Загрузка деталей...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(displayData).map(([k, v]) => (
              <div key={k} className="flex gap-3 px-3 py-2 bg-white/5 rounded-lg">
                <span className="text-xs text-slate-400 font-mono w-36 flex-shrink-0">{k}</span>
                <span className="text-xs text-white break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm">Закрыть</button>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [tab, setTab] = useState('list');
  const [events, setEvents] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({ event_type: '', event_category: '', success: '', since: '', until: '' });
  const sseRef = useRef(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, offset: page * limit });
      if (filters.event_type) params.set('event_type', filters.event_type);
      if (filters.event_category) params.set('event_category', filters.event_category);
      if (filters.success !== '') params.set('success', filters.success);
      if (filters.since) params.set('since', filters.since);
      if (filters.until) params.set('until', filters.until);
      const res = await apiFetch(`/ext/v1/events?${params}`);
      setEvents(res?.data || []);
      setTotal(res?.pagination?.total || 0);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { if (tab === 'list') load(); }, [load, tab]);

  // SSE connection
  const startSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    // SSE through our backend proxy — /api/acs/v1/events/stream
    const url = `/api/acs/v1/events/stream${filters.event_category ? `?event_category=${filters.event_category}` : ''}`;
    const es = new EventSource(url);
    sseRef.current = es;
    es.onopen = () => setSseConnected(true);
    es.onerror = () => { setSseConnected(false); };
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.ok !== false) {
          const event = data.data || data;
          setLiveEvents(prev => [event, ...prev].slice(0, 100));
        }
      } catch {}
    };
  }, [filters.event_category]);

  const stopSSE = () => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    setSseConnected(false);
  };

  useEffect(() => {
    if (tab === 'live') startSSE();
    else stopSSE();
    return () => stopSSE();
  }, [tab]);

  const statusBadge = (e) => {
    const ok = e.success ?? e.is_success;
    if (ok === true) return 'bg-green-500/20 text-green-400';
    if (ok === false) return 'bg-red-500/20 text-red-400';
    return 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Activity className="w-6 h-6 text-violet-400" />События</h1>
          <p className="text-slate-400 text-sm mt-1">Журнал событий системы контроля доступа</p>
        </div>
        {tab === 'list' && (
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {[['list', '📋 Журнал'], ['live', '🔴 Live Stream']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters (list tab) */}
      {tab === 'list' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <select value={filters.event_type} onChange={e => setFilters(f => ({ ...f, event_type: e.target.value }))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
            {EVENT_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1d2e]">{t || 'Все типы'}</option>)}
          </select>
          <select value={filters.event_category} onChange={e => setFilters(f => ({ ...f, event_category: e.target.value }))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
            {EVENT_CATS.map(c => <option key={c} value={c} className="bg-[#1a1d2e]">{c || 'Все категории'}</option>)}
          </select>
          <select value={filters.success} onChange={e => setFilters(f => ({ ...f, success: e.target.value }))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
            <option value="" className="bg-[#1a1d2e]">Все статусы</option>
            <option value="true" className="bg-[#1a1d2e]">✅ Успешные</option>
            <option value="false" className="bg-[#1a1d2e]">❌ Ошибки</option>
          </select>
          <input type="datetime-local" value={filters.since} onChange={e => setFilters(f => ({ ...f, since: e.target.value }))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500" placeholder="С" />
          <input type="datetime-local" value={filters.until} onChange={e => setFilters(f => ({ ...f, until: e.target.value }))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500" placeholder="По" />
        </div>
      )}

      {/* Live SSE panel */}
      {tab === 'live' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${sseConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-sm text-slate-300">{sseConnected ? 'Подключено к SSE потоку' : 'Отключено'}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setLiveEvents([])} className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">Очистить</button>
              <button onClick={sseConnected ? stopSSE : startSSE} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${sseConnected ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>
                {sseConnected ? 'Остановить' : 'Запустить'}
              </button>
            </div>
          </div>
          <div className="bg-[#0d0f18] border border-white/10 rounded-2xl p-3 h-[420px] overflow-y-auto font-mono text-xs space-y-1 scrollbar-thin">
            {liveEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                <Wifi className="w-8 h-8" />
                <p>Ожидание событий...</p>
              </div>
            ) : liveEvents.map((e, i) => (
              <div key={i} onClick={() => setSelectedEvent(e)} className="flex gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all border-l-2 border-violet-500/40">
                <span className="text-slate-600 w-20 flex-shrink-0">{new Date(e.timestamp || e.created_at || Date.now()).toLocaleTimeString('ru')}</span>
                <span className={`px-1.5 rounded text-[10px] font-bold flex-shrink-0 ${statusBadge(e)}`}>{e.success !== undefined ? (e.success ? 'OK' : 'ERR') : '?'}</span>
                <span className="text-violet-400 flex-shrink-0">{e.event_type || e.type || '?'}</span>
                <span className="text-slate-400 truncate">{e.employee_no ? `#${e.employee_no}` : ''} {e.device_id || e.door_no || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events table (list tab) */}
      {tab === 'list' && (
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-white/10">
              {['Тип', 'Категория', 'Таб. №', 'Устройство', 'Статус', 'Время'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><div className="flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div></td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-500 text-sm">Событий не найдено</td></tr>
              ) : events.map((e, i) => (
                <tr key={e.id || i} onClick={() => setSelectedEvent(e)} className="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer">
                  <td className="px-4 py-2.5"><span className="text-xs font-mono text-violet-300">{e.event_type || e.type || '—'}</span></td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{e.event_category || e.category || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-300 font-mono">{e.employee_no || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 truncate max-w-[120px]">{e.device_id || e.device_name || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${statusBadge(e)}`}>
                      {e.success === true ? '✅ OK' : e.success === false ? '❌ Fail' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{e.timestamp || e.created_at ? new Date(e.timestamp || e.created_at).toLocaleString('ru') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-xs text-slate-500">Всего: {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-slate-400 self-center">Стр. {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
