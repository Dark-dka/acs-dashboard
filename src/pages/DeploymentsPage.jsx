import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { Rocket, RefreshCw, ChevronLeft, ChevronRight, RotateCcw, Layers, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const ENTITY_TYPES = ['person', 'credential', 'access_policy'];

export default function DeploymentsPage() {
  const [tab, setTab] = useState('deploy');
  const [tasks, setTasks] = useState([]);
  const [recoResults, setRecoResults] = useState([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [recoLoading, setRecoLoading] = useState(false);
  const [deployForm, setDeployForm] = useState({ entity_type: 'person', entity_id: '', target_type: 'all' });
  const [undeployForm, setUndeployForm] = useState({ entity_type: 'person', entity_id: '', target_type: 'all' });
  const [recoDeviceId, setRecoDeviceId] = useState('');
  const [taskFilters, setTaskFilters] = useState({ status: '', entity_type: '' });
  // --- GET /deployments/states/{type}/{id} ---
  const [stateEntityType, setStateEntityType] = useState('person');
  const [stateEntityId, setStateEntityId] = useState('');
  const [stateResult, setStateResult] = useState(null);
  const [stateLoading, setStateLoading] = useState(false);
  // --- GET /deployments/device/{device_id} ---
  const [deviceEntitiesId, setDeviceEntitiesId] = useState('');
  const [deviceEntities, setDeviceEntities] = useState([]);
  const [deviceEntitiesLoading, setDeviceEntitiesLoading] = useState(false);
  const limit = 20;

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, offset: taskPage * limit });
      if (taskFilters.status) params.set('status', taskFilters.status);
      if (taskFilters.entity_type) params.set('entity_type', taskFilters.entity_type);
      const res = await apiFetch(`/ext/v1/deployments/tasks?${params}`);
      setTasks(res?.data || []);
      setTaskTotal(res?.pagination?.total || 0);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [taskPage, taskFilters]);

  const loadRecoResults = useCallback(async () => {
    setRecoLoading(true);
    try {
      const params = new URLSearchParams({ limit: 20 });
      if (recoDeviceId) params.set('device_id', recoDeviceId);
      const res = await apiFetch(`/ext/v1/reconciliation/results?${params}`);
      setRecoResults(res?.data || []);
    } catch (e) { toast.error(e.message); } finally { setRecoLoading(false); }
  }, [recoDeviceId]);

  useEffect(() => {
    if (tab === 'tasks') loadTasks();
    if (tab === 'reconciliation') loadRecoResults();
  }, [tab, loadTasks, loadRecoResults]);

  const handleDeploy = async () => {
    if (!deployForm.entity_id) { toast.error('Укажите ID сущности'); return; }
    try {
      await apiFetch('/ext/v1/deployments/deploy', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: deployForm.entity_type,
          entity_id: deployForm.entity_id,
          target: { type: deployForm.target_type },
        }),
      });
      toast.success('Деплой запущен');
      setTab('tasks');
    } catch (e) { toast.error(e.message); }
  };

  const handleUndeploy = async () => {
    if (!undeployForm.entity_id) { toast.error('Укажите ID сущности'); return; }
    try {
      await apiFetch('/ext/v1/deployments/undeploy', {
        method: 'POST',
        body: JSON.stringify({
          entity_type: undeployForm.entity_type,
          entity_id: undeployForm.entity_id,
          target: { type: undeployForm.target_type },
        }),
      });
      toast.success('Отзыв деплоя запущен');
      setTab('tasks');
    } catch (e) { toast.error(e.message); }
  };

  const runReconciliation = async () => {
    if (!recoDeviceId) { toast.error('Укажите ID устройства'); return; }
    try {
      await apiFetch('/ext/v1/reconciliation/run', {
        method: 'POST',
        body: JSON.stringify({ device_id: recoDeviceId }),
      });
      toast.success('Сверка запущена');
      setTimeout(loadRecoResults, 2000);
    } catch (e) { toast.error(e.message); }
  };

  const statusColor = (s) => ({
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    running: 'bg-blue-500/20 text-blue-400 animate-pulse',
  }[s] || 'bg-slate-500/20 text-slate-400');

  const FormSection = ({ title, form, setForm, onSubmit, submitLabel, submitColor = 'bg-violet-600 hover:bg-violet-500' }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold text-white text-sm">{title}</h3>
      <div>
        <label className="block text-xs text-slate-300 mb-1">Тип сущности</label>
        <select value={form.entity_type} onChange={e => setForm(f => ({ ...f, entity_type: e.target.value }))}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
          {ENTITY_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1d2e]">{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-300 mb-1">ID сущности</label>
        <input value={form.entity_id} onChange={e => setForm(f => ({ ...f, entity_id: e.target.value }))}
          placeholder="UUID или ID персоны..."
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-slate-500" />
      </div>
      <div>
        <label className="block text-xs text-slate-300 mb-1">Целевые устройства</label>
        <select value={form.target_type} onChange={e => setForm(f => ({ ...f, target_type: e.target.value }))}
          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
          <option value="all" className="bg-[#1a1d2e]">Все устройства</option>
          <option value="specific" className="bg-[#1a1d2e]">Конкретные устройства</option>
        </select>
      </div>
      <button onClick={onSubmit} className={`w-full py-2.5 rounded-xl text-white text-sm font-medium transition-all ${submitColor}`}>
        {submitLabel}
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Rocket className="w-6 h-6 text-violet-400" />Деплой</h1>
        <p className="text-slate-400 text-sm mt-1">Развёртывание и управление доступом на устройствах</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {[
          ['deploy', '🚀 Деплой'],
          ['undeploy', '📤 Отзыв'],
          ['tasks', '📋 Задачи'],
          ['states', '🔍 Статус'],
          ['device-entities', '📱 На устройстве'],
          ['reconciliation', '🔄 Сверка'],
        ].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Deploy tab */}
      {tab === 'deploy' && (
        <div className="max-w-md">
          <FormSection title="Развернуть сущность" form={deployForm} setForm={setDeployForm}
            onSubmit={handleDeploy} submitLabel="🚀 Запустить деплой" />
        </div>
      )}

      {/* Undeploy tab */}
      {tab === 'undeploy' && (
        <div className="max-w-md">
          <FormSection title="Отозвать сущность с устройств" form={undeployForm} setForm={setUndeployForm}
            onSubmit={handleUndeploy} submitLabel="📤 Отозвать доступ"
            submitColor="bg-red-600/80 hover:bg-red-500" />
        </div>
      )}

      {/* Tasks tab */}
      {tab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <select value={taskFilters.status} onChange={e => setTaskFilters(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
              {['', 'pending', 'running', 'completed', 'failed'].map(s => (
                <option key={s} value={s} className="bg-[#1a1d2e]">{s || 'Все статусы'}</option>
              ))}
            </select>
            <select value={taskFilters.entity_type} onChange={e => setTaskFilters(f => ({ ...f, entity_type: e.target.value }))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500">
              {['', ...ENTITY_TYPES].map(t => <option key={t} value={t} className="bg-[#1a1d2e]">{t || 'Все типы'}</option>)}
            </select>
            <button onClick={loadTasks} className="ml-auto p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-white/10">
                {['Тип', 'ID сущности', 'Устройство', 'Статус', 'Время'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 uppercase font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center"><div className="flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div></td></tr>
                ) : tasks.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500 text-sm">Задач не найдено</td></tr>
                ) : tasks.map((t, i) => (
                  <tr key={t.id || i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2.5 text-xs text-slate-300">{t.entity_type || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{(t.entity_id || '—').slice(0, 12)}...</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{t.device_id ? (t.device_id).slice(0, 10) + '...' : '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${statusColor(t.status)}`}>{t.status || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{t.created_at ? new Date(t.created_at).toLocaleString('ru') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <span className="text-xs text-slate-500">Всего: {taskTotal}</span>
              <div className="flex gap-2">
                <button onClick={() => setTaskPage(p => Math.max(0, p - 1))} disabled={taskPage === 0} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-slate-400 self-center">Стр. {taskPage + 1}</span>
                <button onClick={() => setTaskPage(p => p + 1)} disabled={(taskPage + 1) * limit >= taskTotal} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation tab */}
      {tab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="flex gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl items-end">
            <div className="flex-1">
              <label className="block text-xs text-slate-300 mb-1">ID устройства для сверки</label>
              <input value={recoDeviceId} onChange={e => setRecoDeviceId(e.target.value)}
                placeholder="UUID устройства..."
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-slate-500" />
            </div>
            <button onClick={runReconciliation}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all">
              <RotateCcw className="w-4 h-4" />Запустить сверку
            </button>
            <button onClick={loadRecoResults}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 ${recoLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-medium text-white flex items-center gap-2"><Layers className="w-4 h-4 text-violet-400" />Результаты сверки</h3>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-white/10">
                {['Устройство', 'Тип', 'Ожидалось', 'Найдено', 'Расхождение', 'Время'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 uppercase font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {recoLoading ? (
                  <tr><td colSpan={6} className="py-12 text-center"><div className="flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div></td></tr>
                ) : recoResults.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-500 text-sm">Резутататов сверки нет. Введите ID устройства и нажмите «Обновить».</td></tr>
                ) : recoResults.map((r, i) => (
                  <tr key={r.id || i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{(r.device_id || '—').slice(0, 12)}...</td>
                    <td className="px-4 py-2.5 text-xs text-slate-300">{r.entity_type || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-violet-400 font-mono">{r.expected ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-green-400 font-mono">{r.found ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {r.discrepancy ? (
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-red-500/20 text-red-400 font-medium">{r.discrepancy}</span>
                      ) : <span className="text-xs text-green-400">OK</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleString('ru') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deployment States tab — GET /ext/v1/deployments/states/{type}/{id} */}
      {tab === 'states' && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-white text-sm">Статус деплоя по сущности</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Тип сущности</label>
                <select value={stateEntityType} onChange={e => setStateEntityType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
                  {ENTITY_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1d2e]">{t}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-300 mb-1">ID сущности</label>
                <div className="flex gap-2">
                  <input value={stateEntityId} onChange={e => setStateEntityId(e.target.value)}
                    placeholder="UUID или ID..."
                    className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-slate-500" />
                  <button
                    onClick={async () => {
                      if (!stateEntityId) { toast.error('Укажите ID'); return; }
                      setStateLoading(true);
                      try {
                        const res = await apiFetch(`/ext/v1/deployments/states/${stateEntityType}/${stateEntityId}`);
                        setStateResult(res?.data || res);
                      } catch (e) { toast.error(e.message); } finally { setStateLoading(false); }
                    }}
                    disabled={stateLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50">
                    {stateLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                    Загрузить
                  </button>
                </div>
              </div>
            </div>
          </div>
          {stateResult && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h4 className="text-sm font-medium text-white mb-3">Результат — {stateEntityType} / {stateEntityId.slice(0, 16)}...</h4>
              {Array.isArray(stateResult) ? (
                <div className="space-y-2">
                  {stateResult.map((item, i) => (
                    <div key={i} className="grid grid-cols-4 gap-3 px-3 py-2.5 bg-white/5 rounded-xl text-xs">
                      <span className="text-slate-400 font-mono">{(item.device_id || '—').slice(0, 12)}...</span>
                      <span className="text-slate-300">{item.entity_type || '—'}</span>
                      <span className={`font-medium px-2 py-0.5 rounded-md w-fit ${
                        item.status === 'deployed' ? 'bg-green-500/20 text-green-400' :
                        item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-slate-500/20 text-slate-400'}`}>{item.status || '?'}</span>
                      <span className="text-slate-500">{item.updated_at ? new Date(item.updated_at).toLocaleString('ru') : '—'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(stateResult).map(([k, v]) => (
                    <div key={k} className="flex gap-3 px-3 py-2 bg-white/5 rounded-lg">
                      <span className="text-xs text-slate-400 font-mono w-36 flex-shrink-0">{k}</span>
                      <span className="text-xs text-white break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Device Entities tab — GET /ext/v1/deployments/device/{device_id} */}
      {tab === 'device-entities' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 max-w-sm">
              <label className="block text-xs text-slate-300 mb-1">ID устройства</label>
              <input value={deviceEntitiesId} onChange={e => setDeviceEntitiesId(e.target.value)}
                placeholder="UUID устройства..."
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder-slate-500" />
            </div>
            <button
              onClick={async () => {
                if (!deviceEntitiesId) { toast.error('Укажите ID устройства'); return; }
                setDeviceEntitiesLoading(true);
                try {
                  const res = await apiFetch(`/ext/v1/deployments/device/${deviceEntitiesId}`);
                  setDeviceEntities(res?.data || []);
                } catch (e) { toast.error(e.message); } finally { setDeviceEntitiesLoading(false); }
              }}
              disabled={deviceEntitiesLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50">
              {deviceEntitiesLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Загрузить
            </button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                Сущности на устройстве {deviceEntitiesId ? `(${deviceEntitiesId.slice(0, 12)}...)` : ''}
              </h3>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-white/10">
                {['Тип', 'ID сущности', 'Статус', 'Обновлён'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 uppercase font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {deviceEntitiesLoading ? (
                  <tr><td colSpan={4} className="py-12 text-center"><div className="flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div></td></tr>
                ) : deviceEntities.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-slate-500 text-sm">
                    Введите ID устройства и нажмите «Загрузить»
                  </td></tr>
                ) : deviceEntities.map((e, i) => (
                  <tr key={e.id || i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2.5 text-xs text-slate-300">{e.entity_type || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{(e.entity_id || '—').slice(0, 16)}...</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                        e.status === 'deployed' ? 'bg-green-500/20 text-green-400' :
                        e.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-slate-500/20 text-slate-400'}`}>{e.status || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{e.updated_at ? new Date(e.updated_at).toLocaleString('ru') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
