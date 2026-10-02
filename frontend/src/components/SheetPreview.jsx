import React, { useMemo, useRef } from 'react';
import { buildExamPreview, printCurrentSheet, saveCsv, saveNodeAsHtml } from '../utils/sheetExport';

function fmt(n, digits = 2) {
  if (n === null || n === undefined || n === '') return '';
  const num = Number(n);
  if (Number.isNaN(num)) return '';
  return num.toFixed(digits);
}

function Header({ course, examLabel }) {
  return (
    <div className="sheet-print-header">
      <p className="font-bold text-center text-sm uppercase">{course.institute || 'Institute'}</p>
      <p className="text-center text-[11px]">{course.session_label || course.academic_year} · {course.program_name || ''}</p>
      <p className="text-center font-semibold text-[12px] mt-1">{course.course_code} — {course.course_name}</p>
      {course.nba_code ? <p className="text-center text-[11px]">NBA Code: {course.nba_code}</p> : null}
      {examLabel ? <p className="text-center font-bold text-[13px] mt-2">{examLabel}</p> : null}
    </div>
  );
}

function LevelCell({ level }) {
  if (level === null || level === undefined || level === '') return null;
  const cls = ['co-l0', 'co-l1', 'co-l2', 'co-l3'][level] || 'co-l0';
  return <span className={`sheet-lvl ${cls}`}>{level}</span>;
}

function Actions({ previewing, onToggle, onPrint, onSaveHtml, onSaveCsv }) {
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button type="button" onClick={onToggle} className="bg-slate-200 px-3 py-1.5 rounded text-xs font-semibold">
        {previewing ? 'Hide preview' : 'Preview'}
      </button>
      <button type="button" onClick={onPrint} className="bg-slate-200 px-3 py-1.5 rounded text-xs font-semibold">
        Print
      </button>
      <button type="button" onClick={onSaveHtml} className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-semibold">
        Save sheet
      </button>
      <button type="button" onClick={onSaveCsv} className="border border-slate-300 px-3 py-1.5 rounded text-xs font-semibold">
        Save CSV
      </button>
    </div>
  );
}

function ExamBody({ course, data }) {
  return (
    <>
      <Header course={course} examLabel={data.examLabel} />
      <table className="sheet-print-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Enrol No</th>
            <th>Name</th>
            {data.questions.map((q) => (
              <th key={q.id || q.key}>{q.label} ({q.max_marks})</th>
            ))}
            <th>Total</th>
            {data.cos.map((co) => <th key={co.id}>{co.co_code} %</th>)}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.enrol}>
              <td>{r.sno}</td>
              <td>{r.enrol}</td>
              <td className="left">{r.name}</td>
              {data.questions.map((q) => (
                <td key={q.id || q.key}>{r.marks[q.id] == null ? '' : fmt(r.marks[q.id], 2)}</td>
              ))}
              <td>{r.total == null ? '' : fmt(r.total, 1)}</td>
              {data.cos.map((co) => (
                <td key={co.id}>{r.coPct[co.id] == null ? '' : fmt(r.coPct[co.id], 1)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <table className="sheet-print-table summary">
        <tbody>
          <tr>
            <td>Target %</td>
            {data.summary.map((s) => <td key={s.co.id}>&gt;= {data.target}%</td>)}
          </tr>
          <tr>
            <td>No. of Students Scored ≥ Target %</td>
            {data.summary.map((s) => <td key={s.co.id}>{s.countAtTarget}</td>)}
          </tr>
          <tr>
            <td>% of Students Scored ≥ Target %</td>
            {data.summary.map((s) => <td key={s.co.id}>{fmt(s.pctAtTarget, 1)}%</td>)}
          </tr>
          <tr>
            <td>CO Attainment Level</td>
            {data.summary.map((s) => <td key={s.co.id}><LevelCell level={s.level} /></td>)}
          </tr>
          <tr>
            <td>Total Students</td>
            {data.summary.map((s) => <td key={s.co.id}>{data.totalStudents}</td>)}
          </tr>
          <tr>
            <td>No. of Students Appeared</td>
            {data.summary.map((s) => <td key={s.co.id}>{data.appeared}</td>)}
          </tr>
        </tbody>
      </table>
    </>
  );
}

function AttainmentBody({ course, sheet }) {
  const poKeys = sheet?.po_keys || [];
  return (
    <>
      <Header course={course} examLabel="Average CO-Attainment" />
      <table className="sheet-print-table">
        <thead>
          <tr>
            {['COs', 'T1', 'T2', 'T3', 'T-AVG', 'Assgn/Project/CT (TA)', 'Direct (60% T-AVG + 20% Assgn)', 'Indirect (Feedback)', 'Final (Direct + 20% Indirect)', 'CIE', 'SIE'].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(sheet?.cos || []).map((row) => (
            <tr key={row.id}>
              <td className="font-semibold">{row.co_code}</td>
              <td><LevelCell level={row.t1_level} /></td>
              <td><LevelCell level={row.t2_level} /></td>
              <td><LevelCell level={row.t3_level} /></td>
              <td>{fmt(row.t_avg)}</td>
              <td><LevelCell level={row.ta_level} /></td>
              <td>{fmt(row.direct)}</td>
              <td><LevelCell level={row.indirect} /></td>
              <td className="font-bold">{fmt(row.final)}</td>
              <td>{fmt(row.cie)}</td>
              <td>{fmt(row.sie)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>CO-PO-PSO Mapping</h3>
      <table className="sheet-print-table">
        <thead>
          <tr>
            <th>COs</th>
            <th>CO Attainment</th>
            {poKeys.map((po) => <th key={po}>{po}</th>)}
          </tr>
        </thead>
        <tbody>
          {(sheet?.cos || []).map((row) => (
            <tr key={row.id}>
              <td className="font-semibold">{row.co_code}</td>
              <td>{fmt(row.final)}</td>
              {poKeys.map((po) => <td key={po}>{row.mappings?.[po] ?? ''}</td>)}
            </tr>
          ))}
          <tr>
            <td className="font-bold">{sheet?.nba_code || course.nba_code || course.course_code}</td>
            <td className="font-bold">Average</td>
            {poKeys.map((po) => <td key={po} className="font-bold">{fmt(sheet?.mapping_avg?.[po])}</td>)}
          </tr>
        </tbody>
      </table>
      <h3>PO-PSO Attainment</h3>
      <table className="sheet-print-table">
        <thead>
          <tr>
            <th>Course</th>
            {poKeys.map((po) => <th key={po}>{po}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-semibold">NBA Code: {sheet?.nba_code || course.nba_code || '—'}</td>
            {poKeys.map((po) => <td key={po} className="font-bold">{fmt(sheet?.po_attainment?.[po])}</td>)}
          </tr>
        </tbody>
      </table>
    </>
  );
}

function ResultBody({ course, sheet }) {
  return (
    <>
      <Header course={course} examLabel="Grade Distribution & Student-wise Result" />
      <h3>Grade Distribution</h3>
      <table className="sheet-print-table">
        <thead>
          <tr><th>Grade</th><th>No. of Students</th><th>% of Students</th></tr>
        </thead>
        <tbody>
          {(sheet?.grade_distribution || []).map((g) => (
            <tr key={g.grade}>
              <td>{g.grade}</td>
              <td>{g.count}</td>
              <td>{g.percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Student-wise Result</h3>
      <table className="sheet-print-table">
        <thead>
          <tr>
            {['S.No', 'Enrol No', 'Name', 'T1', 'T2', 'T3', 'TA', 'Total (100)', 'Grade'].map((h) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {(sheet?.results || []).map((r) => (
            <tr key={r.enrol}>
              <td>{r.sno}</td>
              <td>{r.enrol}</td>
              <td className="left">{r.name}</td>
              <td>{fmt(r.t1, 1)}</td>
              <td>{fmt(r.t2, 1)}</td>
              <td>{fmt(r.t3, 1)}</td>
              <td>{fmt(r.ta, 1)}</td>
              <td className="font-bold">{fmt(r.total, 1)}</td>
              <td className="font-bold">{r.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function SheetPreview({
  kind,
  course,
  students,
  block,
  marksGrid,
  outcomes,
  sheet,
  previewing,
  onToggle,
}) {
  const rootRef = useRef(null);
  const data = useMemo(() => {
    if (!['T1', 'T2', 'T3', 'TA', 'FEEDBACK'].includes(kind) || !block) return null;
    return buildExamPreview({ students, block, marksGrid, outcomes });
  }, [kind, students, block, marksGrid, outcomes]);

  const stem = `${(course?.course_code || 'course').replace(/\s+/g, '_')}_${kind}`;

  function handlePrint() {
    printCurrentSheet();
  }

  function handleSaveHtml() {
    saveNodeAsHtml(`${stem}_sheet.html`, rootRef.current);
  }

  function handleSaveCsv() {
    if (data) {
      const header = ['S.No', 'Enrol No', 'Name', ...data.questions.map((q) => q.label), 'Total', ...data.cos.map((c) => `${c.co_code} %`)];
      const rows = [header, ...data.rows.map((r) => [
        r.sno, r.enrol, r.name,
        ...data.questions.map((q) => (r.marks[q.id] == null ? '' : r.marks[q.id])),
        r.total == null ? '' : r.total,
        ...data.cos.map((c) => (r.coPct[c.id] == null ? '' : Number(r.coPct[c.id]).toFixed(1))),
      ])];
      saveCsv(`${stem}_marks.csv`, rows);
      return;
    }
    if (kind === 'attainment') {
      const poKeys = sheet?.po_keys || [];
      const header = ['CO', 'T1', 'T2', 'T3', 'T-AVG', 'TA', 'Direct', 'Indirect', 'Final', 'CIE', 'SIE', ...poKeys];
      const rows = [header, ...(sheet?.cos || []).map((r) => [
        r.co_code, r.t1_level, r.t2_level, r.t3_level, r.t_avg, r.ta_level, r.direct, r.indirect, r.final, r.cie, r.sie,
        ...poKeys.map((po) => r.mappings?.[po] ?? ''),
      ])];
      saveCsv(`${stem}.csv`, rows);
      return;
    }
    if (kind === 'result') {
      const header = ['S.No', 'Enrol No', 'Name', 'T1', 'T2', 'T3', 'TA', 'Total', 'Grade'];
      const rows = [header, ...(sheet?.results || []).map((r) => [r.sno, r.enrol, r.name, r.t1, r.t2, r.t3, r.ta, r.total, r.grade])];
      saveCsv(`${stem}.csv`, rows);
    }
  }

  return (
    <div className="mt-4">
      <Actions
        previewing={previewing}
        onToggle={onToggle}
        onPrint={handlePrint}
        onSaveHtml={handleSaveHtml}
        onSaveCsv={handleSaveCsv}
      />
      <div className={`sheet-print-target mt-3 ${previewing ? '' : 'sheet-print-offscreen'}`} ref={rootRef}>
        <div className="sheet-print-page">
          {data ? <ExamBody course={course} data={data} /> : null}
          {kind === 'attainment' ? <AttainmentBody course={course} sheet={sheet} /> : null}
          {kind === 'result' ? <ResultBody course={course} sheet={sheet} /> : null}
        </div>
      </div>
    </div>
  );
}
