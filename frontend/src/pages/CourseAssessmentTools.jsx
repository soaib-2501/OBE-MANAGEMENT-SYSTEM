import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import CourseSubnav from '../components/CourseSubnav';
import A4Document from '../components/A4Document';
import { coordinatorName, coursesListLabel, coursesListPath, isLabCourse, teachingFacultyName } from '../utils/offering';

const LEVELS = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
const LEVEL_LABELS = {
  REMEMBER: 'Remember Level (Level 1)',
  UNDERSTAND: 'Understand Level (Level 2)',
  APPLY: 'Apply Level (Level 3)',
  ANALYZE: 'Analyze Level (Level 4)',
  EVALUATE: 'Evaluate Level (Level 5)',
  CREATE: 'Create Level (Level 6)',
};
const LEVEL_SHORT = {
  REMEMBER: 'Remember',
  UNDERSTAND: 'Understand',
  APPLY: 'Apply',
  ANALYZE: 'Analyze',
  EVALUATE: 'Evaluate',
  CREATE: 'Design',
};
const BLOOM = {
  REMEMBER: 'C1',
  UNDERSTAND: 'C2',
  APPLY: 'C3',
  ANALYZE: 'C4',
  EVALUATE: 'C5',
  CREATE: 'C6',
};

function emptyQuestion(outcomes, index = 0) {
  const co = outcomes[index] || outcomes[0];
  return {
    qno: `Q${index + 1}`,
    co_code: co?.co_code || '',
    ques_level: co?.cognitive_level || '',
    remarks: '',
  };
}

function defaultTools(course, outcomes) {
  const lab = isLabCourse(course);
  const specs = lab
    ? [['Mid Sem', 2], ['End Sem', 2], ['D2D', 5]]
    : [['T-1', 4], ['T-2', 4], ['T-3', 6]];
  const t3Map = [0, 1, 2, 2, 1, 3];
  return specs.map(([name, count]) => ({
    name,
    questions: Array.from({ length: count }, (_, i) => {
      const idx = name === 'T-3' ? t3Map[i] ?? i : i;
      return emptyQuestion(outcomes, idx);
    }),
  }));
}

function normalizeTools(raw, course, outcomes) {
  if (Array.isArray(raw) && raw.length && Array.isArray(raw[0]?.questions)) {
    return raw.map((tool) => ({
      name: tool.name || '',
      questions: (tool.questions || []).map((q, i) => ({
        qno: q.qno || `Q${i + 1}`,
        co_code: q.co_code || '',
        ques_level: q.ques_level || '',
        remarks: q.remarks || '',
      })),
    }));
  }
  return defaultTools(course, outcomes);
}

function coLevelText(outcomes, coCode) {
  const co = outcomes.find((o) => o.co_code === coCode);
  if (!co) return coCode || '—';
  const bloom = BLOOM[co.cognitive_level] || '';
  if (co.cognitive_level === 'CREATE') {
    return bloom ? `${co.co_code}, Design (${bloom})` : `${co.co_code}, Design`;
  }
  const word = LEVEL_SHORT[co.cognitive_level] || co.cognitive_level;
  return bloom ? `${co.co_code}, ${word} Level (${bloom})` : `${co.co_code}, ${LEVEL_LABELS[co.cognitive_level] || co.cognitive_level}`;
}

export default function CourseAssessmentTools() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [doc, setDoc] = useState(null);
  const [tools, setTools] = useState([]);
  const [title, setTitle] = useState('Cognitive level mapping of CO to the assessment tool');
  const [semesterLabel, setSemesterLabel] = useState('');
  const [moduleCoordinator, setModuleCoordinator] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const outcomes = useMemo(
    () => [...(course?.outcomes || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [course],
  );
  const dropdownLevels = useMemo(() => {
    const used = [];
    outcomes.forEach((co) => {
      if (co.cognitive_level && !used.includes(co.cognitive_level)) used.push(co.cognitive_level);
    });
    return used;
  }, [outcomes]);

  async function load() {
    const res = await api.get(`/assessment-tools/${id}/`);
    const c = res.data.course;
    const d = res.data.document;
    const nextOutcomes = [...(c?.outcomes || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setCourse(c);
    setDoc(d);
    setTitle(d.doc_title || 'Cognitive level mapping of CO to the assessment tool');
    setSemesterLabel(d.semester_label || `${c.semester === 'EVEN' ? 'EVEN' : 'ODD'} Semester`);
    setModuleCoordinator(d.module_coordinator || '');
    setTools(normalizeTools(d.tools, c, nextOutcomes));
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load assessment tool.'));
  }, [id]);

  function patchTool(ti, partial) {
    setTools((prev) => prev.map((t, i) => (i === ti ? { ...t, ...partial } : t)));
  }

  function patchQuestion(ti, qi, partial) {
    setTools((prev) => prev.map((t, i) => {
      if (i !== ti) return t;
      const questions = t.questions.map((q, j) => (j === qi ? { ...q, ...partial } : q));
      return { ...t, questions };
    }));
  }

  function onCoChange(ti, qi, coCode) {
    const co = outcomes.find((o) => o.co_code === coCode);
    patchQuestion(ti, qi, { co_code: coCode, ques_level: co?.cognitive_level || '' });
  }

  function addQuestion(ti) {
    setTools((prev) => prev.map((t, i) => {
      if (i !== ti) return t;
      return { ...t, questions: [...t.questions, emptyQuestion(outcomes, t.questions.length)] };
    }));
  }

  function removeQuestion(ti, qi) {
    setTools((prev) => prev.map((t, i) => {
      if (i !== ti) return t;
      return { ...t, questions: t.questions.filter((_, j) => j !== qi) };
    }));
  }

  function addTool() {
    setTools((prev) => [...prev, { name: `Tool ${prev.length + 1}`, questions: [emptyQuestion(outcomes, 0)] }]);
  }

  function removeTool(ti) {
    setTools((prev) => prev.filter((_, i) => i !== ti));
  }

  async function save() {
    setError('');
    setStatus('');
    setSaving(true);
    try {
      const res = await api.patch(`/assessment-tools/${id}/`, {
        doc_title: title,
        semester_label: semesterLabel,
        module_coordinator: moduleCoordinator,
        tools,
      });
      setDoc(res.data.document);
      setStatus('Assessment Tool saved.');
    } catch (err) {
      const data = err.response?.data;
      setError(typeof data === 'string' ? data : JSON.stringify(data || 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  if (!course || !doc) return <div className="p-8">Loading…</div>;

  const coordinator = coordinatorName(course);
  const facultyPerson = teachingFacultyName(course);
  const ay = course.academic_year || '';
  const semWord = course.semester === 'EVEN' ? 'EVEN' : 'ODD';
  const td = 'border border-slate-800 px-2 py-1';
  const th = 'border border-slate-800 px-2 py-1 bg-slate-100 font-semibold text-center';

  return (
    <div className="p-8 max-w-6xl mx-auto print:p-0 print:max-w-none">
      <div className="no-print">
        <Link to={coursesListPath(course)} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to {coursesListLabel(course)}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">
          {course.course_code} — {course.course_name}
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          Session {course.session_label || course.academic_year}
          {` · Faculty: ${facultyPerson} · Coordinator: ${coordinator}`}
        </p>
        <CourseSubnav courseId={id} />

        {error && <div className="bg-red-50 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}
        {status && <div className="bg-emerald-50 text-emerald-800 text-sm rounded p-3 mb-4">{status}</div>}

        <div className="flex flex-wrap gap-2 justify-end mb-4">
          <button type="button" onClick={() => window.print()} className="bg-slate-200 px-4 py-2 rounded text-sm font-semibold">
            Print
          </button>
          <button type="button" disabled={saving} onClick={save} className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Assessment Tool'}
          </button>
        </div>

        <section className="bg-white shadow rounded-lg p-6 mb-6 space-y-4">
          <div>
            <input
              className="w-full border rounded px-3 py-2 text-sm font-semibold text-center"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-center text-sm font-semibold mt-2">{ay}{ay ? ', ' : ''}{semWord} Semester</p>
            <p className="text-center text-base font-bold mt-1">Assessment Tools for CO Attainment</p>
          </div>

          <div className="text-sm space-y-1">
            <p><b>Programme Name:</b> {course.program_name || '—'}</p>
            <label className="flex items-center gap-2">
              <b className="shrink-0">Semester:</b>
              <input className="border rounded px-2 py-1 text-sm flex-1" value={semesterLabel}
                onChange={(e) => setSemesterLabel(e.target.value)} placeholder="e.g. 1st Semester" />
            </label>
            <p><b>Course Name &amp; Code:</b> {course.course_name} ({course.course_code})</p>
            <p><b>NBA Code:</b> {course.nba_code || '—'}</p>
            <p><b>Name of Course Coordinator:</b> {coordinator === '—' ? '' : coordinator}</p>
          </div>

          {!outcomes.length && (
            <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">
              Add COs and cognitive levels on the Course Description tab first. Dropdowns are filled from there.
            </p>
          )}

          <div className="overflow-auto">
            <table className="w-full text-sm border-collapse min-w-[760px]">
              <thead>
                <tr>
                  <th className={th}>Assessment Tool</th>
                  <th className={`${th} w-[12%]`}>Question No.</th>
                  <th className={th}>CO Cognitive Level</th>
                  <th className={th}>Cognitive Level of the Question</th>
                  <th className={th}>Remarks</th>
                  <th className={`${th} w-10 no-print`}></th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool, ti) => (
                  (tool.questions.length ? tool.questions : [{ qno: '', co_code: '', ques_level: '', remarks: '' }]).map((q, qi) => (
                    <tr key={`${ti}-${qi}`}>
                      {qi === 0 && (
                        <td className={`${td} align-top bg-slate-50`} rowSpan={Math.max(tool.questions.length, 1)}>
                          <input className="w-full border rounded px-2 py-1 text-sm font-semibold text-center"
                            value={tool.name}
                            onChange={(e) => patchTool(ti, { name: e.target.value })} />
                          <button type="button" className="text-[11px] font-semibold text-blue-800 mt-2 block mx-auto"
                            onClick={() => addQuestion(ti)}>+ Add question</button>
                          <button type="button" className="text-[11px] text-red-600 mt-1 block mx-auto"
                            onClick={() => removeTool(ti)}>Remove tool</button>
                        </td>
                      )}
                      <td className={td}>
                        <input className="w-full border rounded px-2 py-1 text-sm text-center" value={q.qno}
                          onChange={(e) => patchQuestion(ti, qi, { qno: e.target.value })} />
                      </td>
                      <td className={td}>
                        <select className="w-full border rounded px-2 py-1 text-sm" value={q.co_code}
                          onChange={(e) => onCoChange(ti, qi, e.target.value)}>
                          <option value="">Select CO</option>
                          {outcomes.map((co) => (
                            <option key={co.id || co.co_code} value={co.co_code}>
                              {coLevelText(outcomes, co.co_code)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={td}>
                        <select className="w-full border rounded px-2 py-1 text-sm" value={q.ques_level}
                          onChange={(e) => patchQuestion(ti, qi, { ques_level: e.target.value })}>
                          <option value="">Select level</option>
                          {(dropdownLevels.includes(q.ques_level) || !q.ques_level
                            ? dropdownLevels
                            : [...dropdownLevels, q.ques_level]
                          ).map((lvl) => (
                            <option key={lvl} value={lvl}>{LEVEL_SHORT[lvl] || LEVEL_LABELS[lvl] || lvl}</option>
                          ))}
                        </select>
                      </td>
                      <td className={td}>
                        <input className="w-full border rounded px-2 py-1 text-sm" value={q.remarks}
                          onChange={(e) => patchQuestion(ti, qi, { remarks: e.target.value })} />
                      </td>
                      <td className={`${td} text-center no-print`}>
                        <button type="button" className="text-red-600" onClick={() => removeQuestion(ti, qi)}>✕</button>
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="text-xs font-semibold" onClick={addTool}>+ Add assessment tool</button>

          <div className="flex justify-between text-sm pt-2">
            <span><b>Course Coordinator:</b> {coordinator === '—' ? '' : coordinator}</span>
            <label className="flex items-center gap-2">
              <b>Module Coordinator:</b>
              <input className="border rounded px-2 py-1 text-sm w-48" value={moduleCoordinator}
                onChange={(e) => setModuleCoordinator(e.target.value)} />
            </label>
          </div>
        </section>
      </div>

      <A4Document
        sheetClass="or-doc"
        revision={`${title}-${semesterLabel}-${moduleCoordinator}-${JSON.stringify(tools)}-${outcomes.length}`}
      >
        <p className="or-dept">{title}</p>
        <p className="or-ay">{ay}{ay ? ', ' : ''}{semWord} Semester</p>
        <p className="or-title">Assessment Tools for CO Attainment</p>
        <div className="or-meta">
          <p><b>Programme Name:</b> {course.program_name || '—'}</p>
          <p><b>Semester:</b> {semesterLabel || `${semWord} Semester`}</p>
          <p><b>Course Name &amp; Code:</b> {course.course_name} ({course.course_code})</p>
          <p><b>NBA Code:</b> {course.nba_code || '—'}</p>
          <p><b>Name of Course Coordinator:</b> {coordinator === '—' ? '' : coordinator}</p>
        </div>
        <table className="at-map-table">
          <thead>
            <tr>
              <th>Assessment Tool</th>
              <th>Question No.</th>
              <th>CO Cognitive Level</th>
              <th>Cognitive Level of the Question</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool, ti) => (
              (tool.questions.length ? tool.questions : [{ qno: '', co_code: '', ques_level: '', remarks: '' }]).map((q, qi) => (
                <tr key={`p-${ti}-${qi}`}>
                  {qi === 0 && (
                    <td className="at-tool" rowSpan={Math.max(tool.questions.length, 1)}>{tool.name}</td>
                  )}
                  <td className="text-center">{q.qno}</td>
                  <td>{coLevelText(outcomes, q.co_code)}</td>
                  <td className="text-center">{LEVEL_SHORT[q.ques_level] || LEVEL_LABELS[q.ques_level] || q.ques_level}</td>
                  <td>{q.remarks}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
        <div className="at-sign">
          <span>Course Coordinator: {coordinator === '—' ? '' : coordinator}</span>
          <span>Module Coordinator: {moduleCoordinator}</span>
        </div>
      </A4Document>
    </div>
  );
}
