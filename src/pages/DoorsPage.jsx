import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { DoorOpen, RefreshCw, Unlock, Lock, X, Zap, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Door Detail Modal ──────────────────────────────────────────────────────────
function DoorDetailModal({ door, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const no = door.door_no ?? door.no ?? door.id;
  const gateway = door.gateway || 'gateway-a';

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/ext/v1/doors/${no}?gateway=${gateway}`);
        setDetail(res?.data || res);
      } catch (e) { toast.error(e.message); } finally { setLoading(false); }
    })();
  }, [no, gateway]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Дверь №{no} — {door.name || 'Детали'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : !detail ? (
          <p className="text-slate-500 text-sm text-center py-8">Нет данных</p>
        ) : (
          <div className="space-y-1.5">
            {Object.entries(detail).map(([k, v]) => (
              <div key={k} className="flex gap-3 px-3 py-2 bg-white/5 rounded-lg">
                <span className="text-xs text-slate-400 font-mono w-40 flex-shrink-0">{k}</span>
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

// ── Capabilities Panel ────────────────────────────────────────────────────────
function CapabilitiesPanel({ gateway }) {
  const [caps, setCaps] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/ext/v1/doors/capabilities`);
      setCaps(res?.data || res);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />Возможности gateway
        </h3>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 transition-all px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-400' : ''}`} />Загрузить
        </button>
      </div>
        {!caps ? (
          <p className="text-slate-600 text-sm text-center py-4">Нажмите «Загрузить» для проверки возможностей</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {/* Normalize to [{k, v}] regardless of API response shape */}
            {(Array.isArray(caps)
              ? caps.map((item, i) => Array.isArray(item) ? { k: String(item[0]), v: item[1] } : { k: String(i), v: item })
              : Object.entries(caps).map(([k, v]) => ({ k, v }))
            ).map(({ k, v }, i) => (
              <div key={`${k}-${i}`} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
                <span className="text-xs text-slate-400">{k}</span>
                <span className="text-xs text-white font-mono">
                  {(typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')).slice(0, 60)}
                </span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

export default function DoorsPage() {
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState({});
  const [detailDoor, setDetailDoor] = useState(null); // door object for modal
  const [tab, setTab] = useState('doors');

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/ext/v1/doors');
      setDoors(res?.data || res?.items || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const doAction = async (doorNo, action, gateway = 'gateway-a') => {
    const key = `${doorNo}-${action}`;
    setActioning(a => ({ ...a, [key]: true }));
    try {
      await apiFetch(`/ext/v1/doors/${doorNo}/actions?gateway=${gateway}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      toast.success(`Дверь ${doorNo}: команда "${action}" отправлена`);
    } catch (e) { toast.error(e.message); } finally {
      setActioning(a => ({ ...a, [key]: false }));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><DoorOpen className="w-6 h-6 text-violet-400" />Двери</h1>
          <p className="text-slate-400 text-sm mt-1">Управление дверями и замками</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Обновить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {[['doors', '🚪 Двери'], ['capabilities', '⚡ Возможности']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'capabilities' && <CapabilitiesPanel />}

      {tab === 'doors' && (
        loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : doors.length === 0 ? (
          <div className="text-center py-20">
            <DoorOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">Двери не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {doors.map((door, idx) => {
              // Use index suffix to prevent duplicate key crashes when API returns same door_no
              const no = door.door_no ?? door.no ?? door.id;
              const noStr = no != null && !Number.isNaN(Number(no)) ? no : idx;
              const gateway = door.gateway || 'gateway-a';
              const isOpen = door.status === 'open';
              return (
                <div key={`door-${noStr}-${idx}`} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-white font-semibold">{door.name || `Дверь ${noStr}`}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{gateway} • №{noStr}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        {isOpen ? 'Открыта' : 'Закрыта'}
                      </span>
                      <button onClick={() => setDetailDoor(door)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                        title="Детали двери">
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {door.magnetic_type && <p className="text-xs text-slate-500 mb-4">Тип: {door.magnetic_type}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => doAction(no, 'open', gateway)}
                      disabled={actioning[`${no}-open`]}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all text-xs font-medium disabled:opacity-50">
                      <Unlock className="w-3.5 h-3.5" />Открыть
                    </button>
                    <button
                      onClick={() => doAction(no, 'close', gateway)}
                      disabled={actioning[`${no}-close`]}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium disabled:opacity-50">
                      <Lock className="w-3.5 h-3.5" />Закрыть
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Door Detail Modal — GET /ext/v1/doors/{door_no} */}
      {detailDoor && <DoorDetailModal door={detailDoor} onClose={() => setDetailDoor(null)} />}
    </div>
  );
}
