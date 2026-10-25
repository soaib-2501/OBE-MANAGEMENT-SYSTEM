function compact(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/bachelor of technology/g, 'btech')
    .replace(/master of technology/g, 'mtech')
    .replace(/b\.?\s*tech/g, 'btech')
    .replace(/m\.?\s*tech/g, 'mtech')
    .replace(/computer science( and engineering)?/g, 'cse')
    .replace(/information technology/g, 'it')
    .replace(/artificial intelligence\s*(and|&)?\s*data science/g, 'aids')
    .replace(/ai\s*(and|&)?\s*d\.?s\.?/g, 'aids')
    .replace(/ai\s*&\s*ds/g, 'aids')
    .replace(/[^a-z0-9]+/g, '');
}

export function programmeCounts(programme) {
  if (!programme) return { po_count: 3, pso_count: 2 };
  if (programme.po_count != null || programme.pso_count != null) {
    return {
      po_count: Number(programme.po_count) || 0,
      pso_count: Number(programme.pso_count) || 0,
    };
  }
  const statements = programme.statements || [];
  const pos = new Set(statements.filter((s) => s.kind === 'PO' && s.code).map((s) => s.code));
  const psos = new Set(statements.filter((s) => s.kind === 'PSO' && s.code).map((s) => s.code));
  return { po_count: pos.size, pso_count: psos.size };
}

export function departmentFromProgramme(programme) {
  if (!programme) return '';
  const branch = String(programme.branch || '').toUpperCase();
  if (branch === 'CSE') return 'Department of CSE';
  if (branch === 'IT') return 'Department of IT';
  if (branch === 'AIDS') return 'Department of AI & DS';
  return programme.name || '';
}

export function catalogEntryMatchingProgramme(programme, selected, catalog) {
  if (!selected || !programme) return selected || null;
  const siblings = (catalog || []).filter((row) => (
    (selected.nba_code && row.nba_code === selected.nba_code)
    || (selected.course_code && row.course_code === selected.course_code)
  ));
  if (siblings.length <= 1) return selected;
  const exclusive = siblings.filter((row) => (
    !mentionsBothCseIt(row.program_name)
    && matchProgrammes(row.program_name, [programme]).length > 0
  ));
  return exclusive[0] || selected;
}

export function mentionsBothCseIt(label) {
  const raw = String(label || '').toLowerCase();
  const n = compact(label);
  if (!n.includes('btech')) return false;
  const hasCse = n.includes('cse') || /\bcse\b/.test(raw);
  const hasIt = /(?:^|[^a-z])it(?:[^a-z]|$)/.test(raw) || n.includes('btechit') || /btech.*it/.test(n);
  if (hasCse && hasIt) return true;
  return /cse\s*[/&,+\-]+\s*it/.test(raw) || /cse\s*(and|&|\/)\s*it/.test(raw);
}

function programmeNeedle(programme) {
  return compact(`${programme.degree || ''} ${programme.branch || ''} ${programme.name || ''}`);
}

function matchesOne(label, programme) {
  const n = compact(label);
  if (!n) return false;
  const needle = programmeNeedle(programme);
  const branch = compact(programme.branch);
  const degree = (programme.degree || '').toLowerCase();
  if (needle && (n.includes(needle) || needle.includes(n))) return true;
  if (degree === 'btech' && n.includes('btech') && branch && n.includes(branch)) return true;
  if (degree === 'mtech' && n.includes('mtech') && branch && n.includes(branch)) return true;
  if (degree === 'mtech' && branch === 'aids' && n.includes('mtech') && (n.includes('aids') || n.includes('aids'))) {
    return true;
  }
  return false;
}

export function matchProgrammes(programName, programmes) {
  const list = programmes || [];
  const label = String(programName || '');
  if (mentionsBothCseIt(label)) {
    return list.filter((p) => p.degree === 'BTECH' && ['CSE', 'IT'].includes((p.branch || '').toUpperCase()));
  }
  const hits = list.filter((p) => matchesOne(label, p));
  const seen = new Set();
  return hits.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function programmesForCatalogChoice(selected, catalog, programmes) {
  if (!selected) return [];
  const siblings = (catalog || []).filter((row) => (
    (selected.nba_code && row.nba_code === selected.nba_code)
    || (selected.course_code && row.course_code === selected.course_code)
  ));
  const names = [...new Set([selected.program_name, ...siblings.map((r) => r.program_name)].filter(Boolean))];
  const combined = names.join(' / ');
  if (names.length > 1 || mentionsBothCseIt(combined) || mentionsBothCseIt(selected.program_name)) {
    const fromNames = names.flatMap((name) => matchProgrammes(name, programmes));
    const both = matchProgrammes(combined, programmes);
    const merged = [...fromNames, ...both];
    const seen = new Set();
    const unique = merged.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    if (unique.length > 1) return unique;
  }
  return matchProgrammes(selected.program_name, programmes);
}
