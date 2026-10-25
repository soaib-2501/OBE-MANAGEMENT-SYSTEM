import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function emptyPo(index) {
  return { kind: 'PO', group_title: '', code: `PO${index + 1}`, title: '', statement: '' };
}

function emptyPso(index) {
  return { kind: 'PSO', group_title: '', code: `PSO${index + 1}`, title: '', statement: '' };
}

function groupPsos(statements) {
  const groups = [];
  (statements || []).filter((s) => s.kind === 'PSO').forEach((row) => {
    const title = row.group_title || '';
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(row);
    else groups.push({ title, items: [row] });
  });
  return groups.length ? groups : [{ title: '', items: [emptyPso(0)] }];
}

function flattenForm(form) {
  const statements = [];
  (form.pos || []).forEach((row) => {
    statements.push({
      kind: 'PO',
      group_title: '',
      code: row.code || '',
      title: row.title || '',
      statement: row.statement || '',
    });
  });
  (form.psoGroups || []).forEach((group) => {
    (group.items || []).forEach((row) => {
      statements.push({
        kind: 'PSO',
        group_title: group.title || '',
        code: row.code || '',
        title: row.title || '',
        statement: row.statement || '',
      });
    });
  });
  return statements;
}

function formFromProgramme(p) {
  const statements = p?.statements || [];
  const pos = statements.filter((s) => s.kind === 'PO').map((s) => ({ ...s }));
  return {
    id: p?.id || null,
    degree: p?.degree || 'BTECH',
    branch: p?.branch || '',
    name: p?.name || '',
    slug: p?.slug || '',
    order: p?.order || 0,
    pos: pos.length ? pos : [emptyPo(0)],
    psoGroups: groupPsos(statements),
  };
}

export default function ProgramsAdmin() {
  const [programmes, setProgrammes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await api.get('/programs/');
    const rows = res.data.results ?? res.data;
    setProgrammes(rows);
    setSelectedId((prev) => prev || rows[0]?.id || null);
  }

  useEffect(() => {
    load().catch(() => setError('Could not load programmes.'));
  }, []);

  const selected = useMemo(
    () => programmes.find((p) => p.id === selectedId) || null,
    [programmes, selectedId],
  );

  function startEdit(p) {
    setForm(formFromProgramme(p || {
      degree: 'BTECH', branch: '', name: '', slug: '', order: programmes.length + 1, statements: [],
    }));
    setEditing(true);
    setStatus('');
    setError('');
  }

  function startNew() {
    setSelectedId(null);
    startEdit({
      degree: 'BTECH',
      branch: '',
      name: '',
      slug: '',
      order: programmes.length + 1,
      statements: [emptyPo(0), emptyPo(1), emptyPso(0), emptyPso(1)],
    });
  }

  function patchForm(partial) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function patchPo(i, partial) {
    setForm((prev) => {
      const pos = prev.pos.map((row, idx) => (idx === i ? { ...row, ...partial } : row));
      return { ...prev, pos };
    });
  }

  function patchPsoGroup(gi, partial) {
    setForm((prev) => {
      const psoGroups = prev.psoGroups.map((g, i) => (i === gi ? { ...g, ...partial } : g));
      return { ...prev, psoGroups };
    });
  }

  function patchPso(gi, ii, partial) {
    setForm((prev) => {
      const psoGroups = prev.psoGroups.map((g, i) => {
        if (i !== gi) return g;
        return { ...g, items: g.items.map((row, j) => (j === ii ? { ...row, ...partial } : row)) };
      });
      return { ...prev, psoGroups };
    });
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    setSaving(true);
    try {
      const payload = {
        degree: form.degree,
        branch: form.branch.trim(),
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(`${form.degree}-${form.branch || form.name}`),
        order: Number(form.order) || 0,
        statements: flattenForm(form),
      };
      let saved;
      if (form.id) {
        saved = (await api.patch(`/programs/${form.id}/`, payload)).data;
      } else {
        saved = (await api.post('/programs/', payload)).data;
      }
      await load();
      setSelectedId(saved.id);
      setEditing(false);
      setForm(null);
      setStatus('Programme saved.');
    } catch (err) {
      const data = err.response?.data;
      setError(typeof data === 'string' ? data : JSON.stringify(data || 'Could not save programme.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeProgramme(id) {
    if (!window.confirm('Delete this programme and its PO/PSO text?')) return;
    await api.delete(`/programs/${id}/`);
    setEditing(false);
    setForm(null);
    setSelectedId(null);
    await load();
  }

  const pos = (selected?.statements || []).filter((s) => s.kind === 'PO');
  const psoGroups = selected ? groupPsos(selected.statements).filter((g) => g.items.some((r) => r.statement || r.code)) : [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Programs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Programme Outcomes and Programme Specific Outcomes. Edit any text if NBA wording changes later.
          </p>
        </div>
        <button type="button" onClick={startNew} className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-semibold">
          + Add programme
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded p-3 mb-4">{error}</div>}
      {status && <div className="bg-emerald-50 text-emerald-800 text-sm rounded p-3 mb-4">{status}</div>}

      <div className="flex flex-wrap gap-2 mb-5">
        {programmes.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => { setSelectedId(p.id); setEditing(false); setForm(null); setStatus(''); }}
            className={`px-3 py-1.5 rounded text-sm font-semibold ${p.id === selectedId ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {editing && form && (
        <form onSubmit={save} className="bg-white shadow rounded-lg p-6 mb-6 space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">{form.id ? 'Edit programme' : 'New programme'}</h2>
            <button type="button" className="text-sm text-slate-500" onClick={() => { setEditing(false); setForm(null); }}>Cancel</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="text-xs">Degree
              <select className="mt-1 w-full border rounded px-2 py-1.5 text-sm" value={form.degree}
                onChange={(e) => patchForm({ degree: e.target.value })}>
                <option value="BTECH">B.Tech</option>
                <option value="MTECH">M.Tech</option>
              </select>
            </label>
            <label className="text-xs">Branch
              <input className="mt-1 w-full border rounded px-2 py-1.5 text-sm" value={form.branch}
                onChange={(e) => patchForm({ branch: e.target.value, slug: form.id ? form.slug : slugify(`${form.degree}-${e.target.value}`) })}
                placeholder="CSE / IT / AIDS" />
            </label>
            <label className="text-xs col-span-2">Programme name
              <input required className="mt-1 w-full border rounded px-2 py-1.5 text-sm" value={form.name}
                onChange={(e) => patchForm({ name: e.target.value })} placeholder="B.Tech (CSE)" />
            </label>
          </div>

          <section>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Programme Outcomes</h3>
              <button type="button" className="text-xs font-semibold" onClick={() => patchForm({ pos: [...form.pos, emptyPo(form.pos.length)] })}>+ Add PO</button>
            </div>
            <div className="space-y-3">
              {form.pos.map((row, i) => (
                <div key={`po-${i}`} className="border rounded p-3 bg-slate-50 grid grid-cols-[90px_1fr_28px] gap-2">
                  <input className="border rounded px-2 py-1 text-sm font-semibold" value={row.code}
                    onChange={(e) => patchPo(i, { code: e.target.value })} />
                  <input className="border rounded px-2 py-1 text-sm" placeholder="Short title (optional)" value={row.title || ''}
                    onChange={(e) => patchPo(i, { title: e.target.value })} />
                  <button type="button" className="text-red-600" onClick={() => patchForm({ pos: form.pos.filter((_, j) => j !== i) })}>✕</button>
                  <textarea className="col-span-3 border rounded px-2 py-1.5 text-sm min-h-[72px]" value={row.statement}
                    onChange={(e) => patchPo(i, { statement: e.target.value })} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Programme Specific Outcomes</h3>
              <button type="button" className="text-xs font-semibold" onClick={() => patchForm({
                psoGroups: [...form.psoGroups, { title: '', items: [emptyPso(0)] }],
              })}>+ Add PSO group</button>
            </div>
            {form.psoGroups.map((group, gi) => (
              <div key={`g-${gi}`} className="border rounded p-3 mb-3">
                <div className="flex gap-2 mb-2">
                  <input className="flex-1 border rounded px-2 py-1.5 text-sm font-semibold" placeholder="Group heading (optional, e.g. M.Tech CSE with specialisation in DA)"
                    value={group.title} onChange={(e) => patchPsoGroup(gi, { title: e.target.value })} />
                  <button type="button" className="text-xs text-red-600" onClick={() => patchForm({ psoGroups: form.psoGroups.filter((_, i) => i !== gi) })}>Remove group</button>
                </div>
                {group.items.map((row, ii) => (
                  <div key={`pso-${gi}-${ii}`} className="grid grid-cols-[90px_1fr_28px] gap-2 mb-2">
                    <input className="border rounded px-2 py-1 text-sm font-semibold" value={row.code}
                      onChange={(e) => patchPso(gi, ii, { code: e.target.value })} />
                    <textarea className="border rounded px-2 py-1.5 text-sm min-h-[64px]" value={row.statement}
                      onChange={(e) => patchPso(gi, ii, { statement: e.target.value })} />
                    <button type="button" className="text-red-600" onClick={() => patchPsoGroup(gi, { items: group.items.filter((_, j) => j !== ii) })}>✕</button>
                  </div>
                ))}
                <button type="button" className="text-xs font-semibold" onClick={() => patchPsoGroup(gi, { items: [...group.items, emptyPso(group.items.length)] })}>+ Add PSO</button>
              </div>
            ))}
          </section>

          <button type="submit" disabled={saving} className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save programme'}
          </button>
        </form>
      )}

      {!editing && selected && (
        <section className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-start gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold">{selected.name}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {selected.degree === 'MTECH' ? 'M.Tech' : 'B.Tech'} · {selected.branch}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => startEdit(selected)} className="bg-slate-200 px-3 py-1.5 rounded text-xs font-semibold">Edit</button>
              <button type="button" onClick={() => removeProgramme(selected.id)} className="text-xs text-red-600">Delete</button>
            </div>
          </div>

          <h3 className="font-bold underline text-sm mb-2">Programme Outcomes:</h3>
          <ol className="space-y-3 mb-6">
            {pos.map((row) => (
              <li key={row.id || row.code} className="text-sm leading-relaxed">
                <span className="font-semibold">{row.code}:</span>
                {row.title ? <> <span className="font-semibold">{row.title}:</span> {row.statement}</> : <> {row.statement}</>}
              </li>
            ))}
          </ol>

          <h3 className="font-bold underline text-sm mb-2">Programme Specific Outcomes:</h3>
          {psoGroups.map((group, i) => (
            <div key={`show-${i}`} className="mb-4">
              {group.title ? <p className="font-semibold text-sm mb-2">{group.title}</p> : null}
              <ol className="space-y-3">
                {group.items.map((row) => (
                  <li key={row.id || `${group.title}-${row.code}`} className="text-sm leading-relaxed">
                    <span className="font-semibold">{row.code}:</span> {row.statement}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      {!editing && !selected && (
        <p className="text-sm text-slate-500">No programmes yet.</p>
      )}
    </div>
  );
}
