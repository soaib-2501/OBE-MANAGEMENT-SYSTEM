import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { coordinatorName } from '../utils/offering';

function compactYear(year) {
  if (!year) return '';
  const m = String(year).match(/^(\d{4})\s*[-/]\s*(\d{2,4})$/);
  if (!m) return String(year);
  const end = m[2].length === 4 ? m[2].slice(-2) : m[2];
  return `${m[1]}-${end}`;
}

function shortCo(co, index) {
  const code = String(co?.co_code || '');
  const m = code.match(/(\d+)$/);
  if (m) return `CO${Number(m[1])}`;
  return code || `CO${index + 1}`;
}

export function formatExitSurveyRubric(co, course, index) {
  let code = '';
  if (co?.co_code && !/^CO\d+$/i.test(co.co_code)) {
    code = co.co_code;
  } else if (course?.nba_code) {
    code = `${course.nba_code}.${index + 1}`;
  } else {
    code = co?.co_code || `CO${index + 1}`;
  }
  const desc = (co?.description || '').trim();
  return `Fill the grid : 5 represents "to a great extent" 4 represents "to a moderate extent" 3 represents "to some extent" 2 represents "to less extent" 1 represents "not at all" [${code}${desc ? ` ${desc}` : ''}]`;
}

export function exportExitSurveyExcel({ course, students, block, marksGrid, outcomes }) {
  const questions = block?.questions || [];
  const ay = compactYear(course?.academic_year) || course?.academic_year || '2024-25';
  const sem = course?.semester === 'EVEN' ? 'EVEN' : 'ODD';
  const branch = course?.program_name || course?.department || '';
  const semBranch = `${course?.semester_label || `${course?.semester_number || 2} Sem`}/${branch}`;
  const coordinator = coordinatorName(course);

  const coRubrics = questions.map((q, i) => {
    const co = (outcomes || []).find((o) => Number(o.id) === Number(q.course_outcome)) || outcomes?.[i];
    return formatExitSurveyRubric(co, course, i);
  });

  const headerRows = [
    [],
    ['', 'JAYPEE INSTITUTE OF INFORMATION TECHNOLOGY'],
    ['', `Academic Year : ${ay} (${sem} Semester)`],
    ['', `Semester/Branch: ${semBranch}`, '', '', '', '', '', '', 'Exit survey Form'],
    ['', `Course Name and Code:${course?.course_name || ''} (${course?.course_code || ''})`],
    ['', `NBA Code: ${course?.nba_code || ''}`],
    ['', `Course Coordinator: ${coordinator === '—' ? '' : coordinator}`],
    [],
    ['Email Address', 'Class', 'Name', 'Enrollment Number', ...coRubrics],
  ];

  const studentRows = (students || []).map((s) => {
    const email = `${s.roll_number}@mail.jiit.ac.in`;
    const batch = s.batch || '';
    const qMarks = questions.map((q) => {
      const v = marksGrid[`${s.id}-${q.id}`];
      return v == null || v === '' ? '' : Number(v);
    });
    return [email, batch, s.name, s.roll_number, ...qMarks];
  });

  const allRows = [...headerRows, ...studentRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  ws['!cols'] = [
    { wch: 28 },
    { wch: 10 },
    { wch: 24 },
    { wch: 18 },
    ...questions.map(() => ({ wch: 42 })),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Exit Survey');
  XLSX.writeFile(wb, `Exit_Survey_${course?.course_code || 'Course'}.xlsx`);
}

function HeaderBlock({ course, ay, sem, semBranch, coordinator }) {
  return (
    <div className="exit-head">
      <p className="exit-inst">{course?.institute || 'JAYPEE INSTITUTE OF INFORMATION TECHNOLOGY'}</p>
      <div className="exit-head-row">
        <div>
          <p>Academic Year : {ay} ({sem} Semester)</p>
          <p>Semester/Branch: {semBranch}</p>
          <p>Course Name and Code: {course?.course_name || ''} ({course?.course_code || ''})</p>
          <p>NBA Code: {course?.nba_code || '—'}</p>
          <p>Course Coordinator: {coordinator === '—' ? '' : coordinator}</p>
        </div>
        <p className="exit-form-title">Exit survey Form</p>
      </div>
    </div>
  );
}

export default function ExitSurveySheet({
  course,
  students,
  block,
  marksGrid,
  outcomes,
  onMarkChange,
  onStudentBatchChange,
  saving,
  uploading,
  onSave,
  onUploadExcel,
}) {
  const questions = block?.questions || [];
  const ay = compactYear(course?.academic_year) || course?.academic_year || '2024-25';
  const sem = course?.semester === 'EVEN' ? 'EVEN' : 'ODD';
  const branch = course?.program_name || course?.department || '';
  const semBranch = `${course?.semester_label || `${course?.semester_number || 2} Sem`}/${branch}`;
  const coordinator = coordinatorName(course);

  const coMeta = questions.map((q, idx) => {
    const co = (outcomes || []).find((o) => Number(o.id) === Number(q.course_outcome)) || outcomes?.[idx];
    return { q, co, idx, short: shortCo(co, idx), rubric: formatExitSurveyRubric(co, course, idx) };
  });

  const stats = useMemo(() => questions.map((q) => {
    let sum = 0;
    let count = 0;
    let countAtTarget = 0;
    (students || []).forEach((s) => {
      const raw = marksGrid[`${s.id}-${q.id}`];
      if (raw !== undefined && raw !== '' && !Number.isNaN(Number(raw))) {
        const num = Number(raw);
        sum += num;
        count += 1;
        if (num >= 3) countAtTarget += 1;
      }
    });
    return {
      avg: count > 0 ? (sum / count).toFixed(2) : '—',
      pct: count > 0 ? ((countAtTarget / count) * 100).toFixed(1) : '—',
    };
  }), [questions, students, marksGrid]);

  return (
    <div className="space-y-5">
      <div className="bg-white shadow rounded-lg p-5 no-print">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Exit Survey (Indirect Assessment)</h2>
            <p className="text-xs text-slate-500">
              Ratings 1–5. Roster names stay in order. Upload Excel with Email / Enrollment Number and CO columns — marks map by roll number.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportExitSurveyExcel({ course, students, block, marksGrid, outcomes })}
              className="bg-slate-200 px-3 py-1.5 rounded text-xs font-semibold"
            >
              Download Template (Excel)
            </button>
            <label className={`bg-slate-200 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <span>{uploading ? 'Uploading…' : 'Upload Excel'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={uploading || saving}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadExcel(f);
                  e.target.value = '';
                }}
              />
            </label>
            <button type="button" onClick={onSave} disabled={saving || !students.length}
              className="bg-slate-900 text-white px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Exit Survey'}
            </button>
            <button type="button" onClick={() => window.print()} className="bg-slate-200 px-3 py-1.5 rounded text-xs font-semibold">
              Print
            </button>
          </div>
        </div>
        <div className="bg-slate-50 border rounded p-2 text-[11px] text-slate-700 grid grid-cols-2 sm:grid-cols-5 gap-1">
          <span><b>5</b> To a great extent</span>
          <span><b>4</b> To a moderate extent</span>
          <span><b>3</b> To some extent</span>
          <span><b>2</b> To less extent</span>
          <span><b>1</b> Not at all</span>
        </div>
      </div>

      <section className="bg-white shadow rounded-lg p-5 no-print">
        <h3 className="font-semibold mb-2">Edit ratings</h3>
        {students.length === 0 ? (
          <p className="text-sm text-slate-500">Add students on the Roster tab first.</p>
        ) : questions.length === 0 ? (
          <p className="text-sm text-amber-700">Add course outcomes on Course Description first.</p>
        ) : (
          <>
            <div className="exit-co-legend mb-3">
              {coMeta.map((item) => (
                <p key={item.q.id || item.idx}><b>{item.short}</b> — {item.co?.description || item.rubric}</p>
              ))}
            </div>
            <div className="exit-edit-wrap">
              <table className="exit-edit-table">
                <thead>
                  <tr>
                    <th className="w-sno">Sno</th>
                    <th className="w-mail">Email Address</th>
                    <th className="w-class">Class</th>
                    <th className="w-name">Name</th>
                    <th className="w-enrol">Enrollment Number</th>
                    {coMeta.map((item) => (
                      <th key={item.q.id || item.idx}>{item.short}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td className="left wrap">{s.roll_number}@mail.jiit.ac.in</td>
                      <td>
                        <input
                          value={s.batch || ''}
                          onChange={(e) => onStudentBatchChange && onStudentBatchChange(s.id, e.target.value)}
                          className="exit-in"
                        />
                      </td>
                      <td className="left wrap">{s.name}</td>
                      <td>{s.roll_number}</td>
                      {questions.map((q) => (
                        <td key={q.id || q.key}>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="1"
                            value={marksGrid[`${s.id}-${q.id}`] ?? ''}
                            onChange={(e) => onMarkChange(s.id, q.id, e.target.value)}
                            className="exit-in"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="exit-sum">
                    <td colSpan={5} className="right">Average</td>
                    {stats.map((st, i) => <td key={`a-${i}`}>{st.avg}</td>)}
                  </tr>
                  <tr className="exit-sum">
                    <td colSpan={5} className="right">% ≥ 3</td>
                    {stats.map((st, i) => <td key={`p-${i}`}>{st.pct === '—' ? '—' : `${st.pct}%`}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="bg-white shadow rounded-lg p-5 print:shadow-none print:p-0">
        <h3 className="font-semibold mb-2 no-print">Preview</h3>
        <div className="exit-preview">
          <HeaderBlock course={course} ay={ay} sem={sem} semBranch={semBranch} coordinator={coordinator} />
          {students.length > 0 && questions.length > 0 && (
            <table className="exit-preview-table">
              <thead>
                <tr>
                  <th>Email Address</th>
                  <th>Class</th>
                  <th>Name</th>
                  <th>Enrollment Number</th>
                  {coMeta.map((item) => (
                    <th key={`p-${item.q.id || item.idx}`}>{item.rubric}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={`pv-${s.id}`}>
                    <td className="left wrap">{s.roll_number}@mail.jiit.ac.in</td>
                    <td>{s.batch || ''}</td>
                    <td className="left wrap">{s.name}</td>
                    <td>{s.roll_number}</td>
                    {questions.map((q) => (
                      <td key={q.id || q.key}>{marksGrid[`${s.id}-${q.id}`] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
