import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuditPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/ext/v1/audit/log?limit=30');
      setData(res?.data || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const methodColor = (m) => {
    if (m === 'GET') return 'bg-blue-500/20 text-blue-400';
    if (m === 'POST') return 'bg-green-500/20 text-green-400';
    if (m === 'PUT' || m === 'PATCH') return 'bg-yellow-500/20 text-yellow-400';
    if (m === 'DELETE') return 'bg-red-500/20 text-red-400';
    return 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Search className="w-6 h-6 text-violet-400" />Аудит</h1>
          <p className="text-slate-400 text-sm mt-1">Журнал внешних API запросов</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Обновить
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-white/10">
            {['Метод', 'Путь', 'Актор', 'Статус', 'Время'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center"><div className="flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate-500 text-sm">Нет записей. Нажмите «Обновить».</td></tr>
            ) : data.map((entry, i) => (
              <tr key={entry.id || i} className="border-b border-white/5 hover:bg-white/5 transition-all">
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${methodColor(entry.method)}`}>{entry.method || '—'}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-300 font-mono truncate max-w-xs">{entry.path || entry.action || '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{entry.actor_id || entry.actor || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${entry.status >= 200 && entry.status < 300 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {entry.status || entry.response_status || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{entry.created_at ? new Date(entry.created_at).toLocaleString('ru') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
