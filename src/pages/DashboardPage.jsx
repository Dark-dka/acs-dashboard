import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { Activity, Monitor, Users, DoorOpen, ScrollText, CheckCircle, XCircle, TrendingUp, Zap } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{(value != null && !Number.isNaN(value)) ? value : '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [devices, setDevices] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [h, s, d, e] = await Promise.allSettled([
          apiFetch('/ext/v1/health'),
          apiFetch('/ext/v1/events/summary'),
          apiFetch('/ext/v1/devices?limit=5'),
          apiFetch('/ext/v1/events?limit=8'),
        ]);
        if (h.status === 'fulfilled') setHealth(h.value?.data || h.value);
        if (s.status === 'fulfilled') setSummary(s.value?.data || s.value);
        if (d.status === 'fulfilled') setDevices(d.value);
        if (e.status === 'fulfilled') setEvents(e.value?.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'ok' || health?.ok;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Дашборд</h1>
        <p className="text-slate-400 text-sm mt-1">Обзор системы контроля доступа</p>
      </div>

      {/* Health */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isHealthy ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        {isHealthy
          ? <CheckCircle className="w-5 h-5 text-green-400" />
          : <XCircle className="w-5 h-5 text-red-400" />}
        <span className={`text-sm font-medium ${isHealthy ? 'text-green-400' : 'text-red-400'}`}>
          {loading ? 'Проверка состояния системы...' : isHealthy ? 'Все сервисы работают нормально' : 'Обнаружены проблемы'}
        </span>
        <span className="ml-auto text-xs text-slate-500">Обновление каждые 30с</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Monitor} label="Устройства" value={devices?.pagination?.total ?? devices?.data?.length ?? '—'} color="bg-violet-600" sub="ACS устройств" />
        <StatCard icon={Users} label="Всего событий" value={summary?.total} color="bg-indigo-600" sub="за всё время" />
        <StatCard icon={CheckCircle} label="Успешных" value={summary?.success} color="bg-green-600" sub="доступ разрешён" />
        <StatCard icon={XCircle} label="Отказов" value={summary?.failed ?? (Number.isFinite(summary?.total) && Number.isFinite(summary?.success) ? summary.total - summary.success : null)} color="bg-red-600" sub="доступ запрещён" />
      </div>

      {/* Recent Events */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Последние события</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Событий нет</p>
        ) : (
          <div className="space-y-2">
            {events.map((ev, i) => (
              <div key={ev.id || i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-sm text-slate-300 flex-1 truncate">{ev.event_type || ev.type || 'EVENT'}</span>
                <span className="text-xs text-slate-500 flex-shrink-0">{ev.created_at ? new Date(ev.created_at).toLocaleTimeString('ru') : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
