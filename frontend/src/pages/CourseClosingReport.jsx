import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import CourseSubnav from '../components/CourseSubnav';
import A4Document from '../components/A4Document';
import {
  coordinatorName, coursesListLabel, coursesListPath, isLabCourse, teachingFacultyName,
} from '../utils/offering';

const LEVEL_LABELS = {
  REMEMBER: 'Remember Level (Level 1)',
  UNDERSTAND: 'Understand Level (Level 2)',
  APPLY: 'Apply Level (Level 3)',
  ANALYZE: 'Analyze Level (Level 4)',
  EVALUATE: 'Evaluate Level (Level 5)',
  CREATE: 'Create Level (Level 6)',
};

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
  if (!count) return '';
  const avg = Math.round((sum / count) * 100) / 100;
  return String(avg).replace(/\.?0+$/, '');
}

function compactYear(year) {
  if (!year) return '';
  const m = String(year).match(/^(\d{4})\s*[-/]\s*(\d{2,4})$/);
  if (!m) return String(year);
  const end = m[2].length === 4 ? m[2].slice(-2) : m[2];
  return `${m[1]}-${end}`;
}

function poHeadParts(key) {
  const m = String(key || '').match(/^(PO|PSO)\s*(\d+)$/i);
  if (!m) return [key, ''];
  return [m[1].toUpperCase(), m[2]];
}

function isFilled(row) {
  return Object.values(row || {}).some((v) => String(v || '').trim());
}

function mappedPoKeys(outcomes, allKeys) {
  const used = new Set();
  (outcomes || []).forEach((co) => {
    (co.mappings || []).forEach((m) => {
      if (m.level !== null && m.level !== undefined && m.level !== '' && Number(m.level) !== 0) {
        used.add(m.po_key);
      }
    });
  });
  const cols = (allKeys || []).filter((k) => used.has(k));
  return cols.length ? cols : allKeys;
}

function GradeCountChart({ grades }) {
  const rows = (grades || []).filter((g) => g.grade && g.grade !== 'I');
  const counts = rows.map((g) => Number(g.count) || 0);
  const maxVal = Math.max(4, ...counts);
  const step = maxVal <= 8 ? 2 : maxVal <= 16 ? 4 : 5;
  const yMax = Math.ceil(maxVal / step) * step || step;
  const width = 420;
  const height = 220;
  const padL = 36;
  const padR = 70;
  const padT = 16;
  const padB = 32;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const barW = Math.min(28, plotW / Math.max(rows.length, 1) * 0.55);
  const ticks = [];
  for (let y = 0; y <= yMax; y += step) ticks.push(y);

  return (
    <div className="grade-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="grade-chart" role="img" aria-label="Grade count chart">
        {ticks.map((y) => {
          const py = padT + plotH - (y / yMax) * plotH;
          return (
            <g key={y}>
              <line x1={padL} x2={padL + plotW} y1={py} y2={py} stroke="#d0d0d0" strokeWidth="1" />
              <text x={padL - 6} y={py + 3} textAnchor="end" fontSize="10" fill="#444">{y}</text>
            </g>
          );
        })}
        <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="#666" strokeWidth="1" />
        <line x1={padL} x2={padL + plotW} y1={padT + plotH} y2={padT + plotH} stroke="#666" strokeWidth="1" />
        {rows.map((g, i) => {
          const count = Number(g.count) || 0;
          const slot = plotW / rows.length;
          const x = padL + i * slot + (slot - barW) / 2;
          const h = (count / yMax) * plotH;
          const y = padT + plotH - h;
          return (
            <g key={g.grade}>
              <rect x={x} y={y} width={barW} height={Math.max(h, 0)} fill="#4472C4" />
              <text x={x + barW / 2} y={padT + plotH + 14} textAnchor="middle" fontSize="10" fill="#222">{g.grade}</text>
            </g>
          );
        })}
        <rect x={width - 62} y={padT + 8} width="10" height="10" fill="#4472C4" />
        <text x={width - 48} y={padT + 17} fontSize="10" fill="#222">Count</text>
      </svg>
    </div>
  );
}

const SAVE_FIELDS = [
  'doc_title', 'semester_label', 'module_coordinator', 'watermark_text',
  'teaching_methods', 'eval_strategies', 'co_current', 'po_current',
  'grade_percents', 'co8_rows', 'popso9', 'suggestions', 'weak_actions',
  'bright_actions',
];

export default function CourseClosingReport() {
  const { id } = useParams();
  const previewRef = useRef(null);
  const [course, setCourse] = useState(null);
  const [report, setReport] = useState(null);
  const [synced, setSynced] = useState({});
  const [history, setHistory] = useState({ prior_years: [], by_year: {}, has_stored: false, stored_years: [] });
  const [prevYearLabel, setPrevYearLabel] = useState('');
  const [currentYearLabel, setCurrentYearLabel] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [previewing, setPreviewing] = useState(true);

  function applyPayload(data) {
    setCourse(data.course);
    setReport(data.report);
    setSynced(data.synced || {});
    setHistory(data.history || { prior_years: [], by_year: {}, has_stored: false, stored_years: [] });
    setPrevYearLabel(data.previous_year_label || compactYear(data.previous_academic_year) || '');
    setCurrentYearLabel(data.current_year_label || compactYear(data.course?.academic_year) || '');
  }

  async function load() {
    const res = await api.get(`/closing-reports/${id}/`);
    applyPayload(res.data);
  }

  useEffect(() => {
    load().catch((err) => {
      const data = err.response?.data;
      const msg = typeof data === 'string' ? data : (data?.error || data?.detail || 'Failed to load closing report.');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    });
  }, [id]);

  const outcomes = useMemo(
    () => [...(course?.outcomes || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [course],
  );
  const poKeys = course?.po_pso_keys?.length ? course.po_pso_keys : ['PO1', 'PO2', 'PO3', 'PSO1', 'PSO2'];
  const actionPoKeys = synced.mapped_po_keys?.length ? synced.mapped_po_keys : mappedPoKeys(outcomes, poKeys);
  const semesterWord = course?.semester === 'EVEN' ? 'Even' : 'Odd';
  const lab = isLabCourse(course);
  const nums = lab
    ? { coAtt: 7, poAtt: 8, summary: 9, teach: 10, evals: 11, coAct: 12, poAct: 13, sug: 14, weak: 15, bright: 16 }
    : { coAtt: 3, poAtt: 4, summary: 5, teach: 6, evals: 7, coAct: 8, poAct: 9, sug: 10, weak: 11, bright: 12 };

  function patchReport(partial) {
    setReport((prev) => ({ ...prev, ...partial }));
  }

  async function save() {
    setError('');
    setStatus('');
    setSaving(true);
    try {
      const body = {};
      SAVE_FIELDS.forEach((key) => { body[key] = report[key]; });
      const res = await api.patch(`/closing-reports/${id}/`, body);
      if (res.data.report) setReport(res.data.report);
      setStatus('Closing report saved.');
    } catch (err) {
      const data = err.response?.data;
      setError(typeof data === 'string' ? data : JSON.stringify(data || 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  async function loadPreviousYear() {
    setError('');
    setStatus('');
    setLoadingHistory(true);
    try {
      const res = await api.post(`/closing-reports/${id}/load-history/`);
      applyPayload(res.data);
      setStatus(res.data.status || 'Previous-year data loaded.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load previous-year data.');
    } finally {
      setLoadingHistory(false);
    }
  }

  function showPreview() {
    setPreviewing(true);
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function updateList(field, idx, key, value) {
    const next = [...(report[field] || [])];
    next[idx] = { ...next[idx], [key]: value };
    patchReport({ [field]: next });
  }

  function addList(field, empty) {
    patchReport({ [field]: [...(report[field] || []), empty] });
  }

  function removeList(field, idx, minRows = 1) {
    const cur = report[field] || [];
    if (cur.length <= minRows) return;
    patchReport({ [field]: cur.filter((_, i) => i !== idx) });
  }

  function updateBullet(field, idx, value) {
    const next = [...(report[field] || [])];
    next[idx] = value;
    patchReport({ [field]: next });
  }

  if (error && (!course || !report)) {
    return (
      <div className="p-8">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  if (!course || !report) return <div className="p-8">Loading…</div>;

  const dept = course.department || '—';
  const coordinator = coordinatorName(course);
  const facultyPerson = teachingFacultyName(course);
  const ay = course.academic_year;
  const nba = course.nba_code || '—';
  const td = 'border border-slate-800 px-1.5 py-1';
  const th = 'border border-slate-800 px-1.5 py-1 bg-white font-semibold text-center';
  const grades = report.grade_percents?.length ? report.grade_percents : (synced.grade_percents || []);
  const totalStudents = synced.total_students || 0;
  const suggestionsFilled = (report.suggestions || []).filter(isFilled);
  const storedLabel = (history.stored_years || []).join(', ') || 'none';
  const prevLabel = prevYearLabel || compactYear((history.prior_years || [])[0]) || 'previous year';
  const currLabel = currentYearLabel || compactYear(ay) || ay;

  return (
    <div className="p-8 max-w-6xl mx-auto print:p-0 print:max-w-none">
      <div className="no-print">
        <Link to={coursesListPath(course)} className="text-sm text-slate-500 hover:text-slate-700">← Back to {coursesListLabel(course)}</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">{course.course_code} — {course.course_name}</h1>
        <p className="text-sm text-slate-500 mb-4">
          Session {course.session_label || ay}
          {` · Faculty: ${facultyPerson} · Coordinator: ${coordinator}`}
        </p>
        <CourseSubnav courseId={id} />

        {error && <div className="bg-red-50 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}
        {status && <div className="bg-emerald-50 text-emerald-800 text-sm rounded p-3 mb-4">{status}</div>}

        <div className="flex flex-wrap gap-2 justify-end mb-4">
          <button type="button" onClick={showPreview} className="bg-white border px-4 py-2 rounded text-sm font-semibold">Preview</button>
          <button type="button" onClick={() => { setPreviewing(true); window.print(); }} className="bg-slate-200 px-4 py-2 rounded text-sm font-semibold">Print / Save as PDF</button>
          <button type="button" disabled={saving} onClick={save} className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Closing Report'}
          </button>
        </div>

        <section className="bg-white shadow rounded-lg p-6 mb-6 space-y-6">
          <div>
            <h2 className="font-semibold text-slate-900 mb-1">Synced from Course Description, Opening Report, Students &amp; Marks</h2>
            <p className="text-xs text-slate-500 mb-3">
              Header, COs, mapping, current attainments, grades and roster come from other tabs.
              Edit COs on Course Description, methods on Opening Report, and marks on Students &amp; Marks, then refresh this page.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 rounded p-3 border">
              <p><span className="text-slate-500">Department:</span> {dept}</p>
              <p><span className="text-slate-500">Academic year:</span> {ay}</p>
              <p><span className="text-slate-500">Semester:</span> {semesterWord}</p>
              <p><span className="text-slate-500">Programme:</span> {course.program_name || '—'}</p>
              <p className="col-span-2"><span className="text-slate-500">Course:</span> {course.course_name} ({course.course_code})</p>
              <p><span className="text-slate-500">NBA code:</span> {nba}</p>
              <p><span className="text-slate-500">Faculty:</span> {facultyPerson}</p>
              <p><span className="text-slate-500">Coordinator:</span> {coordinator}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="block text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Document title</span>
                <input className="w-full border rounded px-3 py-2 text-sm" value={report.doc_title || ''}
                  onChange={(e) => patchReport({ doc_title: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Semester label</span>
                <input className="w-full border rounded px-3 py-2 text-sm" value={report.semester_label || ''}
                  onChange={(e) => patchReport({ semester_label: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Module coordinator</span>
                <input className="w-full border rounded px-3 py-2 text-sm" value={report.module_coordinator || ''}
                  onChange={(e) => patchReport({ module_coordinator: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Watermark</span>
                <input className="w-full border rounded px-3 py-2 text-sm" value={report.watermark_text || ''}
                  onChange={(e) => patchReport({ watermark_text: e.target.value })} />
              </label>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">Previous-year attainments</h2>
            <p className="text-xs text-slate-500 mb-2">
              Previous year used in tables: <b>{prevLabel || '—'}</b>. Stored years: <b>{storedLabel}</b>.
            </p>
            <button type="button" disabled={loadingHistory} onClick={loadPreviousYear}
              className="bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded disabled:opacity-50">
              {loadingHistory ? 'Loading…' : 'Load Previous Year Data'}
            </button>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">{nums.coAtt}–{nums.summary}. Current attainments &amp; grades (auto)</h2>
            <p className="text-xs text-slate-500 mb-2">Generated from Students &amp; Marks. Override a cell if needed, then Save.</p>
            <div className="overflow-auto border rounded mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {outcomes.map((co) => <th key={co.co_code} className="p-2">{co.co_code}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {outcomes.map((co) => (
                      <td key={co.co_code} className="p-1">
                        <input className="w-full border rounded px-2 py-1 text-center text-sm"
                          value={report.co_current?.[co.co_code] ?? ''}
                          onChange={(e) => patchReport({ co_current: { ...(report.co_current || {}), [co.co_code]: e.target.value } })} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="overflow-auto border rounded mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-2 text-left">PO-PSO-Attainment</th>
                    {poKeys.map((k) => <th key={k} className="p-2">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2"></td>
                    {poKeys.map((k) => (
                      <td key={k} className="p-1">
                        <input className="w-full border rounded px-2 py-1 text-center text-sm"
                          value={report.po_current?.[k] ?? ''}
                          onChange={(e) => patchReport({ po_current: { ...(report.po_current || {}), [k]: e.target.value } })} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mb-1">Total students = {totalStudents}</p>
            <div className="overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-2"></th>
                    {grades.map((g, i) => <th key={`${g.grade}-${i}`} className="p-2">Grade {g.grade}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 font-semibold">% age of Students</td>
                    {grades.map((g, i) => (
                      <td key={`${g.grade}-${i}`} className="p-1">
                        <input className="w-full border rounded px-2 py-1 text-center text-sm" value={g.pct ?? ''}
                          onChange={(e) => {
                            const next = [...grades];
                            next[i] = { ...next[i], pct: e.target.value };
                            patchReport({ grade_percents: next });
                          }} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <BulletEditor title={`${nums.teach}. Innovative teaching methods`} items={report.teaching_methods || []}
            onChange={(i, v) => updateBullet('teaching_methods', i, v)}
            onAdd={() => patchReport({ teaching_methods: [...(report.teaching_methods || []), ''] })}
            onRemove={(i) => {
              const cur = report.teaching_methods || [];
              if (cur.length <= 1) return;
              patchReport({ teaching_methods: cur.filter((_, idx) => idx !== i) });
            }} />
          <BulletEditor title={`${nums.evals}. Innovative evaluation strategy`} items={report.eval_strategies || []}
            onChange={(i, v) => updateBullet('eval_strategies', i, v)}
            onAdd={() => patchReport({ eval_strategies: [...(report.eval_strategies || []), ''] })}
            onRemove={(i) => {
              const cur = report.eval_strategies || [];
              if (cur.length <= 1) return;
              patchReport({ eval_strategies: cur.filter((_, idx) => idx !== i) });
            }} />

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">{nums.coAct}. Actions taken — CO attainments</h2>
            {(report.co8_rows || []).map((row, idx) => (
              <div key={idx} className="border rounded p-3 mb-2 bg-slate-50 space-y-2">
                <div className="flex justify-between">
                  <p className="text-sm font-semibold">{row.co || 'CO'}</p>
                  <button type="button" className="text-red-600 text-sm" onClick={() => removeList('co8_rows', idx)}>✕</button>
                </div>
                <label className="text-xs block">Attainments in {prevLabel}
                  <input className="w-full border rounded px-2 py-1 text-sm" value={row.a_prev || ''}
                    onChange={(e) => updateList('co8_rows', idx, 'a_prev', e.target.value)} />
                </label>
                <label className="text-xs block">Action(s) taken in {currLabel} to improve CO attainment
                  <textarea rows={2} className="w-full border rounded px-2 py-1 text-sm" value={row.action || ''}
                    onChange={(e) => updateList('co8_rows', idx, 'action', e.target.value)} />
                </label>
                <label className="text-xs block">Proof Document(s) attached in Course File
                  <input className="w-full border rounded px-2 py-1 text-sm" value={row.proof || ''}
                    onChange={(e) => updateList('co8_rows', idx, 'proof', e.target.value)} />
                </label>
                <div className="flex flex-wrap gap-3 text-xs">
                  {actionPoKeys.map((k) => (
                    <label key={k} className="flex items-center gap-1">
                      <input type="checkbox" checked={!!row.checks?.[k]}
                        onChange={(e) => {
                          const next = [...(report.co8_rows || [])];
                          next[idx] = { ...next[idx], checks: { ...(next[idx].checks || {}), [k]: e.target.checked } };
                          patchReport({ co8_rows: next });
                        }} />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" className="text-xs font-semibold bg-slate-200 px-3 py-1.5 rounded"
              onClick={() => addList('co8_rows', { co: '', a_prev: '', action: '', proof: '', checks: {} })}>
              + Add CO row
            </button>
          </div>

          <div>
            <h2 className="font-semibold text-slate-900 mb-2">{nums.poAct}. Actions taken — PO/PSO attainments</h2>
            {poKeys.map((k) => {
              const row = report.popso9?.[k] || { a_prev: '', action: '', proof: '' };
              return (
                <div key={k} className="border rounded p-3 mb-2 bg-slate-50 space-y-2">
                  <p className="text-sm font-semibold">{k}</p>
                  <label className="text-xs block">Attainments in {prevLabel}
                    <input className="w-full border rounded px-2 py-1 text-sm" value={row.a_prev || ''}
                      onChange={(e) => patchReport({ popso9: { ...(report.popso9 || {}), [k]: { ...row, a_prev: e.target.value } } })} />
                  </label>
                  <textarea rows={2} className="w-full border rounded px-2 py-1 text-sm"
                    placeholder={`Action(s) taken in ${currLabel} to improve the attainment`}
                    value={row.action || ''}
                    onChange={(e) => patchReport({ popso9: { ...(report.popso9 || {}), [k]: { ...row, action: e.target.value } } })} />
                  <input className="w-full border rounded px-2 py-1 text-sm" placeholder="Proof Document(s) attached in Course File"
                    value={row.proof || ''}
                    onChange={(e) => patchReport({ popso9: { ...(report.popso9 || {}), [k]: { ...row, proof: e.target.value } } })} />
                </div>
              );
            })}
          </div>

          <ListBlock title={`${nums.sug}. Suggestions for improvement`} rows={report.suggestions || []}
            fields={[{ key: 'suggestion', label: 'Suggestion' }, { key: 'co', label: 'Relevance to CO' }, { key: 'popso', label: 'Relevance to PO/PSO' }]}
            onChange={(i, k, v) => updateList('suggestions', i, k, v)}
            onAdd={() => addList('suggestions', { suggestion: '', co: '', popso: '' })}
            onRemove={(i) => removeList('suggestions', i)} />
          <ListBlock title={`${nums.weak}. Action taken for weak students`} rows={report.weak_actions || []}
            fields={[{ key: 'action', label: 'Action taken' }, { key: 'proof', label: 'Proof document(s)' }]}
            onChange={(i, k, v) => updateList('weak_actions', i, k, v)}
            onAdd={() => addList('weak_actions', { action: '', proof: '' })}
            onRemove={(i) => removeList('weak_actions', i)} />
          <ListBlock title={`${nums.bright}. Action taken for bright students`} rows={report.bright_actions || []}
            fields={[{ key: 'action', label: 'Action taken' }, { key: 'proof', label: 'Proof document(s)' }]}
            onChange={(i, k, v) => updateList('bright_actions', i, k, v)}
            onAdd={() => addList('bright_actions', { action: '', proof: '' })}
            onRemove={(i) => removeList('bright_actions', i)} />
        </section>
      </div>

      <div ref={previewRef} className={previewing ? '' : 'hidden print:block'}>
        <A4Document
          watermark={report.watermark_text}
          revision={`${JSON.stringify(report)}-${JSON.stringify(course)}-${JSON.stringify(history)}-${prevLabel}-${totalStudents}`}
        >
          <div className="border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="w-[140px] text-left font-bold uppercase text-[12px]">{course.logo_fallback || 'LOGO'}</div>
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-blue-800 uppercase tracking-wide">{report.doc_title || 'Course Closing Report'}</p>
              </div>
              <div className="w-[200px] text-right">
                <p className="text-[11px] font-bold text-blue-800 uppercase leading-tight">{course.institute || 'Institute'}</p>
                {course.institute_sub ? <p className="text-[8px] text-slate-600">{course.institute_sub}</p> : null}
              </div>
            </div>
          </div>

          {dept ? <p className="text-center font-bold text-[12px]">{dept}</p> : null}
          <p className="text-center font-bold text-[11px] mb-3">AY: {ay} ({semesterWord} Semester)</p>

          <table className="w-full border-collapse mb-3">
            <tbody>
              <tr>
                <td className={`${td} leading-relaxed`}>
                  <div><b>Programme Name:</b> {course.program_name || '—'}</div>
                  <div><b>Semester:</b> {report.semester_label || `${semesterWord} Semester`}</div>
                  <div><b>Course Name &amp; Code:</b> {course.course_name} ({course.course_code})</div>
                  <div><b>NBA Code:</b> {nba}</div>
                  <div><b>Faculty:</b> {facultyPerson}</div>
                  <div><b>Name of Course Coordinator:</b> {coordinator}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <h3 className="font-semibold underline mb-1">1. Course Outcomes:</h3>
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr>
                <th className={`${th} w-[14%]`}>COs (NBA Code)</th>
                <th className={th}>Description</th>
                <th className={`${th} w-[28%]`}>Cognitive Level</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((co) => (
                <tr key={co.id || co.co_code}>
                  <td className={`${td} font-semibold text-center`}>{co.co_code}</td>
                  <td className={td}>{co.description || '—'}</td>
                  <td className={`${td} text-center`}>{LEVEL_LABELS[co.cognitive_level] || co.cognitive_level}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="font-semibold underline mb-1">2. CO-PO-PSO Mapping:</h3>
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr>
                <th className={th}>COs</th>
                {poKeys.map((k) => <th key={k} className={th}>{k === 'PSO1' ? 'PSO 1' : k}</th>)}
              </tr>
            </thead>
            <tbody>
              {outcomes.map((co) => (
                <tr key={co.id || co.co_code}>
                  <td className={`${td} font-semibold text-center`}>{co.co_code}</td>
                  {poKeys.map((k) => {
                    const level = mappingLevel(co, k);
                    const has = level !== null && level !== undefined && level !== '';
                    return <td key={k} className={`${td} text-center font-semibold`}>{has ? level : ''}</td>;
                  })}
                </tr>
              ))}
              <tr>
                <td className={`${td} font-semibold text-center`}>Avg.</td>
                {poKeys.map((k) => <td key={k} className={`${td} text-center font-semibold`}>{mappingAvg(outcomes, k)}</td>)}
              </tr>
            </tbody>
          </table>

          {!lab && (
            <>
              <h3 className="font-semibold underline mb-1">3. CO Attainments in {ay}:</h3>
              <CoAttTable outcomes={outcomes} values={report.co_current} td={td} th={th} />
              <h3 className="font-semibold underline mb-1">4. PO-PSO Attainments in {ay}:</h3>
              <PoAttTable poKeys={poKeys} values={report.po_current} td={td} th={th} />
              <h3 className="font-semibold underline mb-1">5. Summary of Result Analysis: Total students={totalStudents}</h3>
              <GradeTable grades={grades} td={td} th={th} />
              <GradeCountChart grades={grades} />
              <h3 className="font-semibold underline mb-1">6. Innovative Teaching and Learning Method used (if any):</h3>
              <ul className="list-disc ml-5 mb-3">
                {(report.teaching_methods || []).filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
              <h3 className="font-semibold underline mb-1">7. Innovative Evaluation Strategy used (If any):</h3>
              <ul className="list-disc ml-5 mb-3">
                {(report.eval_strategies || []).filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </>
          )}

          {lab && (
            <>
              <h3 className="font-semibold underline mb-1">7. CO Attainments in {currLabel}:</h3>
              <CoAttTable outcomes={outcomes} values={report.co_current} td={td} th={th} />
              <h3 className="font-semibold underline mb-1">8. PO-PSO Attainments in {currLabel}:</h3>
              <PoAttTable poKeys={poKeys} values={report.po_current} td={td} th={th} />
              <h3 className="font-semibold underline mb-1">9. Summary of Result Analysis: Total students={totalStudents}</h3>
              <GradeTable grades={grades} td={td} th={th} />
              <GradeCountChart grades={grades} />
              <h3 className="font-semibold underline mb-1">10. Innovative Teaching and Learning Method used (if any):</h3>
              <ul className="list-disc ml-5 mb-3">
                {(report.teaching_methods || []).filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
              <h3 className="font-semibold underline mb-1">11. Innovative Evaluation Strategy used (If any):</h3>
              <ul className="list-disc ml-5 mb-3">
                {(report.eval_strategies || []).filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </>
          )}

          <h3 className="font-semibold underline mb-1">{nums.coAct}. Actions Taken for Improvement in CO Attainments:</h3>
          <table className="w-full border-collapse mb-3 text-[10px] cr-co-actions">
            <thead>
              <tr>
                <th className={th}>COs</th>
                <th className={th}>Attainments in {prevLabel}</th>
                <th className={th}>Action(s) taken in {currLabel} to improve CO attainment</th>
                <th className={th}>Proof Document(s) attached in Course File</th>
                {actionPoKeys.map((k) => {
                  const [pre, num] = poHeadParts(k);
                  return (
                    <th key={k} className={`${th} cr-po-head`}>
                      <div>{pre}</div>
                      <div>{num}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(report.co8_rows || []).map((row, idx) => (
                <tr key={idx}>
                  <td className={`${td} font-semibold text-center`}>{row.co}</td>
                  <td className={`${td} text-center`}>{row.a_prev || ''}</td>
                  <td className={`${td} text-left`}>{row.action || ''}</td>
                  <td className={`${td} text-center`}>{row.proof || ''}</td>
                  {actionPoKeys.map((k) => (
                    <td key={k} className={`${td} text-center cr-tick`}>{row.checks?.[k] ? '✓' : ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="font-semibold underline mb-1">{nums.poAct}. Actions Taken for Improvement in PO-PSO Attainments:</h3>
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr>
                <th className={th}>PO-PSOs</th>
                <th className={th}>Attainments in {prevLabel}</th>
                <th className={th}>Action(s) taken in {currLabel} to improve the attainment</th>
                <th className={th}>Proof Document(s) attached in Course File</th>
              </tr>
            </thead>
            <tbody>
              {poKeys.map((k) => {
                const row = report.popso9?.[k] || {};
                return (
                  <tr key={k}>
                    <td className={`${td} font-semibold text-center`}>{k}</td>
                    <td className={`${td} text-center`}>{row.a_prev || ''}</td>
                    <td className={td}>{row.action || ''}</td>
                    <td className={td}>{row.proof || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3 className="font-semibold underline mb-1">{nums.sug}. Suggestions for Improvement:</h3>
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr>
                <th className={`${th} w-[8%]`}>SN</th>
                <th className={th}>Suggestion</th>
                <th className={th}>Relevance to CO</th>
                <th className={th}>Relevance to PO/PSO</th>
              </tr>
            </thead>
            <tbody>
              {(suggestionsFilled.length ? suggestionsFilled : [{ suggestion: '', co: '', popso: '' }]).map((s, i) => (
                <tr key={i}>
                  <td className={`${td} text-center`}>{i + 1}</td>
                  <td className={td}>{s.suggestion || ''}</td>
                  <td className={td}>{s.co || ''}</td>
                  <td className={td}>{s.popso || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="font-semibold underline mb-1">{nums.weak}. Action taken for weak students:</h3>
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr>
                <th className={th}>Action taken for weak students</th>
                <th className={th}>Proof Document(s) attached in Course File</th>
              </tr>
            </thead>
            <tbody>
              {(report.weak_actions || []).map((w, i) => (
                <tr key={i}>
                  <td className={td}>{w.action || ''}</td>
                  <td className={td}>{w.proof || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="font-semibold underline mb-1">{nums.bright}. Action taken for bright students:</h3>
          <table className="w-full border-collapse mb-3">
            <thead>
              <tr>
                <th className={th}>Action taken for bright students</th>
                <th className={th}>Proof Document(s) attached in Course File</th>
              </tr>
            </thead>
            <tbody>
              {(report.bright_actions || []).map((b, i) => (
                <tr key={i}>
                  <td className={td}>{b.action || ''}</td>
                  <td className={td}>{b.proof || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between font-semibold text-[11px] mt-4 mb-4">
            <span>Signature — Module Coordinator: {report.module_coordinator || ''}</span>
            <span>Signature — Course Coordinator: {coordinator}</span>
          </div>
        </A4Document>
      </div>
    </div>
  );
}

function CoAttTable({ outcomes, values, td, th }) {
  return (
    <table className="w-full border-collapse mb-3">
      <tbody>
        <tr>
          {outcomes.map((co) => <th key={co.co_code} className={th}>{co.co_code}</th>)}
        </tr>
        <tr>
          {outcomes.map((co) => <td key={co.co_code} className={`${td} text-center`}>{values?.[co.co_code] || ''}</td>)}
        </tr>
      </tbody>
    </table>
  );
}

function PoAttTable({ poKeys, values, td, th }) {
  return (
    <table className="w-full border-collapse mb-3">
      <tbody>
        <tr>
          <th className={th}>PO-PSO-<br />Attainment</th>
          {poKeys.map((k) => <th key={k} className={th}>{k}</th>)}
        </tr>
        <tr>
          <td className={td}></td>
          {poKeys.map((k) => <td key={k} className={`${td} text-center`}>{values?.[k] || ''}</td>)}
        </tr>
      </tbody>
    </table>
  );
}

function GradeTable({ grades, td, th }) {
  return (
    <table className="w-full border-collapse mb-3">
      <tbody>
        <tr>
          <th className={th}></th>
          {(grades || []).map((g, i) => <th key={`${g.grade}-h-${i}`} className={th}>Grade {g.grade}</th>)}
        </tr>
        <tr>
          <td className={`${td} font-semibold`}>% age of Students</td>
          {(grades || []).map((g, i) => <td key={`${g.grade}-v-${i}`} className={`${td} text-center`}>{g.pct || ''}</td>)}
        </tr>
      </tbody>
    </table>
  );
}

function BulletEditor({ title, items, onChange, onAdd, onRemove }) {
  return (
    <div>
      <h2 className="font-semibold text-slate-900 mb-2">{title}</h2>
      {(items || []).map((val, idx) => (
        <div key={idx} className="flex gap-2 mb-1">
          <input className="flex-1 border rounded px-2 py-1 text-sm" value={val}
            onChange={(e) => onChange(idx, e.target.value)} />
          <button type="button" className="text-red-600" onClick={() => onRemove(idx)}>✕</button>
        </div>
      ))}
      <button type="button" className="text-xs font-semibold bg-slate-200 px-3 py-1.5 rounded" onClick={onAdd}>+ Add point</button>
    </div>
  );
}

function ListBlock({ title, rows, fields, onChange, onAdd, onRemove }) {
  return (
    <div>
      <h2 className="font-semibold text-slate-900 mb-2">{title}</h2>
      {(rows || []).map((row, idx) => (
        <div key={idx} className="border rounded p-2 mb-2 bg-slate-50">
          <div className="flex justify-end">
            <button type="button" className="text-red-600 text-sm" onClick={() => onRemove(idx)}>✕</button>
          </div>
          {fields.map((f) => (
            <input key={f.key} className="w-full border rounded px-2 py-1 text-sm mb-1" placeholder={f.label}
              value={row[f.key] || ''} onChange={(e) => onChange(idx, f.key, e.target.value)} />
          ))}
        </div>
      ))}
      <button type="button" className="text-xs font-semibold bg-slate-200 px-3 py-1.5 rounded" onClick={onAdd}>+ Add row</button>
    </div>
  );
}
