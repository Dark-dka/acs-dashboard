import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { Calendar, RefreshCw, ChevronRight, X, Save, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const GW = 'gateway-a';

const TABS = [
  { id: 'week-plans', label: '📅 Недельные планы' },
  { id: 'plan-templates', label: '📋 Шаблоны' },
  { id: 'holiday-plans', label: '🎉 Праздничные планы' },
  { id: 'holiday-groups', label: '📂 Праздничные группы' },
  { id: 'assignments', label: '👥 Назначения' },
];

function JsonEditor({ value, onChange }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [err, setErr] = useState('');
  const apply = () => {
    try { onChange(JSON.parse(text)); setErr(''); } catch { setErr('Неверный JSON'); }
  };
  return (
    <div className="space-y-2">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={10}
        className="w-full px-3 py-2 bg-[#0d0f18] border border-white/10 rounded-xl text-green-400 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y" />
      {err && <p className="text-xs text-red-400">{err}</p>}
      <button onClick={apply} className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-all">Применить JSON</button>
    </div>
  );
}

export default function PoliciesPage() {
  const [tab, setTab] = useState('week-plans');
  const [weekPlans, setWeekPlans] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignTotal, setAssignTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  // Detail/Edit modal
  const [detailModal, setDetailModal] = useState(null); // { type, no, data }
  const [detailLoading, setDetailLoading] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  // Holiday
  const [holidayPlanNo, setHolidayPlanNo] = useState(1);
  const [holidayGroupNo, setHolidayGroupNo] = useState(1);
  const [holidayPlan, setHolidayPlan] = useState(null);
  const [holidayGroup, setHolidayGroup] = useState(null);
  const [editHolidayPlan, setEditHolidayPlan] = useState(null);
  const [editHolidayGroup, setEditHolidayGroup] = useState(null);
  const [assignPersonId, setAssignPersonId] = useState('');

  const loadWeekPlans = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/ext/v1/access-policies/week-plans');
      setWeekPlans(res?.data || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/ext/v1/access-policies/plan-templates');
      setTemplates(res?.data || []);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 20 });
      if (assignPersonId) params.set('person_id', assignPersonId);
      const res = await apiFetch(`/ext/v1/access-policies/assignments?${params}`);
      setAssignments(res?.data || []);
      setAssignTotal(res?.pagination?.total || 0);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const loadHolidayPlan = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/ext/v1/access-policies/holiday-plans/${holidayPlanNo}?gateway=${GW}`);
      const d = res?.data || res;
      setHolidayPlan(d);
      setEditHolidayPlan(d);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const loadHolidayGroup = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/ext/v1/access-policies/holiday-groups/${holidayGroupNo}?gateway=${GW}`);
      const d = res?.data || res;
      setHolidayGroup(d);
      setEditHolidayGroup(d);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const saveHolidayPlan = async () => {
    setSaving(true);
    try {
      await apiFetch(`/ext/v1/access-policies/holiday-plans/${holidayPlanNo}?gateway=${GW}`, {
        method: 'PUT', body: JSON.stringify(editHolidayPlan),
      });
      toast.success('Праздничный план сохранён');
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const saveHolidayGroup = async () => {
    setSaving(true);
    try {
      await apiFetch(`/ext/v1/access-policies/holiday-groups/${holidayGroupNo}?gateway=${GW}`, {
        method: 'PUT', body: JSON.stringify(editHolidayGroup),
      });
      toast.success('Праздничная группа сохранена');
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  useEffect(() => {
    if (tab === 'week-plans') loadWeekPlans();
    else if (tab === 'plan-templates') loadTemplates();
    else if (tab === 'assignments') loadAssignments();
  }, [tab]);

  // Open detail for week-plan or template
  const openDetail = async (type, no) => {
    setDetailModal({ type, no, data: null });
    setDetailLoading(true);
    try {
      const path = type === 'week-plans'
        ? `/ext/v1/access-policies/week-plans/${no}?gateway=${GW}`
        : `/ext/v1/access-policies/plan-templates/${no}?gateway=${GW}`;
      const res = await apiFetch(path);
      const d = res?.data || res;
      setDetailModal({ type, no, data: d });
      setEditData(d);
    } catch (e) { toast.error(e.message); setDetailModal(null); } finally { setDetailLoading(false); }
  };

  const saveDetail = async () => {
    if (!detailModal) return;
    setSaving(true);
    try {
      const path = detailModal.type === 'week-plans'
        ? `/ext/v1/access-policies/week-plans/${detailModal.no}?gateway=${GW}`
        : `/ext/v1/access-policies/plan-templates/${detailModal.no}?gateway=${GW}`;
      await apiFetch(path, { method: 'PUT', body: JSON.stringify(editData) });
      toast.success('Сохранено');
      setDetailModal(null);
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Calendar className="w-6 h-6 text-violet-400" />Политики доступа</h1>
        <p className="text-slate-400 text-sm mt-1">Управление расписаниями и правилами доступа</p>
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

      {/* Week Plans */}
      {tab === 'week-plans' && (
        <div className="space-y-3">
          <button onClick={loadWeekPlans} className="flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-400' : ''}`} />Обновить
          </button>
          {weekPlans.length === 0 && !loading ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-slate-500 text-sm">Недельных планов не найдено</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {weekPlans.map((p, i) => (
                <div key={p.id || i} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all cursor-pointer group"
                  onClick={() => openDetail('week-plans', p.plan_no || p.id || i + 1)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">#{p.plan_no || p.id || i + 1} — {p.name || p.plan_name || 'Недельный план'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.description || `Расписание #${i + 1}`}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Quick open by number */}
          <div className="flex gap-3 items-center pt-2">
            <p className="text-xs text-slate-500">Открыть план по номеру:</p>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => openDetail('week-plans', n)}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-violet-500/20 hover:text-violet-400 hover:border-violet-500/30 text-xs transition-all">
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plan Templates */}
      {tab === 'plan-templates' && (
        <div className="space-y-3">
          <button onClick={loadTemplates} className="flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-400' : ''}`} />Обновить
          </button>
          {templates.length === 0 && !loading ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-slate-500 text-sm">Шаблонов не найдено</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t, i) => (
                <div key={t.id || i} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all cursor-pointer group"
                  onClick={() => openDetail('plan-templates', t.template_no || t.id || i + 1)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">#{t.template_no || t.id || i + 1} — {t.name || t.template_name || 'Шаблон'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.description || `Template #${i + 1}`}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 items-center pt-2">
            <p className="text-xs text-slate-500">Открыть шаблон по номеру:</p>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => openDetail('plan-templates', n)}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-violet-500/20 hover:text-violet-400 hover:border-violet-500/30 text-xs transition-all">
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Holiday Plans */}
      {tab === 'holiday-plans' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Номер плана (1-32)</label>
              <input type="number" min={1} max={32} value={holidayPlanNo} onChange={e => setHolidayPlanNo(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
            </div>
            <button onClick={loadHolidayPlan} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Загрузить
            </button>
          </div>
          {holidayPlan && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Праздничный план #{holidayPlanNo}</h3>
              <JsonEditor value={editHolidayPlan} onChange={setEditHolidayPlan} />
              <button onClick={saveHolidayPlan} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Сохранение...' : 'Сохранить на устройство'}
              </button>
            </div>
          )}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-slate-500">Пример структуры праздничного плана:</p>
            <pre className="text-xs text-slate-400 font-mono mt-2">{`{
  "UserRightHolidayPlanCfg": {
    "enable": true,
    "beginDate": "2026-03-08",
    "endDate": "2026-03-08",
    "HolidayPlanCfg": [{
      "id": 1, "enable": true,
      "TimeSegment": {
        "beginTime": "00:00:00",
        "endTime": "23:59:59"
      }
    }]
  }
}`}</pre>
          </div>
        </div>
      )}

      {/* Holiday Groups */}
      {tab === 'holiday-groups' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Номер группы (1-16)</label>
              <input type="number" min={1} max={16} value={holidayGroupNo} onChange={e => setHolidayGroupNo(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
            </div>
            <button onClick={loadHolidayGroup} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm transition-all">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Загрузить
            </button>
          </div>
          {holidayGroup && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Праздничная группа #{holidayGroupNo}</h3>
              <JsonEditor value={editHolidayGroup} onChange={setEditHolidayGroup} />
              <button onClick={saveHolidayGroup} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Сохранение...' : 'Сохранить на устройство'}
              </button>
            </div>
          )}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-slate-500">Пример структуры праздничной группы:</p>
            <pre className="text-xs text-slate-400 font-mono mt-2">{`{
  "UserRightHolidayGroupCfg": {
    "enable": true,
    "groupName": "National Holidays 2026",
    "holidayPlanNo": "1,2,3"
  }
}`}</pre>
          </div>
        </div>
      )}

      {/* Assignments */}
      {tab === 'assignments' && (
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <input value={assignPersonId} onChange={e => setAssignPersonId(e.target.value)}
              placeholder="Фильтр по person_id..."
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500 w-64" />
            <button onClick={loadAssignments} className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-white/10">
                {['Person ID', 'Тип политики', 'Номер политики', 'Устройство', 'Создан'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 uppercase font-semibold">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center"><div className="flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div></td></tr>
                ) : assignments.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Users className="w-8 h-8 opacity-40" />
                      <p className="text-sm">Назначений нет. Нажмите «Обновить» для загрузки.</p>
                    </div>
                  </td></tr>
                ) : assignments.map((a, i) => (
                  <tr key={a.id || i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2.5 text-xs font-mono text-violet-300">{(a.person_id || '—').slice(0, 12)}...</td>
                    <td className="px-4 py-2.5 text-xs text-slate-300">{a.policy_type || a.type || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-300 font-mono">{a.policy_no ?? a.plan_no ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{a.device_id ? (a.device_id).slice(0, 10) + '...' : 'Все'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{a.created_at ? new Date(a.created_at).toLocaleString('ru') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-white/10">
              <span className="text-xs text-slate-500">Всего: {assignTotal}</span>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Edit Modal for week-plans & templates */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">
                {detailModal.type === 'week-plans' ? `Недельный план #${detailModal.no}` : `Шаблон #${detailModal.no}`}
              </h2>
              <button onClick={() => setDetailModal(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            {detailLoading ? (
              <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-4">
                <JsonEditor value={editData} onChange={setEditData} />
                <div className="flex gap-3">
                  <button onClick={() => setDetailModal(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm">Отмена</button>
                  <button onClick={saveDetail} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50">
                    <Save className="w-4 h-4" />{saving ? 'Сохранение...' : 'Записать на устройство'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
