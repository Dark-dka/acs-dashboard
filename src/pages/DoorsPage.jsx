import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import {
  DoorOpen, RefreshCw, X, Zap, Info,
  CheckCircle, AlertCircle, WifiOff, Shield, Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_MAP = {
  available:    { label: 'Доступна',       cls: 'bg-green-500/20 text-green-400 border-green-500/30',   dot: 'bg-green-400' },
  open:         { label: 'Открыта',        cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',   dot: 'bg-amber-400' },
  closed:       { label: 'Закрыта',        cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30',   dot: 'bg-slate-400' },
  always_open:  { label: 'Всегда открыта', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  always_close: { label: 'Всегда закрыта', cls: 'bg-red-500/20 text-red-400 border-red-500/30',         dot: 'bg-red-400' },
  offline:      { label: 'Не в сети',      cls: 'bg-red-500/20 text-red-400 border-red-500/30',         dot: 'bg-red-400' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status?.toLowerCase()] || STATUS_MAP.available;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {s.label}
    </span>
  );
}

// ── Door Detail Modal ──────────────────────────────────────────────────────────
function DoorDetailModal({ door, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const doorNo   = door.door_no ?? 1;
  const deviceId = door.device_id;

  useEffect(() => {
    (async () => {
      try {
        // Per docs: GET /ext/v1/doors/{door_no}?device_id=<uuid>
        const res = await apiFetch(`/ext/v1/doors/${doorNo}?device_id=${deviceId}`);
        setDetail(res?.data || res);
      } catch (e) { toast.error(e.message); } finally { setLoading(false); }
    })();
  }, [doorNo, deviceId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#13151f] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border border-emerald-500/20 flex items-center justify-center">
              <DoorOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">
                {door.door_name || `Дверь №${doorNo}`}
              </h2>
              <p className="text-xs text-slate-500 font-mono">{door.device_name || deviceId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !detail ? (
          <p className="text-slate-500 text-sm text-center py-8">Нет данных</p>
        ) : (
          <div className="space-y-1.5">
            {Object.entries(detail).map(([k, v]) => (
              <div key={k} className="flex gap-3 px-3 py-2 bg-white/5 rounded-lg">
                <span className="text-xs text-slate-400 font-mono w-40 flex-shrink-0">{k}</span>
                <span className="text-xs text-white break-all">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
                </span>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm transition-all">
          Закрыть
        </button>
      </div>
    </div>
  );
}

// ── Capabilities Panel ────────────────────────────────────────────────────────
function CapabilitiesPanel() {
  const [caps, setCaps] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/ext/v1/doors/capabilities');
      setCaps(res?.data || res);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />Возможности устройств
        </h3>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 transition-all px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-400' : ''}`} />
          Обновить
        </button>
      </div>
      {!caps ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Array.isArray(caps?.gateways || caps?.devices || caps) ? (
        <div className="space-y-3">
          {(caps?.gateways || caps?.devices || (Array.isArray(caps) ? caps : [])).map((item, i) => (
            <div key={item.gateway_id || item.device_id || i} className="bg-white/5 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.gateway_name || item.device_name || item.gateway_id || item.device_id}</p>
                  <p className="text-xs text-slate-500 font-mono">{item.gateway_id || item.device_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.reachable !== undefined && (
                    item.reachable ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Доступен
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <WifiOff className="w-3 h-3" />
                        Недоступен
                      </span>
                    )
                  )}
                </div>
              </div>
              {item.actions?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.actions.map(a => (
                    <span key={a} className="px-2 py-0.5 rounded-lg text-xs bg-violet-500/20 text-violet-300 border border-violet-500/20">
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {Object.entries(caps).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
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

// ── Door Card ─────────────────────────────────────────────────────────────────
function DoorCard({ door, onAction, actioning, onDetail, lastResult }) {
  const doorNo     = door.door_no ?? 1;
  const deviceId   = door.device_id;
  const deviceName = door.device_name || '';
  const doorName   = door.door_name || deviceName || `Дверь ${doorNo}`;
  const status     = door.status?.toLowerCase() || 'available';
  const devStatus  = door.device_status?.toLowerCase() || 'unknown';
  const isOnline   = devStatus === 'online';

  const actions = [
    { id: 'open',         label: '🔓 Открыть',         cls: 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' },
    { id: 'close',        label: '🔒 Закрыть',         cls: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' },
    { id: 'always-open',  label: '♾️ Всегда открыто',  cls: 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' },
    { id: 'always-close', label: '⛔ Всегда закрыто', cls: 'bg-slate-500/10 border-slate-500/20 text-slate-400 hover:bg-slate-500/20' },
  ];

  const cardKey = `${doorNo}-${deviceId}`;
  const result = lastResult?.[cardKey];

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 hover:border-emerald-500/20 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:border-emerald-500/40 transition-all">
            <DoorOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{doorName}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Дверь №{doorNo} {door.device_model && `• ${door.device_model}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={status} />
          <button onClick={() => onDetail(door)} title="Детали двери"
            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Device info row */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-white/5 rounded-xl">
        <Monitor className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
        <span className="text-xs text-slate-400 truncate">{deviceName}</span>
        <span className={`ml-auto text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
          {isOnline ? '● online' : '○ offline'}
        </span>
      </div>

      {/* Action result */}
      {result && (
        <div className={`flex items-center gap-2 px-3 py-2 mb-3 rounded-xl text-xs font-medium ${
          result.ok
            ? 'bg-green-500/15 border border-green-500/30 text-green-400'
            : 'bg-red-500/15 border border-red-500/30 text-red-400'
        }`}>
          {result.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span>{result.ok ? '✅' : '❌'} «{result.action}» — {result.message}</span>
        </div>
      )}

      {/* Action buttons — only if device is online */}
      {!isOnline ? (
        <div className="flex items-center gap-2 px-3 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300">Устройство не в сети. Управление недоступно.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {actions.map(({ id, label, cls }) => (
            <button key={id}
              onClick={() => onAction(doorNo, id, deviceId)}
              disabled={actioning[`${doorNo}-${id}-${deviceId}`]}
              className={`py-2 px-1 rounded-xl border text-xs font-medium transition-all disabled:opacity-50 ${cls}`}>
              {actioning[`${doorNo}-${id}-${deviceId}`] ? (
                <span className="flex items-center justify-center gap-1">
                  <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ...
                </span>
              ) : label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DoorsPage() {
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState({});
  const [detailDoor, setDetailDoor] = useState(null);
  const [tab, setTab] = useState('doors');
  const [lastResult, setLastResult] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      // Per docs: GET /ext/v1/doors returns device-linked doors
      // Each door has: device_id, device_name, device_model, device_status, door_no, door_name, status
      const res = await apiFetch('/ext/v1/doors');
      const list = res?.data || [];
      setDoors(list);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Per docs: POST /ext/v1/doors/{door_no}/actions?device_id=<uuid>
  const doAction = async (doorNo, action, deviceId) => {
    const actionKey = `${doorNo}-${action}-${deviceId}`;
    const cardKey = `${doorNo}-${deviceId}`;
    setActioning(a => ({ ...a, [actionKey]: true }));
    try {
      await apiFetch(`/ext/v1/doors/${doorNo}/actions?device_id=${deviceId}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setLastResult(r => ({ ...r, [cardKey]: { ok: true, action, message: 'Выполнено' } }));
      toast.success(`${action} → Дверь ${doorNo} ✓`);
    } catch (e) {
      setLastResult(r => ({ ...r, [cardKey]: { ok: false, action, message: e.message } }));
      toast.error(e.message);
    } finally {
      setActioning(a => ({ ...a, [actionKey]: false }));
    }
  };

  // Group doors by device
  const byDevice = doors.reduce((acc, d) => {
    const devId = d.device_id || 'unknown';
    if (!acc[devId]) acc[devId] = { name: d.device_name || devId, status: d.device_status, doors: [] };
    acc[devId].doors.push(d);
    return acc;
  }, {});

  const onlineCount = doors.filter(d => d.device_status?.toLowerCase() === 'online').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-violet-400" />Двери
          </h1>
          <p className="text-slate-400 text-sm mt-1">Управление дверями устройств доступа</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <span className="text-green-400">{onlineCount}</span> / {doors.length} дверей
          </span>
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {[['doors', '🚪 Двери'], ['capabilities', '⚡ Возможности']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'capabilities' && <CapabilitiesPanel />}

      {tab === 'doors' && (
        loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : doors.length === 0 ? (
          <div className="text-center py-20 bg-white/3 border border-white/10 rounded-2xl">
            <DoorOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Двери не найдены</p>
            <p className="text-slate-600 text-sm mt-1">API вернул пустой список</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byDevice).map(([devId, { name, status, doors: devDoors }]) => (
              <div key={devId}>
                {/* Device section header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                    <Monitor className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-sm font-medium text-violet-300">{name}</span>
                  </div>
                  <span className={`text-xs ${status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                    {status === 'online' ? '● online' : '○ offline'}
                  </span>
                  <span className="text-xs text-slate-600">{devDoors.length} дв.</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {devDoors.map((door, idx) => (
                    <DoorCard
                      key={`${door.device_id}-${door.door_no}-${idx}`}
                      door={door}
                      actioning={actioning}
                      onAction={doAction}
                      onDetail={setDetailDoor}
                      lastResult={lastResult}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {detailDoor && (
        <DoorDetailModal door={detailDoor} onClose={() => setDetailDoor(null)} />
      )}
    </div>
  );
}
