import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { coordinatorName, teachingFacultyName } from '../utils/offering';
import {
  catalogEntryMatchingProgramme,
  departmentFromProgramme,
  programmeCounts,
  programmesForCatalogChoice,
} from '../utils/programmeMatch';

const emptyForm = {
  academic_session: '',
  catalog_entry: '',
  teaching_faculty: '',
  course_coordinator: '',
  faculty: '',
  programme: '',
  program_name: '',
  department: '',
  credits: 3,
  po_count: 3,
  pso_count: 2,
};

export default function Courses({ courseKind = 'THEORY' }) {
  const isLab = courseKind === 'LAB';
  const pageTitle = isLab ? 'Lab Courses' : 'Courses';
  const newLabel = isLab ? '+ New Lab Course' : '+ New Course';
  const formTitleNew = isLab ? 'New Lab Course' : 'New course';
  const formTitleEdit = isLab ? 'Edit lab course' : 'Edit course';
  const createLabel = isLab ? 'Create Lab Course' : 'Create Course';
  const updateLabel = isLab ? 'Update Lab Course' : 'Update Course';

  const { isAdmin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loginFaculty, setLoginFaculty] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [sessionFilter, setSessionFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  function load() {
    api.get(`/courses/?course_kind=${courseKind}`).then((res) => setCourses(res.data.results ?? res.data));
    api.get('/courses/sessions/').then((res) => setSessions(res.data.results ?? res.data)).catch(() => {});
    api.get('/courses/faculty-directory/?active=1').then((res) => setDirectory(res.data.results ?? res.data)).catch(() => {});
    api.get('/programs/').then((res) => setProgrammes(res.data.results ?? res.data)).catch(() => setProgrammes([]));
    if (isAdmin) {
      api.get('/auth/users/?role=FACULTY').then((res) => setLoginFaculty(res.data.results ?? res.data));
    }
  }

  useEffect(load, [isAdmin, courseKind]);

  useEffect(() => {
    if (!form.academic_session) {
      setCatalog([]);
      return;
    }
    api.get(`/courses/catalog/?session=${form.academic_session}&kind=${courseKind}`)
      .then((res) => setCatalog(res.data.results ?? res.data))
      .catch(() => setCatalog([]));
  }, [form.academic_session, courseKind]);

  useEffect(() => {
    if (editingId || !showForm || !form.catalog_entry || !programmes.length || !catalog.length) return;
    setForm((prev) => {
      if (prev.programme) return prev;
      const next = formFromNba(prev, prev.catalog_entry);
      if (
        next.programme === prev.programme
        && next.program_name === prev.program_name
        && next.po_count === prev.po_count
        && next.pso_count === prev.pso_count
      ) {
        return prev;
      }
      return next;
    });
  }, [programmes, catalog, showForm, editingId, form.catalog_entry]);

  const selected = catalog.find((c) => String(c.id) === String(form.catalog_entry));
  const filterSessions = [...new Set(courses.map((c) => c.session_label || c.academic_year).filter(Boolean))];
  const visible = sessionFilter
    ? courses.filter((c) => (c.session_label || c.academic_year) === sessionFilter)
    : courses;

  const directoryByCampus = useMemo(() => {
    const order = ['SECTOR_62', 'SECTOR_128', 'UNKNOWN'];
    const labels = { SECTOR_62: 'Sector-62', SECTOR_128: 'Sector-128', UNKNOWN: 'Other' };
    return order
      .map((campus) => ({ campus, label: labels[campus], rows: directory.filter((f) => f.campus === campus) }))
      .filter((g) => g.rows.length);
  }, [directory]);

  const programmeMatches = useMemo(
    () => programmesForCatalogChoice(selected, catalog, programmes),
    [selected, catalog, programmes],
  );

  function formFromNba(prev, entryId) {
    const row = catalog.find((c) => String(c.id) === String(entryId));
    const matches = programmesForCatalogChoice(row, catalog, programmes);
    let programmeId = prev.programme;
    if (matches.length === 1) programmeId = String(matches[0].id);
    else if (matches.length > 1) {
      if (!matches.some((p) => String(p.id) === String(programmeId))) programmeId = '';
    } else {
      programmeId = '';
    }
    const chosen = matches.find((p) => String(p.id) === String(programmeId));
    return applyProgrammeChoice(prev, chosen, entryId);
  }

  function applyProgrammeChoice(prev, chosen, entryId) {
    const current = catalog.find((c) => String(c.id) === String(entryId || prev.catalog_entry));
    const matched = catalogEntryMatchingProgramme(chosen, current, catalog);
    const next = {
      ...prev,
      catalog_entry: matched ? String(matched.id) : (entryId || prev.catalog_entry),
      programme: chosen ? String(chosen.id) : '',
    };
    if (chosen) {
      const counts = programmeCounts(chosen);
      next.program_name = chosen.name;
      next.department = departmentFromProgramme(chosen);
      next.po_count = counts.po_count ?? prev.po_count;
      next.pso_count = counts.pso_count ?? prev.pso_count;
    } else {
      next.program_name = current?.program_name || '';
      next.department = prev.department || '';
    }
    return next;
  }

  function pickProgramme(programmeId) {
    const chosen = programmes.find((p) => String(p.id) === String(programmeId));
    setForm((prev) => applyProgrammeChoice(prev, chosen, prev.catalog_entry));
  }

  function sameSession(course) {
    if (form.academic_session && course.academic_session
      && String(course.academic_session) === String(form.academic_session)) {
      return true;
    }
    const sess = sessions.find((s) => String(s.id) === String(form.academic_session));
    return Boolean(sess && (course.session_label === sess.label || course.academic_year === sess.label));
  }

  function findExistingOffering() {
    const row = catalog.find((c) => String(c.id) === String(form.catalog_entry));
    const code = row?.course_code;
    return courses.find((c) => {
      if (isAdmin) {
        const owner = form.faculty ? String(form.faculty) : '';
        const courseOwner = c.faculty ? String(c.faculty) : '';
        if (owner !== courseOwner) return false;
      }
      if (!sameSession(c)) return false;
      const sameSubject = (
        (form.catalog_entry && String(c.catalog_entry) === String(form.catalog_entry))
        || (code && c.course_code === code)
      );
      if (!sameSubject) return false;
      if (!form.programme) return true;
      if (!c.programme) return true;
      return String(c.programme) === String(form.programme);
    });
  }

  function formatApiError(err, fallback) {
    const data = err.response?.data;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data.filter(Boolean).join(' ');
    if (data.detail) return String(data.detail);
    if (data.non_field_errors) return [].concat(data.non_field_errors).join(' ');
    try {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${[].concat(value).join(' ')}`)
        .join(' ');
    } catch {
      return fallback;
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  function startEdit(c, e) {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(c.id);
    setShowForm(true);
    setError('');
    setForm({
      academic_session: c.academic_session || '',
      catalog_entry: c.catalog_entry || '',
      teaching_faculty: c.teaching_faculty || '',
      course_coordinator: c.course_coordinator || '',
      faculty: c.faculty ?? '',
      programme: c.programme ?? '',
      program_name: c.program_name || '',
      department: c.department || '',
      credits: c.credits ?? 3,
      po_count: c.po_count ?? 3,
      pso_count: c.pso_count ?? 2,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (programmeMatches.length > 1 && !form.programme) {
      setError('This NBA subject is used by more than one programme. Choose CSE or IT (or the matching programme) before saving.');
      return;
    }
    const payload = {
      course_kind: courseKind,
      catalog_entry: form.catalog_entry ? Number(form.catalog_entry) : null,
      academic_session: form.academic_session ? Number(form.academic_session) : null,
      teaching_faculty: form.teaching_faculty ? Number(form.teaching_faculty) : null,
      course_coordinator: form.course_coordinator ? Number(form.course_coordinator) : null,
      credits: Number(form.credits) || 3,
      po_count: Number(form.po_count) || 3,
      pso_count: Number(form.pso_count) || 0,
      programme: form.programme ? Number(form.programme) : null,
      program_name: form.program_name || undefined,
      department: form.department || undefined,
    };
    if (isAdmin) {
      payload.faculty = form.faculty ? Number(form.faculty) : null;
    }
    try {
      const existing = !editingId ? findExistingOffering() : null;
      const targetId = editingId || existing?.id;
      if (targetId) {
        await api.patch(`/courses/${targetId}/`, payload);
      } else {
        await api.post('/courses/', { ...payload, outcomes: [] });
      }
      resetForm();
      load();
    } catch (err) {
      setError(formatApiError(err, 'Failed to save course'));
    }
  }

  async function deleteCourse(c, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete ${c.course_code} — ${c.course_name}? Students, marks, and mapping will also be removed.`)) return;
    setError('');
    try {
      await api.delete(`/courses/${c.id}/`);
      if (editingId === c.id) resetForm();
      load();
    } catch (err) {
      setError(formatApiError(err, 'Failed to delete course'));
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
          {filterSessions.length > 0 && (
            <select className="border rounded px-2 py-1.5 text-sm" value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}>
              <option value="">All sessions</option>
              {filterSessions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
        <button
          onClick={() => { if (showForm) resetForm(); else { setShowForm(true); setEditingId(null); setForm(emptyForm); } }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm font-semibold"
        >
          {showForm ? 'Cancel' : newLabel}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 mb-6 grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 bg-red-50 text-red-700 text-xs rounded p-2">{error}</div>}
          <p className="col-span-2 text-sm font-semibold text-slate-700">
            {editingId ? formTitleEdit : formTitleNew}
          </p>
          <label className="block text-sm col-span-2">
            <span className="block text-xs font-medium text-slate-600 mb-1">Session</span>
            <select className="w-full border rounded px-3 py-2 text-sm" required value={form.academic_session}
              onChange={(e) => setForm({
                ...form,
                academic_session: e.target.value,
                catalog_entry: '',
                programme: '',
                program_name: '',
                department: '',
              })}>
              <option value="">Select 2026 Odd / 2026 Even …</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="block text-sm col-span-2">
            <span className="block text-xs font-medium text-slate-600 mb-1">NBA code / subject</span>
            <select className="w-full border rounded px-3 py-2 text-sm" required value={form.catalog_entry}
              onChange={(e) => setForm((prev) => formFromNba(prev, e.target.value))}>
              <option value="">{isLab ? 'Select lab NBA subject' : 'Select NBA subject'}</option>
              {catalog.map((row) => (
                <option key={row.id} value={row.id}>{row.label}</option>
              ))}
            </select>
          </label>
          {selected && (
            <div className="col-span-2 grid grid-cols-2 gap-2 text-sm bg-slate-50 border rounded p-3">
              <p>
                <span className="text-slate-500">Program:</span>{' '}
                {form.program_name || selected.program_name}
              </p>
              <p><span className="text-slate-500">NBA:</span> {selected.nba_code}</p>
              <p className="col-span-2"><span className="text-slate-500">Course:</span> {selected.course_name} ({selected.course_code})</p>
              <p><span className="text-slate-500">Year of study:</span> {selected.year_of_study}</p>
              <p><span className="text-slate-500">Semester no.:</span> {selected.semester_number}</p>
              {form.program_name && form.program_name !== selected.program_name && (
                <p className="col-span-2 text-xs text-slate-500">
                  NBA lists this subject as {selected.program_name}. Course documents will use {form.program_name}.
                </p>
              )}
            </div>
          )}
          {programmeMatches.length > 1 && (
            <div className="col-span-2 rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-950">This subject is listed for more than one programme.</p>
              <p className="text-xs text-amber-800 mt-1">
                Choose CSE or IT so the course program name, department, and PO/PSO counts fill from Programs. You can still edit the numbers after that.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {programmeMatches.map((p) => (
                  <label key={p.id} className={`text-sm border rounded px-3 py-1.5 cursor-pointer ${String(form.programme) === String(p.id) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>
                    <input type="radio" className="sr-only" name="programme" value={p.id}
                      checked={String(form.programme) === String(p.id)}
                      onChange={() => pickProgramme(p.id)} />
                    {p.name}
                  </label>
                ))}
              </div>
              {form.programme && (
                <p className="text-xs text-amber-900 mt-2">
                  Using {form.program_name}
                  {form.department ? ` · ${form.department}` : ''}
                  {' '}({form.po_count} POs, {form.pso_count} PSOs).
                </p>
              )}
            </div>
          )}
          {programmeMatches.length === 1 && (
            <p className="col-span-2 text-xs text-slate-500">
              PO/PSO counts filled from {programmeMatches[0].name}
              {' '}({programmeCounts(programmeMatches[0]).po_count} POs, {programmeCounts(programmeMatches[0]).pso_count} PSOs). You can edit them.
            </p>
          )}
          <label className="block text-sm">
            <span className="block text-xs font-medium text-slate-600 mb-1">Faculty name (on documents)</span>
            <select className="w-full border rounded px-3 py-2 text-sm" required value={form.teaching_faculty}
              onChange={(e) => setForm({ ...form, teaching_faculty: e.target.value })}>
              <option value="">Select faculty</option>
              {directoryByCampus.map((g) => (
                <optgroup key={g.campus} label={g.label}>
                  {g.rows.map((f) => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-slate-600 mb-1">Course coordinator</span>
            <select className="w-full border rounded px-3 py-2 text-sm" required value={form.course_coordinator}
              onChange={(e) => setForm({ ...form, course_coordinator: e.target.value })}>
              <option value="">Select coordinator</option>
              {directoryByCampus.map((g) => (
                <optgroup key={g.campus} label={g.label}>
                  {g.rows.map((f) => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-slate-600 mb-1">Credits</span>
            <input type="number" className="w-full border rounded px-3 py-2 text-sm"
              value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-slate-600 mb-1">Number of POs</span>
            <input type="number" min="1" max="15" className="w-full border rounded px-3 py-2 text-sm"
              value={form.po_count} onChange={(e) => setForm({ ...form, po_count: Number(e.target.value) })} />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-slate-600 mb-1">Number of PSOs</span>
            <input type="number" min="0" max="8" className="w-full border rounded px-3 py-2 text-sm"
              value={form.pso_count} onChange={(e) => setForm({ ...form, pso_count: Number(e.target.value) })} />
          </label>
          {isAdmin && (
            <label className="block text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">Login account (owner)</span>
              <select className="w-full border rounded px-3 py-2 text-sm" value={form.faculty}
                onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
                <option value="">Assign faculty login later</option>
                {loginFaculty.map((f) => (
                  <option key={f.id} value={f.id}>{f.first_name} {f.last_name} (@{f.username})</option>
                ))}
              </select>
            </label>
          )}
          <button type="submit" className="col-span-2 bg-slate-900 text-white py-2 rounded text-sm font-semibold">
            {editingId ? updateLabel : createLabel}
          </button>
        </form>
      )}

      {!showForm && error && <div className="bg-red-50 text-red-700 text-xs rounded p-2 mb-4">{error}</div>}

      <div className="bg-white shadow rounded-lg divide-y">
        {visible.length === 0 && (
          <p className="p-6 text-sm text-slate-400">
            {isLab ? 'No lab courses yet — create one above.' : 'No courses yet — create one above.'}
          </p>
        )}
        {visible.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4 hover:bg-slate-50 gap-3">
            <Link to={`/courses/${c.id}/description`} className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{c.course_code} — {c.course_name}</p>
              <p className="text-xs text-slate-500">
                {c.program_name ? `${c.program_name} · ` : ''}{c.session_label || c.academic_year}
                {c.nba_code ? ` · ${c.nba_code}` : ''}
                {` · Faculty: ${teachingFacultyName(c)} · Coordinator: ${coordinatorName(c)}`}
              </p>
            </Link>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-400">{c.outcomes?.length ?? 0} COs</span>
              <button type="button" onClick={(e) => startEdit(c, e)} className="text-xs text-slate-600 hover:underline">Edit</button>
              <button type="button" onClick={(e) => deleteCourse(c, e)} className="text-xs text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
