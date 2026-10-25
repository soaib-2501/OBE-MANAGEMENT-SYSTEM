import React from 'react';
import { coordinatorName } from '../utils/offering';

function compactYear(year) {
  if (!year) return '';
  const m = String(year).match(/^(\d{4})\s*[-/]\s*(\d{2,4})$/);
  if (!m) return String(year);
  const end = m[2].length === 4 ? m[2].slice(-2) : m[2];
  return `${m[1]}-${end}`;
}

function cell(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (Number.isNaN(n)) return '';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function Header({ course }) {
  const ay = compactYear(course?.academic_year) || course?.academic_year || '';
  const sem = course?.semester === 'EVEN' ? 'EVEN' : 'ODD';
  const branch = course?.program_name || course?.department || '';
  const semBranch = `${course?.semester_label || `${course?.semester_number || 2} Sem`}/${branch}`;
  const coordinator = coordinatorName(course);
  return (
    <div className="lab-att-head">
      <p className="lab-att-inst">{course?.institute || 'JAYPEE INSTITUTE OF INFORMATION TECHNOLOGY'}</p>
      <p>Academic Year : {ay} ({sem} Semester)</p>
      <p>Semester/Branch: {semBranch}</p>
      <p>Course Name and Code: {course?.course_name || ''} ({course?.course_code || ''})</p>
      <p>NBA Code: {course?.nba_code || ''}</p>
      <p>Course Coordinator: {coordinator === '—' ? '' : coordinator}</p>
    </div>
  );
}

function AttainmentTables({ course, sheet }) {
  const rows = sheet?.cos || [];
  const poKeys = sheet?.po_keys || [];
  const h = sheet?.lab_headers || {};

  return (
    <>
      <h3 className="lab-att-title">Average CO-Attainment</h3>
      <table className="lab-att-table">
        <thead>
          <tr>
            <th>COs</th>
            <th>Mid Term[{h.mid_max || 20}]</th>
            <th>End Term[{h.end_max || 20}]</th>
            <th>Eval1[{h.eval1_max || 15}]</th>
            <th>Eval2[{h.eval2_max || 10}]</th>
            <th>Project[{h.project_max || 25}]</th>
            <th>Direct Attainment</th>
            <th>Student Feedback (Indirect Assessment)</th>
            <th>Final (80% of Direct + 20% Indirect)</th>
            <th>CIE</th>
            <th>SEE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="left font-semibold">{row.co_code}</td>
              <td>{cell(row.mid_level)}</td>
              <td>{cell(row.end_level)}</td>
              <td>{cell(row.eval1_level)}</td>
              <td>{cell(row.eval2_level)}</td>
              <td>{cell(row.project_level)}</td>
              <td>{cell(row.direct)}</td>
              <td className="fb">{cell(row.indirect)}</td>
              <td className="final">{cell(row.final)}</td>
              <td>{cell(row.cie)}</td>
              <td>{cell(row.see ?? row.sie)}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={11}>No COs yet. Add course outcomes and save Mid / End / D2D / Exit Survey marks.</td></tr>
          )}
        </tbody>
      </table>

      <h3 className="lab-att-title">CO-PO-PSO Mapping</h3>
      <table className="lab-att-table">
        <thead>
          <tr>
            <th>CO-PO-PSO Mapping</th>
            <th>CO Attainment</th>
            {poKeys.map((po) => <th key={po}>{po}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`m-${row.id}`}>
              <td className="left font-semibold">{row.co_code}</td>
              <td>{cell(row.final)}</td>
              {poKeys.map((po) => (
                <td key={po}>{row.mappings?.[po] ?? ''}</td>
              ))}
            </tr>
          ))}
          <tr className="avg">
            <td className="left font-semibold">NBA Code:</td>
            <td>{course?.nba_code || ''}</td>
            {poKeys.map((po) => (
              <td key={po}>{cell(sheet?.mapping_avg?.[po])}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <h3 className="lab-att-title">PO-PSO Attainment</h3>
      <table className="lab-att-table lab-att-po">
        <thead>
          <tr>
            <th>Course</th>
            {poKeys.map((po) => <th key={po}>{po}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="left font-semibold">NBA Code: {sheet?.nba_code || course?.nba_code || '—'}</td>
            {poKeys.map((po) => (
              <td key={po} className="final">{cell(sheet?.po_attainment?.[po])}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </>
  );
}

export default function LabAttainmentSheet({ course, sheet, loading, onRecalculate }) {
  return (
    <div className="space-y-4">
      <section className="bg-white shadow rounded-lg p-5 no-print">
        <div className="flex flex-wrap justify-between gap-2 mb-3">
          <div>
            <h2 className="font-semibold">CO Attainment</h2>
            <p className="text-xs text-slate-500 mt-1">
              Component level = % of appeared students scoring ≥ target on that CO (0 / 1 / 2 / 3).
              Direct = average of Mid, End, Eval1, Eval2, Project levels that exist for the CO.
              CIE = average of Mid + Eval1 + Eval2 + Project. SEE = End Term.
              Final = 80% Direct + 20% Exit Survey. PO = Σ(Final × mapping) / Σ(mapping).
            </p>
          </div>
          <button type="button" disabled={loading} onClick={onRecalculate}
            className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded font-semibold disabled:opacity-50">
            {loading ? 'Computing…' : 'Recalculate'}
          </button>
        </div>
        {loading && !sheet && <p className="text-sm text-slate-500">Computing lab attainment…</p>}
        <div className="lab-att-edit">
          <AttainmentTables course={course} sheet={sheet} />
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-5 print:shadow-none print:p-0">
        <div className="no-print flex justify-end mb-3">
          <button type="button" onClick={() => window.print()} className="bg-slate-200 px-3 py-1.5 rounded text-xs font-semibold">Print</button>
        </div>
        <div className="lab-att-preview">
          <Header course={course} />
          <AttainmentTables course={course} sheet={sheet} />
        </div>
      </section>
    </div>
  );
}
