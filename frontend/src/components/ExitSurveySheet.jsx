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
    { wch: 28 }, // Email Address
    { wch: 10 }, // Class
    { wch: 24 }, // Name
    { wch: 18 }, // Enrollment Number
    ...questions.map(() => ({ wch: 42 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Exit Survey');
  const code = course?.course_code || 'Course';
  XLSX.writeFile(wb, `Exit_Survey_${code}.xlsx`);
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

  const stats = useMemo(() => {
    return questions.map((q, idx) => {
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
      const avg = count > 0 ? (sum / count).toFixed(2) : '—';
      const pct = count > 0 ? ((countAtTarget / count) * 100).toFixed(1) : '—';
      return { avg, pct, count, countAtTarget };
    });
  }, [questions, students, marksGrid]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Actions */}
      <div className="bg-white shadow rounded-lg p-6 no-print">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Exit Survey (Indirect Assessment)</h2>
            <p className="text-xs text-slate-500">
              Student ratings from 1 to 5. All students are populated from the course roster. You can edit cells directly or upload an Excel file.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportExitSurveyExcel({ course, students, block, marksGrid, outcomes })}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded text-xs font-semibold"
              title="Download Excel sheet with exact template and roster students"
            >
              Download Template (Excel)
            </button>
            <label className={`bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
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
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !students.length}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Exit Survey'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded text-xs font-semibold"
            >
              Print
            </button>
          </div>
        </div>

        {/* Rating Rubric Guide */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="flex items-center gap-1.5"><span className="font-bold text-slate-900">5:</span><span>To a great extent</span></div>
          <div className="flex items-center gap-1.5"><span className="font-bold text-slate-900">4:</span><span>To a moderate extent</span></div>
          <div className="flex items-center gap-1.5"><span className="font-bold text-slate-900">3:</span><span>To some extent</span></div>
          <div className="flex items-center gap-1.5"><span className="font-bold text-slate-900">2:</span><span>To less extent</span></div>
          <div className="flex items-center gap-1.5"><span className="font-bold text-slate-900">1:</span><span>Not at all</span></div>
        </div>
      </div>

      {/* Printable Sheet View Matching the User Images */}
      <div className="bg-white shadow rounded-lg p-6 overflow-x-auto print:shadow-none print:p-0">
        {/* Document Header (Matches Image 1) */}
        <div className="border border-slate-400 bg-white p-4 mb-4">
          <h2 className="text-center font-bold text-base uppercase tracking-wider text-slate-900 mb-3">
            {course?.institute || 'JAYPEE INSTITUTE OF INFORMATION TECHNOLOGY'}
          </h2>
          <div className="flex flex-wrap justify-between items-start text-xs font-semibold text-slate-800 leading-relaxed">
            <div className="space-y-1">
              <p>Academic Year : {ay} ({sem} Semester)</p>
              <p>Semester/Branch: {semBranch}</p>
              <p>Course Name and Code: {course?.course_name || ''} ({course?.course_code || ''})</p>
              <p>NBA Code: {course?.nba_code || '—'}</p>
              <p>Course Coordinator: {coordinator === '—' ? '' : coordinator}</p>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-slate-900 border-b-2 border-slate-900 pb-0.5 inline-block">
                Exit survey Form
              </span>
            </div>
          </div>
        </div>

        {/* Empty state warning if no students */}
        {students.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-dashed rounded text-sm text-slate-500">
            No students found on the roster. Add students on the Roster tab first or upload an Excel file.
          </div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            No Course Outcomes found for this course. Please define Course Outcomes on the Course Description tab.
          </div>
        ) : (
          <table className="w-full border-collapse border border-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-semibold">
                <th className="border border-slate-800 p-2 text-left min-w-[200px]">Email Address</th>
                <th className="border border-slate-800 p-2 text-center w-16">Class</th>
                <th className="border border-slate-800 p-2 text-left min-w-[160px]">Name</th>
                <th className="border border-slate-800 p-2 text-center min-w-[120px]">Enrollment Number</th>
                {questions.map((q, idx) => {
                  const co = (outcomes || []).find((o) => Number(o.id) === Number(q.course_outcome)) || outcomes?.[idx];
                  return (
                    <th key={q.id || q.key} className="border border-slate-800 p-2 text-left font-normal min-w-[260px] max-w-[320px] bg-slate-50">
                      <div className="text-[11px] leading-tight text-slate-800">
                        {formatExitSurveyRubric(co, course, idx)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {students.map((s, sIdx) => {
                const email = `${s.roll_number}@mail.jiit.ac.in`;
                return (
                  <tr key={s.id || s.roll_number} className={sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="border border-slate-800 px-2 py-1.5 text-slate-700">
                      {email}
                    </td>
                    <td className="border border-slate-800 p-1 text-center">
                      <input
                        type="text"
                        value={s.batch || ''}
                        onChange={(e) => onStudentBatchChange && onStudentBatchChange(s.id, e.target.value)}
                        placeholder="—"
                        className="w-12 text-center font-medium bg-transparent focus:bg-white focus:outline-blue-500 rounded"
                        title="Class / Batch (e.g. C1, C2)"
                      />
                    </td>
                    <td className="border border-slate-800 px-2 py-1.5 font-semibold text-slate-900">
                      {s.name}
                    </td>
                    <td className="border border-slate-800 px-2 py-1.5 text-center font-mono font-medium text-slate-900">
                      {s.roll_number}
                    </td>
                    {questions.map((q) => {
                      const val = marksGrid[`${s.id}-${q.id}`] ?? '';
                      return (
                        <td key={q.id || q.key} className="border border-slate-800 p-1 text-center">
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="1"
                            value={val}
                            onChange={(e) => onMarkChange(s.id, q.id, e.target.value)}
                            className="w-12 text-center py-1 font-bold text-slate-900 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500 border border-transparent hover:border-slate-300 focus:border-blue-500 rounded"
                            placeholder="—"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Summary Stats Row */}
              <tr className="bg-slate-200 font-bold border-t-2 border-slate-800 text-slate-900">
                <td colSpan={4} className="border border-slate-800 p-2 text-right">
                  Average Rating / Score:
                </td>
                {stats.map((st, i) => (
                  <td key={`avg-${i}`} className="border border-slate-800 p-2 text-center text-slate-900 font-bold">
                    {st.avg}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-100 font-semibold text-slate-800">
                <td colSpan={4} className="border border-slate-800 p-2 text-right">
                  % Students ≥ 3 (To some extent or above):
                </td>
                {stats.map((st, i) => (
                  <td key={`pct-${i}`} className="border border-slate-800 p-2 text-center text-slate-900 font-bold">
                    {st.pct !== '—' ? `${st.pct}%` : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
