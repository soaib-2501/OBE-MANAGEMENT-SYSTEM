import React, { useMemo } from 'react';
import { coordinatorName } from '../utils/offering';
import { buildExamPreview } from '../utils/sheetExport';

function compactYear(year) {
  if (!year) return '';
  const m = String(year).match(/^(\d{4})\s*[-/]\s*(\d{2,4})$/);
  if (!m) return String(year);
  const end = m[2].length === 4 ? m[2].slice(-2) : m[2];
  return `${m[1]}-${end}`;
}

function fmt(n, digits = 1) {
  if (n === null || n === undefined || n === '') return '';
  const num = Number(n);
  if (Number.isNaN(num)) return '';
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(digits);
}

function shortCo(co) {
  const code = String(co?.co_code || '');
  const m = code.match(/(\d+)$/);
  return m ? `CO${Number(m[1])}` : code;
}

function questionGroup(q) {
  if (q?.group) return q.group;
  const key = String(q?.key || '');
  if (/^EVAL1/i.test(key)) return 'Eval1';
  if (/^EVAL2/i.test(key)) return 'Eval2';
  if (/^PBL/i.test(key)) return 'PBL';
  return '';
}

function groupSpans(questions) {
  const spans = [];
  (questions || []).forEach((q) => {
    const group = questionGroup(q);
    const last = spans[spans.length - 1];
    if (last && last.group === group) last.count += 1;
    else spans.push({ group, count: 1 });
  });
  return spans;
}

export default function LabSheetPreview({ course, students, block, marksGrid, outcomes, previewing, onToggle }) {
  const data = useMemo(
    () => buildExamPreview({ students, block, marksGrid, outcomes }),
    [students, block, marksGrid, outcomes],
  );
  const questions = block?.questions || [];
  const isD2d = block?.assessment_type === 'D2D';
  const examTitle = block?.exam_label || (isD2d ? 'D2D' : (block?.assessment_type === 'END' ? 'End Term' : 'Mid Term'));
  const totalMax = questions.reduce((s, q) => s + (Number(q.max_marks) || 0), 0) || 20;
  const labtestLabel = isD2d ? 'Total 20' : (block?.assessment_type === 'END' ? 'Labtest 2' : 'Labtest 1');
  const ay = compactYear(course.academic_year);
  const sem = course.semester === 'EVEN' ? 'EVEN' : 'ODD';
  const branch = course.program_name || course.department || '';
  const coordinator = coordinatorName(course);

  return (
    <section className="bg-white shadow rounded-lg p-4">
      <div className="no-print flex justify-end mb-3">
        <button type="button" onClick={onToggle} className="bg-slate-200 px-3 py-1.5 rounded text-xs font-semibold">
          {previewing ? 'Hide preview' : 'Preview template'}
        </button>
        {previewing && (
          <button type="button" onClick={() => window.print()} className="ml-2 bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-semibold">
            Print
          </button>
        )}
      </div>
      {previewing && (
        <div className="lab-sheet overflow-auto">
          <div className="lab-sheet-head">
            <p className="lab-inst">{course.institute || 'JAYPEE INSTITUTE OF INFORMATION TECHNOLOGY'}</p>
            <div className="lab-head-row">
              <div>
                <p>Academic Year : {ay || course.academic_year} ({sem} Semester)</p>
                <p>Semester/Branch: {branch}</p>
                <p>Course Name and Code: {course.course_name} ({course.course_code})</p>
                <p>NBA Code: {course.nba_code || ''}</p>
                <p>Course Coordinator: {coordinator === '—' ? '' : coordinator}</p>
              </div>
              <p className="lab-exam-title">{examTitle}</p>
            </div>
          </div>
          <table className="lab-sheet-table">
            <thead>
              <tr>
                <th colSpan={4}></th>
                {isD2d
                  ? groupSpans(questions).map((span, i) => (
                    <th key={`g-${i}`} colSpan={span.count}>{span.group}</th>
                  ))
                  : questions.map((q) => {
                    const co = (outcomes || []).find((o) => Number(o.id) === Number(q.course_outcome));
                    return <th key={`co-${q.id || q.key}`}>{co ? `[${shortCo(co)}]` : ''}</th>;
                  })}
                <th>{isD2d ? '' : labtestLabel}</th>
                {(data.cos || []).map((co) => (
                  <th key={`att-${co.id}`}>Attainment %</th>
                ))}
              </tr>
              <tr>
                <th>Sno</th>
                <th>Rollno</th>
                <th>Name</th>
                <th>Batch</th>
                {questions.map((q) => (
                  <th key={q.id || q.key}>{q.label}</th>
                ))}
                <th>{isD2d ? labtestLabel : `Total ${totalMax}`}</th>
                {(data.cos || []).map((co) => (
                  <th key={`h-${co.id}`}>{shortCo(co)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.rows || []).map((r, i) => {
                const st = students[i];
                return (
                  <tr key={r.enrol || i}>
                    <td>{r.sno}</td>
                    <td>{r.enrol}</td>
                    <td className="left">{r.name}</td>
                    <td>{st?.batch || ''}</td>
                    {questions.map((q) => (
                      <td key={q.id || q.key}>{r.marks[q.id] == null ? '' : fmt(r.marks[q.id], 1)}</td>
                    ))}
                    <td>{r.total == null ? '' : fmt(r.total, 1)}</td>
                    {(data.cos || []).map((co) => (
                      <td key={co.id}>{r.coPct[co.id] == null ? '' : fmt(r.coPct[co.id], 1)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
