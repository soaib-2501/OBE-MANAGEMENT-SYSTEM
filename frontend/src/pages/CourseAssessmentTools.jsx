import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import CourseSubnav from '../components/CourseSubnav';
import { coordinatorName, coursesListLabel, coursesListPath, teachingFacultyName } from '../utils/offering';
import A4Document from '../components/A4Document';

function rowsFrom(doc, outcomes) {
  const saved = {};
  (doc?.tools || []).forEach((row) => {
    if (row?.co_code) saved[row.co_code] = row;
  });
  return outcomes.map((co) => ({
    co_code: co.co_code,
    description: co.description || '',
    direct: saved[co.co_code]?.direct ?? '',
    indirect: saved[co.co_code]?.indirect ?? 'Course Exit Survey',
  }));
}

export default function CourseAssessmentTools() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [doc, setDoc] = useState(null);
  const [rows, setRows] = useState([]);
  const [title, setTitle] = useState('');
  const [heading, setHeading] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api.get(`/assessment-tools/${id}/`);
    const c = res.data.course;
    const d = res.data.document;
    const outcomes = [...(c?.outcomes || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setCourse(c);
    setDoc(d);
    setTitle(d.doc_title || '');
    setHeading(d.sub_heading || '');
    setRows(rowsFrom(d, outcomes));
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load attainment sheet.'));
  }, [id]);

  const outcomes = useMemo(
    () => [...(course?.outcomes || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [course],
  );

  function updateRow(index, field, value) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  async function save() {
    setError('');
    setStatus('');
    setSaving(true);
    try {
      const res = await api.patch(`/assessment-tools/${id}/`, {
        doc_title: title,
        sub_heading: heading,
        tools: rows.map((row) => ({
          co_code: row.co_code,
          direct: row.direct,
          indirect: row.indirect,
        })),
      });
      setDoc(res.data.document);
      setStatus('Attainment Sheet saved.');
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
  const td = 'border border-slate-800 px-2 py-1';
  const th = 'border border-slate-800 px-2 py-1 bg-slate-50';

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
            {saving ? 'Saving…' : 'Save Attainment Sheet'}
          </button>
        </div>

        <section className="bg-white shadow rounded-lg p-6 mb-6 space-y-6">
          <section className="border-b pb-4">
            <h3 className="font-semibold mb-2">Heading</h3>
            <label className="block mb-2">
              <span className="text-xs text-slate-600">Title</span>
              <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={title}
                onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Course Name and Code</span>
              <input className="w-full border rounded px-2 py-1.5 mt-0.5" value={heading}
                onChange={(e) => setHeading(e.target.value)} />
            </label>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Assessment Tools</h3>
            <p className="text-xs text-slate-500 mb-3">CO text comes from Course Description. Edit only Direct and Indirect tools.</p>
            {rows.map((row, idx) => (
              <div key={row.co_code || idx} className="border rounded p-3 mb-3 bg-slate-50 space-y-2">
                <p className="text-sm font-semibold">{row.co_code}</p>
                <p className="text-xs text-slate-600">{row.description || '—'}</p>
                <label className="block">
                  <span className="text-xs text-slate-600">Direct Assessment Tools (80%)</span>
                  <input className="w-full border rounded px-2 py-1.5 mt-0.5 bg-white" value={row.direct}
                    onChange={(e) => updateRow(idx, 'direct', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-600">In-Direct Assessment Tools (20%)</span>
                  <input className="w-full border rounded px-2 py-1.5 mt-0.5 bg-white" value={row.indirect}
                    onChange={(e) => updateRow(idx, 'indirect', e.target.value)} />
                </label>
              </div>
            ))}
            {!rows.length && (
              <p className="text-sm text-slate-500">Add course outcomes on the Course Description tab first.</p>
            )}
          </section>
        </section>
      </div>

      <A4Document
        sheetClass="or-doc"
        revision={`${title}-${heading}-${JSON.stringify(rows)}-${outcomes.length}`}
      >
        <p className="at-title">{title}</p>
        <table className="at-table">
          <thead>
            <tr>
              <th className={`${th} at-course`} colSpan={4}>{heading}</th>
            </tr>
            <tr>
              <th className={`${th} w-[12%]`}></th>
              <th className={th}>CourseOutcome</th>
              <th className={`${th} w-[22%]`}>Direct Assessment<br />Tools (80%)</th>
              <th className={`${th} w-[20%]`}>In-Direct<br />Assessment<br />Tools (20%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.co_code}>
                <td className={`${td} font-semibold text-center`}>{row.co_code}</td>
                <td className={`${td} text-center`}>{row.description}</td>
                <td className={`${td} text-center whitespace-pre-line`}>{row.direct}</td>
                <td className={`${td} text-center whitespace-pre-line`}>{row.indirect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </A4Document>
    </div>
  );
}
