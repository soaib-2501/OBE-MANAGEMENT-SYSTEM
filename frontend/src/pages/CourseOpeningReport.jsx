import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import CourseSubnav from '../components/CourseSubnav';
import A4Document from '../components/A4Document';
import { coordinatorName, coursesListLabel, coursesListPath } from '../utils/offering';

const LEVELS = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
const LEVEL_LABELS = {
  REMEMBER: 'Remember Level (Level 1)',
  UNDERSTAND: 'Understand Level (Level 2)',
  APPLY: 'Apply Level (Level 3)',
  ANALYZE: 'Analyze Level (Level 4)',
  EVALUATE: 'Evaluate Level (Level 5)',
  CREATE: 'Create Level (Level 6)',
};

function poPsoKeys(poCount, psoCount) {
  const keys = [];
  for (let i = 1; i <= (Number(poCount) || 0); i += 1) keys.push(`PO${i}`);
  for (let i = 1; i <= (Number(psoCount) || 0); i += 1) keys.push(`PSO${i}`);
  return keys;
}

function mappingLevel(co, poKey) {
  const row = (co.mappings || []).find((m) => m.po_key === poKey);
  return row?.level;
}

function mappingAvg(outcomes, poKey) {
  let sum = 0;
  let count = 0;
  outcomes.forEach((co) => {
    const level = mappingLevel(co, poKey);
    if (level !== null && level !== undefined && level !== '') {
      sum += Number(level);
      count += 1;
    }
  });
  return count ? Math.round((sum / count) * 100) / 100 : '—';
}

function strengthensFromMapping(co, poKeys) {
  const keys = poKeys.filter((key) => {
    const level = mappingLevel(co, key);
    return level !== null && level !== undefined && level !== '';
  });
  return keys.length ? keys.join(', ') : '—';
}

function previousYearLabel(academicYear) {
  const text = String(academicYear || '').trim();
  const range = text.match(/^(\d{4})\s*[-/]\s*(\d{2,4})/);
  if (range) {
    const start = Number(range[1]);
    return `${start - 1}-${start}`;
  }
  const year = text.match(/(\d{4})/);
  if (year) {
    const start = Number(year[1]);
    return `${start - 1}-${start}`;
  }
  return '';
}

function toStrategyRows(items) {
  if (!Array.isArray(items) || !items.length) return [{ action: '', assignment: '' }];
  if (Object.prototype.hasOwnProperty.call(items[0] || {}, 'action')) {
    return items.map((row) => ({ action: row.action || '', assignment: row.assignment || '' }));
  }
  const mapped = items
    .filter((row) => row.checked !== false)
    .map((row) => ({ action: row.label || '', assignment: row.assignment || '' }));
  return mapped.length ? mapped : [{ action: '', assignment: '' }];
}

function emptyGap() {
  return { topic: '', co: '', popso: '', method: '' };
}

function emptyMod() {
  return { detail: '', justification: '', popso: '' };
}

function prevYearsFor(report, coCode) {
  return report?.co_prev_years?.[coCode] || { y1: '', y2: '', y3: '' };
}

export default function CourseOpeningReport() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [report, setReport] = useState(null);
  const [header, setHeader] = useState({
    institute: '',
    logo_fallback: 'JIIT',
    department: '',
    academic_year: '',
    semester: 'ODD',
    program_name: '',
    nba_code: '',
    course_name: '',
    course_code: '',
    coordinator_names: '',
    po_count: 3,
    pso_count: 2,
  });
  const [outcomes, setOutcomes] = useState([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api.get(`/opening-reports/${id}/`);
    const c = res.data.course;
    setCourse(c);
    setReport(res.data.report);
    setHeader({
      institute: c.institute || '',
      logo_fallback: c.logo_fallback || 'JIIT',
      department: c.department || '',
      academic_year: c.academic_year || '',
      semester: c.semester || 'ODD',
      program_name: c.program_name || '',
      nba_code: c.nba_code || '',
      course_name: c.course_name || '',
      course_code: c.course_code || '',
      coordinator_names: c.coordinator_names || c.course_coordinator_name || c.faculty_name || '',
      po_count: c.po_count ?? 3,
      pso_count: c.pso_count ?? 2,
    });
    setOutcomes([...(c.outcomes || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load opening report.'));
  }, [id]);

  const poKeys = useMemo(
    () => poPsoKeys(header.po_count, header.pso_count),
    [header.po_count, header.pso_count],
  );
  const semesterWord = header.semester === 'EVEN' ? 'Even' : 'Odd';

  function patchReport(partial) {
    setReport((prev) => ({ ...prev, ...partial }));
  }

  function setHeaderField(key, value) {
    setHeader((prev) => ({ ...prev, [key]: value }));
  }

  function updateOutcome(index, patch) {
    setOutcomes((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function setMapping(index, poKey, value) {
    setOutcomes((prev) => prev.map((o, i) => {
      if (i !== index) return o;
      const mappings = [...(o.mappings || [])];
      const found = mappings.findIndex((m) => m.po_key === poKey);
      const level = value === '' ? null : Number(value);
      if (found >= 0) mappings[found] = { ...mappings[found], level };
      else mappings.push({ po_key: poKey, level });
      return { ...o, mappings };
    }));
  }

  function nextCoCode() {
    const prefix = header.nba_code || 'CO';
    return `${prefix}.${outcomes.length + 1}`;
  }

  function addCO() {
    const code = nextCoCode();
    setOutcomes((prev) => [
      ...prev,
      { co_code: code, description: '', cognitive_level: 'UNDERSTAND', mappings: [], order: prev.length },
    ]);
    patchReport({
      co_actions: { ...(report.co_actions || {}), [code]: '' },
      co_prev_years: { ...(report.co_prev_years || {}), [code]: { y1: '', y2: '', y3: '' } },
    });
  }

  function removeCO(index) {
    if (outcomes.length <= 1) return;
    const removed = outcomes[index];
    setOutcomes((prev) => prev.filter((_, i) => i !== index));
    if (removed?.co_code) {
      const actions = { ...(report.co_actions || {}) };
      const years = { ...(report.co_prev_years || {}) };
      delete actions[removed.co_code];
      delete years[removed.co_code];
      patchReport({ co_actions: actions, co_prev_years: years });
    }
  }

  function setPrevYear(coCode, key, value) {
    const current = prevYearsFor(report, coCode);
    patchReport({
      co_prev_years: {
        ...(report.co_prev_years || {}),
        [coCode]: { ...current, [key]: value },
      },
    });
  }

  function setAction(coCode, value) {
    patchReport({ co_actions: { ...(report.co_actions || {}), [coCode]: value } });
  }

  function updateStrategy(field, index, key, value) {
    const next = toStrategyRows(report[field]);
    next[index] = { ...next[index], [key]: value };
    patchReport({ [field]: next });
  }

  function addStrategy(field) {
    patchReport({ [field]: [...toStrategyRows(report[field]), { action: '', assignment: '' }] });
  }

  function removeStrategy(field, index) {
    const next = toStrategyRows(report[field]).filter((_, i) => i !== index);
    patchReport({ [field]: next.length ? next : [{ action: '', assignment: '' }] });
  }

  function toggleCheck(field, index, checked) {
    const next = [...(report[field] || [])];
    next[index] = { ...next[index], checked };
    patchReport({ [field]: next });
  }

  function setCheckLabel(field, index, label) {
    const next = [...(report[field] || [])];
    next[index] = { ...next[index], label };
    patchReport({ [field]: next });
  }

  function addCheckItem(field) {
    patchReport({ [field]: [...(report[field] || []), { label: '', checked: true }] });
  }

  function removeCheckItem(field, index) {
    const cur = report[field] || [];
    if (cur.length <= 1) return;
    patchReport({ [field]: cur.filter((_, i) => i !== index) });
  }

  async function save() {
    setError('');
    setStatus('');
    setSaving(true);
    try {
      await api.patch(`/courses/${id}/`, {
        institute: header.institute,
        logo_fallback: header.logo_fallback,
        department: header.department,
        academic_year: header.academic_year,
        semester: header.semester,
        program_name: header.program_name,
        nba_code: header.nba_code,
        course_name: header.course_name,
        course_code: header.course_code,
        coordinator_names: header.coordinator_names,
        po_count: Number(header.po_count) || 1,
        pso_count: Number(header.pso_count) || 0,
      });

      const savedOutcomes = [];
      for (let i = 0; i < outcomes.length; i += 1) {
        const co = outcomes[i];
        const payload = {
          course: Number(id),
          co_code: co.co_code,
          description: co.description || '',
          cognitive_level: co.cognitive_level,
          order: i,
        };
        let coId = co.id;
        if (coId) {
          const updated = await api.patch(`/courses/outcomes/${coId}/`, payload);
          savedOutcomes.push({ ...co, ...updated.data, mappings: co.mappings || [] });
        } else {
          const created = await api.post('/courses/outcomes/', payload);
          coId = created.data.id;
          savedOutcomes.push({ ...co, ...created.data, mappings: co.mappings || [] });
        }
        for (const po of poKeys) {
          const cell = (co.mappings || []).find((m) => m.po_key === po);
          const existing = (co.mappings || []).find((m) => m.po_key === po && m.id);
          const level = cell?.level === '' || cell?.level === null || cell?.level === undefined
            ? null : Number(cell.level);
          if (existing) {
            await api.patch(`/courses/mappings/${existing.id}/`, { level });
          } else if (level !== null) {
            await api.post('/courses/mappings/', {
              course_outcome: coId, po_key: po, level, justification: '',
            });
          }
        }
      }
      const keptIds = new Set(savedOutcomes.filter((o) => o.id).map((o) => o.id));
      for (const old of (course.outcomes || [])) {
        if (old.id && !keptIds.has(old.id)) {
          await api.delete(`/courses/outcomes/${old.id}/`);
        }
      }

      const res = await api.patch(`/opening-reports/${id}/`, {
        semester_label: report.semester_label,
        watermark_text: report.watermark_text,
        gaps_nil: report.gaps_nil,
        gaps_rows: report.gaps_rows,
        mods_nil: report.mods_nil,
        mods_rows: report.mods_rows,
        co_actions: report.co_actions,
        co_prev_years: report.co_prev_years,
        teaching_methods: report.teaching_methods,
        teaching_other: report.teaching_other,
        weak_strategies: toStrategyRows(report.weak_strategies),
        bright_strategies: toStrategyRows(report.bright_strategies),
        eval_strategies: report.eval_strategies,
        eval_other: report.eval_other,
        module_coordinator: report.module_coordinator || '',
      });
      setReport(res.data.report);
      setCourse(res.data.course);
      setOutcomes([...(res.data.course.outcomes || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      setStatus('Opening report saved.');
    } catch (err) {
      const data = err.response?.data;
      setError(typeof data === 'string' ? data : JSON.stringify(data || 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  if (!course || !report) return <div className="p-8">Loading…</div>;

  const coordinator = header.coordinator_names || coordinatorName(course);
  const ay = header.academic_year;
  const prevYearLabel = previousYearLabel(ay) || '—';
  const nba = header.nba_code || '—';
  const td = 'border border-slate-800 px-2 py-1';
  const th = 'border border-slate-800 px-2 py-1 bg-slate-50 text-center';
  const courseLine = `${header.course_name} (${header.course_code})`;

  return (
    <div className="p-8 max-w-6xl mx-auto print:p-0 print:max-w-none">
      <div className="no-print">
        <Link to={coursesListPath(course)} className="text-sm text-slate-500 hover:text-slate-700">← Back to {coursesListLabel(course)}</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">{header.course_code} — {header.course_name}</h1>
        <p className="text-sm text-slate-500 mb-4">
          Session {course.session_label || header.academic_year}
          {` · Coordinator: ${coordinator}`}
        </p>
        <CourseSubnav courseId={id} />

        {error && <div className="bg-red-50 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}
        {status && <div className="bg-emerald-50 text-emerald-800 text-sm rounded p-3 mb-4">{status}</div>}

        <div className="flex flex-wrap gap-2 justify-end mb-4">
          <button type="button" onClick={() => window.print()} className="bg-slate-200 px-4 py-2 rounded text-sm font-semibold">
            Print / Save as PDF
          </button>
          <button type="button" disabled={saving} onClick={save} className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Opening Report'}
          </button>
        </div>

        <section className="bg-white shadow rounded-lg p-6 mb-6 space-y-6">
          <section className="border-b pb-4">
            <h3 className="font-semibold mb-2">Header &amp; Logo</h3>
            <label className="block mb-2">
              <span className="text-xs text-slate-600">Institute Name (right side)</span>
              <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={header.institute}
                onChange={(e) => setHeaderField('institute', e.target.value)} />
            </label>
            <label className="block mb-2">
              <span className="text-xs text-slate-600">Left Logo Fallback Text</span>
              <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={header.logo_fallback}
                onChange={(e) => setHeaderField('logo_fallback', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Watermark Text</span>
              <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={report.watermark_text || ''}
                onChange={(e) => patchReport({ watermark_text: e.target.value })} />
            </label>
          </section>

          <section className="border-b pb-4">
            <h3 className="font-semibold mb-2">Basic Info</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="block col-span-2">
                <span className="text-xs text-slate-600">Department</span>
                <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={header.department}
                  onChange={(e) => setHeaderField('department', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">Academic Year</span>
                <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={header.academic_year}
                  onChange={(e) => setHeaderField('academic_year', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">Semester Type</span>
                <select className="w-full border rounded px-2 py-1.5 mt-0.5" value={header.semester}
                  onChange={(e) => setHeaderField('semester', e.target.value)}>
                  <option value="ODD">Odd</option>
                  <option value="EVEN">Even</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">Semester Label</span>
                <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={report.semester_label || ''}
                  onChange={(e) => patchReport({ semester_label: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">Programme Name</span>
                <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={header.program_name}
                  onChange={(e) => setHeaderField('program_name', e.target.value)} />
              </label>
              <label className="block col-span-2">
                <span className="text-xs text-slate-600">NBA Code</span>
                <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={header.nba_code}
                  onChange={(e) => setHeaderField('nba_code', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">Course Name</span>
                <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={header.course_name}
                  onChange={(e) => setHeaderField('course_name', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600">Course Code</span>
                <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={header.course_code}
                  onChange={(e) => setHeaderField('course_code', e.target.value)} />
              </label>
              <label className="block col-span-2">
                <span className="text-xs text-slate-600">Course Coordinator</span>
                <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={header.coordinator_names}
                  onChange={(e) => setHeaderField('coordinator_names', e.target.value)} />
              </label>
            </div>
          </section>

          <section className="border-b pb-4">
            <h3 className="font-semibold mb-2">1. Course Outcomes</h3>
            {outcomes.map((co, idx) => (
              <div key={co.id || `new-${idx}`} className="border rounded p-2 mb-2 bg-slate-50">
                <div className="flex justify-between items-center mb-1">
                  <input className="w-28 border rounded px-2 py-1 text-xs font-bold text-blue-800" value={co.co_code || ''}
                    onChange={(e) => updateOutcome(idx, { co_code: e.target.value })} />
                  <button type="button" className="text-red-600" onClick={() => removeCO(idx)}>✕</button>
                </div>
                <textarea className="w-full border rounded px-2 py-1 text-xs mb-1" rows={2} value={co.description || ''}
                  onChange={(e) => updateOutcome(idx, { description: e.target.value })} />
                <select className="w-full border rounded px-2 py-1 text-xs" value={co.cognitive_level}
                  onChange={(e) => updateOutcome(idx, { cognitive_level: e.target.value })}>
                  {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                </select>
              </div>
            ))}
            <button type="button" className="w-full bg-slate-200 rounded py-1 text-xs font-semibold" onClick={addCO}>+ Add Outcome</button>
          </section>

          <section className="border-b pb-4">
            <h3 className="font-semibold mb-2">2. CO-PO-PSO Mapping</h3>
            <div className="flex gap-2 mb-2">
              <button type="button" className="flex-1 bg-slate-200 rounded py-1 text-xs font-semibold"
                onClick={() => setHeaderField('po_count', Number(header.po_count || 0) + 1)}>+ Add PO</button>
              <button type="button" className="flex-1 bg-slate-200 rounded py-1 text-xs font-semibold"
                onClick={() => setHeaderField('pso_count', Number(header.pso_count || 0) + 1)}>+ Add PSO</button>
            </div>
            <div className="flex gap-2 mb-2">
              <button type="button" className="flex-1 text-xs text-red-700"
                onClick={() => { if (Number(header.po_count) > 1) setHeaderField('po_count', Number(header.po_count) - 1); }}>Remove last PO</button>
              <button type="button" className="flex-1 text-xs text-red-700"
                onClick={() => { if (Number(header.pso_count) > 0) setHeaderField('pso_count', Number(header.pso_count) - 1); }}>Remove last PSO</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse min-w-[280px]">
                <thead>
                  <tr>
                    <th className="border p-1 bg-slate-100">COs</th>
                    {poKeys.map((k) => <th key={k} className="border p-1 bg-slate-100">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {outcomes.map((co, idx) => (
                    <tr key={co.id || co.co_code}>
                      <td className="border p-1 font-semibold text-center">{co.co_code}</td>
                      {poKeys.map((k) => {
                        const v = mappingLevel(co, k);
                        const val = v === null || v === undefined || v === '' ? '' : String(v);
                        return (
                          <td key={k} className="border p-0.5">
                            <select className="w-full text-center text-xs" value={val}
                              onChange={(e) => setMapping(idx, k, e.target.value)}>
                              <option value=""></option>
                              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border-b pb-4">
            <h3 className="font-semibold mb-2">3. Identified Gaps in Syllabus/CD</h3>
            <label className="flex items-center gap-2 text-xs font-semibold mb-2">
              <input type="checkbox" checked={!!report.gaps_nil} onChange={(e) => patchReport({
                gaps_nil: e.target.checked,
                gaps_rows: e.target.checked ? report.gaps_rows : (report.gaps_rows?.length ? report.gaps_rows : [emptyGap()]),
              })} />
              No gaps identified (NIL)
            </label>
            {!report.gaps_nil && (
              <>
                {(report.gaps_rows || []).map((row, idx) => (
                  <div key={idx} className="border rounded p-2 mb-2 bg-slate-50 space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Gap {idx + 1}</span>
                      <button type="button" className="text-red-600" onClick={() => {
                        const next = (report.gaps_rows || []).filter((_, i) => i !== idx);
                        patchReport({ gaps_rows: next.length ? next : [emptyGap()] });
                      }}>✕</button>
                    </div>
                    {['topic', 'co', 'popso', 'method'].map((key) => {
                      const ph = { topic: 'Topic to be introduced', co: 'Strengthens CO', popso: 'Strengthens PO, PSO', method: 'Method of Identification' };
                      return (
                        <input key={key} className="w-full border rounded px-2 py-1 text-xs" placeholder={ph[key]}
                          value={row[key] || ''} onChange={(e) => {
                            const next = [...(report.gaps_rows || [])];
                            next[idx] = { ...next[idx], [key]: e.target.value };
                            patchReport({ gaps_rows: next });
                          }} />
                      );
                    })}
                  </div>
                ))}
                <button type="button" className="w-full bg-slate-200 rounded py-1 text-xs font-semibold"
                  onClick={() => patchReport({ gaps_rows: [...(report.gaps_rows || []), emptyGap()] })}>+ Add Gap Row</button>
              </>
            )}
          </section>

          <section className="border-b pb-4">
            <h3 className="font-semibold mb-2">4. Modifications in Syllabus/CD</h3>
            <label className="flex items-center gap-2 text-xs font-semibold mb-2">
              <input type="checkbox" checked={!!report.mods_nil} onChange={(e) => patchReport({
                mods_nil: e.target.checked,
                mods_rows: e.target.checked ? report.mods_rows : (report.mods_rows?.length ? report.mods_rows : [emptyMod()]),
              })} />
              No modifications (NIL)
            </label>
            {!report.mods_nil && (
              <>
                {(report.mods_rows || []).map((row, idx) => (
                  <div key={idx} className="border rounded p-2 mb-2 bg-slate-50 space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Modification {idx + 1}</span>
                      <button type="button" className="text-red-600" onClick={() => {
                        const next = (report.mods_rows || []).filter((_, i) => i !== idx);
                        patchReport({ mods_rows: next.length ? next : [emptyMod()] });
                      }}>✕</button>
                    </div>
                    {['detail', 'justification', 'popso'].map((key) => {
                      const ph = { detail: 'Details (Addition/Removal)', justification: 'Justification', popso: 'Strengthens POs/PSOs' };
                      return (
                        <input key={key} className="w-full border rounded px-2 py-1 text-xs" placeholder={ph[key]}
                          value={row[key] || ''} onChange={(e) => {
                            const next = [...(report.mods_rows || [])];
                            next[idx] = { ...next[idx], [key]: e.target.value };
                            patchReport({ mods_rows: next });
                          }} />
                      );
                    })}
                  </div>
                ))}
                <button type="button" className="w-full bg-slate-200 rounded py-1 text-xs font-semibold"
                  onClick={() => patchReport({ mods_rows: [...(report.mods_rows || []), emptyMod()] })}>+ Add Modification Row</button>
              </>
            )}
          </section>

          <section className="border-b pb-4">
            <h3 className="font-semibold mb-2">5. Actions for Improving CO Attainment</h3>
            {outcomes.map((co) => {
              const row = prevYearsFor(report, co.co_code);
              return (
                <div key={co.co_code} className="border rounded p-3 mb-2 bg-slate-50">
                  <span className="text-xs font-bold text-blue-800">{co.co_code}</span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <label className="block text-xs text-slate-600">Attainment ({prevYearLabel})
                      <input className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" value={row.y1 || ''}
                        onChange={(e) => setPrevYear(co.co_code, 'y1', e.target.value)} />
                    </label>
                    <label className="block text-xs text-slate-600">Action to be taken in {ay || 'this year'}
                      <input className="w-full border rounded px-2 py-1.5 text-sm mt-0.5"
                        value={report.co_actions?.[co.co_code] || ''}
                        onChange={(e) => setAction(co.co_code, e.target.value)} />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Strengthens (auto): {strengthensFromMapping(co, poKeys)}</p>
                </div>
              );
            })}
          </section>

          <ChecklistBlock title="6. Innovative Teaching & Learning Methods" field="teaching_methods"
            items={report.teaching_methods || []} other={report.teaching_other || ''}
            onToggle={toggleCheck} onLabel={setCheckLabel} onAdd={addCheckItem} onRemove={removeCheckItem}
            onOther={(v) => patchReport({ teaching_other: v })} />

          <section className="border-b pb-4">
            <h3 className="font-semibold mb-2">7. Strategies for</h3>
            <StrategyEditor
              title="Weak Learners"
              rows={toStrategyRows(report.weak_strategies)}
              onChange={(i, k, v) => updateStrategy('weak_strategies', i, k, v)}
              onAdd={() => addStrategy('weak_strategies')}
              onRemove={(i) => removeStrategy('weak_strategies', i)}
            />
            <StrategyEditor
              title="Bright Students"
              rows={toStrategyRows(report.bright_strategies)}
              onChange={(i, k, v) => updateStrategy('bright_strategies', i, k, v)}
              onAdd={() => addStrategy('bright_strategies')}
              onRemove={(i) => removeStrategy('bright_strategies', i)}
            />
          </section>

          <ChecklistBlock title="8. Innovative Evaluation Strategy" field="eval_strategies"
            items={report.eval_strategies || []} other={report.eval_other || ''}
            onToggle={toggleCheck} onLabel={setCheckLabel} onAdd={addCheckItem} onRemove={removeCheckItem}
            onOther={(v) => patchReport({ eval_other: v })} />

          <section>
            <h3 className="font-semibold mb-2">Signatures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Module Coordinator</span>
                <textarea className="w-full border rounded px-3 py-2 text-sm" rows={3}
                  placeholder="Name(s)"
                  value={report.module_coordinator || ''}
                  onChange={(e) => patchReport({ module_coordinator: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Course Coordinator</span>
                <input className="w-full border rounded px-3 py-2 text-sm"
                  value={header.coordinator_names}
                  onChange={(e) => setHeaderField('coordinator_names', e.target.value)} />
              </label>
            </div>
          </section>
        </section>
      </div>

      <A4Document watermark={report.watermark_text} revision={`${JSON.stringify(report)}-${JSON.stringify(header)}-${JSON.stringify(outcomes)}`}>
          <div>
            <div className="or-header">
              <div className="or-header-left">{header.logo_fallback || 'LOGO'}</div>
              <div className="or-header-center">
                <div className="or-dept">{header.department}</div>
                <div className="or-title">Course Opening Report</div>
              </div>
              <div className="or-header-right">
                <div className="or-inst">{header.institute || 'Institute'}</div>
                <div className="or-ay">AY: {ay}, {semesterWord} Semester</div>
              </div>
            </div>
            <div className="or-info-line"><b>Programme Name:</b> {header.program_name || '—'}</div>
            <div className="or-info-line"><b>Semester:</b> {report.semester_label || `${semesterWord} Semester`}</div>
            <div className="or-info-line"><b>Course Name &amp; Code:</b> {courseLine}</div>
            <div className="or-info-line"><b>NBA Code:</b> {nba}</div>
            <div className="or-info-line"><b>Name of Course Coordinator:</b> {coordinator}</div>
          </div>

          <h3>1. Course Outcomes</h3>
          <table className="w-full border-collapse mb-2">
            <thead>
              <tr>
                <th className={`${th} w-[14%]`}>COs (NBA Code)</th>
                <th className={th}>Description</th>
                <th className={`${th} w-[30%]`}>Cognitive Level</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((co) => (
                <tr key={co.id || co.co_code}>
                  <td className={`${td} font-semibold`}>{co.co_code}</td>
                  <td className={td}>{co.description || '—'}</td>
                  <td className={td}>{LEVEL_LABELS[co.cognitive_level] || co.cognitive_level}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>2. CO-PO-PSO Mapping</h3>
          <table className="w-full border-collapse mb-2">
            <thead>
              <tr>
                <th className={`${th} w-[12%]`}>COs</th>
                {poKeys.map((k) => <th key={k} className={th}>{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {outcomes.map((co) => (
                <tr key={co.id || co.co_code}>
                  <td className={`${td} font-semibold text-center`}>{co.co_code}</td>
                  {poKeys.map((k) => {
                    const level = mappingLevel(co, k);
                    const has = level !== null && level !== undefined && level !== '';
                    return (
                      <td key={k} className={`${td} text-center`}>
                        <span className={`inline-block min-w-[20px] px-1 rounded font-semibold text-[10px] ${has ? `or-level-${level}` : 'or-level-blank'}`}>
                          {has ? level : '0'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className={`${td} font-semibold text-center`}>Avg.</td>
                {poKeys.map((k) => (
                  <td key={k} className={`${td} text-center font-semibold`}>{mappingAvg(outcomes, k)}</td>
                ))}
              </tr>
            </tbody>
          </table>

          <h3>3. Identified Gaps in Syllabus/ Course Description (If Any): {report.gaps_nil ? 'NIL' : ''}</h3>
          {!report.gaps_nil && (
            <table className="w-full border-collapse mb-2">
              <thead>
                <tr>
                  <th className={th}>Topics to be introduced</th>
                  <th className={th}>Strengthens CO</th>
                  <th className={th}>Strengthens PO, PSO</th>
                  <th className={th}>Method of Identification</th>
                </tr>
              </thead>
              <tbody>
                {(report.gaps_rows || []).map((row, idx) => (
                  <tr key={idx}>
                    <td className={td}>{row.topic || '—'}</td>
                    <td className={td}>{row.co || '—'}</td>
                    <td className={td}>{row.popso || '—'}</td>
                    <td className={td}>{row.method || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3>4. Modifications in Syllabus/ Course Description (If Any): {report.mods_nil ? 'NIL' : ''}</h3>
          {!report.mods_nil && (
            <table className="w-full border-collapse mb-2">
              <thead>
                <tr>
                  <th className={th}>Details of Modification (Addition/Removal)</th>
                  <th className={th}>Justification</th>
                  <th className={th}>Strengthens POs/PSOs</th>
                </tr>
              </thead>
              <tbody>
                {(report.mods_rows || []).map((row, idx) => (
                  <tr key={idx}>
                    <td className={td}>{row.detail || '—'}</td>
                    <td className={td}>{row.justification || '—'}</td>
                    <td className={td}>{row.popso || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3>5. Actions for Improving CO Attainments</h3>
          <table className="w-full border-collapse mb-2">
            <thead>
              <tr>
                <th className={`${th} w-[12%]`}>COs</th>
                <th className={`${th} w-[22%]`}>Attainment ({prevYearLabel})</th>
                <th className={th}>Action to be taken in {ay || 'this'} to improve CO attainment</th>
                <th className={`${th} w-[22%]`}>Strengthens POs/PSOs</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((co) => {
                const row = prevYearsFor(report, co.co_code);
                return (
                  <tr key={co.co_code}>
                    <td className={`${td} font-semibold`}>{co.co_code}</td>
                    <td className={`${td} text-center`}>{row.y1 || '—'}</td>
                    <td className={td}>{report.co_actions?.[co.co_code] || '—'}</td>
                    <td className={td}>{strengthensFromMapping(co, poKeys)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3>6. Innovative Teaching and Learning Method to be used</h3>
          <BulletList items={report.teaching_methods} other={report.teaching_other} />

          <h3>7. Strategies for</h3>
          <div className="mb-1"><b>• Weak Learners:</b></div>
          <StrategyTable rows={toStrategyRows(report.weak_strategies)} td={td} />
          <div className="mb-1 mt-2"><b>• Bright Students:</b></div>
          <StrategyTable rows={toStrategyRows(report.bright_strategies)} td={td} />

          <h3>8. Innovative Evaluation Strategy to be used</h3>
          <BulletList items={report.eval_strategies} other={report.eval_other} />

          <div className="or-signoff">
            <div>
              <b>Signature:</b>
              <div className="mt-2"><b>Module Coordinator:</b></div>
              <div className="whitespace-pre-line mt-1">{report.module_coordinator || ''}</div>
            </div>
            <div>
              <b>Signature:</b>
              <div className="mt-2"><b>Course Coordinator:</b></div>
              <div className="mt-1">{coordinator}</div>
            </div>
          </div>
        </A4Document>
    </div>
  );
}

function ChecklistBlock({ title, field, items, other, onToggle, onLabel, onAdd, onRemove, onOther }) {
  return (
    <section className="border-b pb-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      {(items || []).map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-1">
          <input type="checkbox" checked={!!item.checked} onChange={(e) => onToggle(field, idx, e.target.checked)} />
          <input className="flex-1 border rounded px-2 py-1 text-xs" value={item.label || ''}
            onChange={(e) => onLabel(field, idx, e.target.value)} />
          <button type="button" className="text-red-600" onClick={() => onRemove(field, idx)}>✕</button>
        </div>
      ))}
      <button type="button" className="w-full bg-slate-200 rounded py-1 text-xs font-semibold mb-2" onClick={() => onAdd(field)}>+ Add Point</button>
      <label className="block text-xs text-slate-600">Others
        <input className="w-full border rounded px-2 py-1 mt-0.5" value={other} onChange={(e) => onOther(e.target.value)} />
      </label>
    </section>
  );
}

function StrategyEditor({ title, rows, onChange, onAdd, onRemove }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold mb-2">{title}</p>
      {(rows || []).map((row, idx) => (
        <div key={idx} className="border rounded p-3 mb-2 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="block text-xs text-slate-600">Strategy
            <textarea className="w-full border rounded px-2 py-1.5 text-sm mt-0.5" rows={3}
              value={row.action || ''} onChange={(e) => onChange(idx, 'action', e.target.value)} />
          </label>
          <div>
            <label className="block text-xs text-slate-600">Assignment
              <input className="w-full border rounded px-2 py-1.5 text-sm mt-0.5"
                value={row.assignment || ''} onChange={(e) => onChange(idx, 'assignment', e.target.value)} />
            </label>
            <button type="button" className="text-xs text-red-600 mt-2" onClick={() => onRemove(idx)}>Remove row</button>
          </div>
        </div>
      ))}
      <button type="button" className="text-xs font-semibold bg-slate-200 px-3 py-1.5 rounded" onClick={onAdd}>+ Add row</button>
    </div>
  );
}

function StrategyTable({ rows, td }) {
  const filled = (rows || []).filter((r) => (r.action || '').trim() || (r.assignment || '').trim());
  if (!filled.length) return null;
  return (
    <table className="w-full border-collapse mb-2">
      <tbody>
        {filled.map((row, idx) => (
          <tr key={idx}>
            <td className={`${td} w-[70%] whitespace-pre-line`}>{row.action}</td>
            <td className={td}>{row.assignment}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BulletList({ items, other }) {
  const shown = (items || []).filter((t) => t.checked && t.label);
  return (
    <ul className="list-disc ml-4 mb-2">
      {shown.map((t, i) => <li key={`${t.label}-${i}`}>{t.label}</li>)}
      {other ? <li>{other}</li> : null}
    </ul>
  );
}
