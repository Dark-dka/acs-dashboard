import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { Monitor, Search, RefreshCw, ChevronLeft, ChevronRight, Info, Radar, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DevicesPage() {
  const [tab, setTab] = useState('list');
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
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

  const loadDetail = async (d) => {
    setSelected(d);
    setDetail(null);
    try {
      const res = await apiFetch(`/ext/v1/devices/${d.id}`);
      setDetail(res?.data || res);
    } catch (e) { toast.error(e.message); }
  };

  const discover = async () => {
    setDiscovering(true);
    setDiscovered([]);
    try {
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
      toast.success(`Устройство ${dev.name || key} зарегистрировано`);
      setDiscovered(prev => prev.map(d => d === dev ? { ...d, status: 'registered' } : d));
    } catch (e) { toast.error(e.message); } finally { setRegistering(r => ({ ...r, [key]: false })); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Monitor className="w-6 h-6 text-violet-400" />Устройства</h1>
          <p className="text-slate-400 text-sm mt-1">Зарегистрированные ACS устройства</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {[['list', '📋 Реестр'], ['discover', '🔍 Обнаружение']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
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
              <p className="text-sm font-medium text-white">Обнаружение устройств на gateway-a</p>
              <p className="text-xs text-slate-500">Поиск привязанных устройств и сравнение с базой данных платформы</p>
            </div>
            <button onClick={discover} disabled={discovering}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50">
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
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">{key || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                            (d.status === 'registered' || !isNew) ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {d.status === 'registered' ? '✓ Зарегистрировано' : isNew ? '🆕 Новое' : d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {(isNew || d.status === 'new') && d.status !== 'registered' && (
                            <button onClick={() => registerDevice(d)} disabled={registering[key]}
                              className="flex items-center gap-1.5 text-xs text-violet-400 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 transition-all disabled:opacity-50">
                              <Plus className="w-3.5 h-3.5" />{registering[key] ? 'Регистрация...' : 'Зарегистрировать'}
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
        <div className="flex gap-4">
          <div className="flex-1 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Поиск по имени или серийному номеру..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm" />
            </div>
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/10">
                  {['ID', 'Имя', 'Модель', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="py-12 text-center"><div className="flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div></td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={4} className="py-12 text-center text-slate-500 text-sm">Устройств не найдено</td></tr>
                  ) : data.map((d) => (
                    <tr key={d.id} className={`border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer ${selected?.id === d.id ? 'bg-violet-500/10' : ''}`}
                      onClick={() => loadDetail(d)}>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">{d.id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{d.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{d.model || d.serial || '—'}</td>
                      <td className="px-4 py-3"><Info className="w-4 h-4 text-slate-500 hover:text-violet-400" /></td>
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
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-80 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 space-y-3 h-fit">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{selected.name || 'Устройство'}</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-200 text-lg">×</button>
              </div>
              {!detail ? (
                <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto scrollbar-thin">
                  {Object.entries(detail).map(([k, v]) => (
                    <div key={k} className="flex gap-2 px-2 py-1.5 bg-white/5 rounded-lg">
                      <span className="text-xs text-slate-500 w-24 flex-shrink-0 font-mono">{k}</span>
                      <span className="text-xs text-white break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
