import re

from attainments.year_utils import previous_academic_year


DUMMY_CO_BY_YEAR = {
    '2023-24': ['2.60', '1.30', '1.13', '1.60'],
    '2022-23': ['-', '-', '-', '-'],
    '2021-22': ['-', '-', '-', '-'],
}

DUMMY_PO_BY_YEAR = {
    '2023-24': {'PO1': '1.52', 'PO2': '1.34', 'PO3': '1.66', 'PSO1': '1.34', 'PSO2': '1.60'},
    '2022-23': {},
    '2021-22': {},
}


def compact_year(year):
    text = (year or '').strip()
    match = re.search(r'(\d{4})\s*[-/]\s*(\d{2,4})', text)
    if not match:
        return text
    end = match.group(2)
    if len(end) == 4:
        end = end[-2:]
    return f'{match.group(1)}-{end}'


def prior_years(academic_year, count=3):
    years = []
    cur = academic_year
    for _ in range(count):
        cur = previous_academic_year(cur)
        if not cur:
            break
        years.append(cur)
    return years


def dummy_values_for_year(year, outcomes, po_keys):
    ordered = list(outcomes)
    key = compact_year(year)
    co_vals = DUMMY_CO_BY_YEAR.get(year) or DUMMY_CO_BY_YEAR.get(key) or ['-', '-', '-', '-']
    cos = {}
    for i, co in enumerate(ordered):
        cos[co.co_code] = co_vals[i] if i < len(co_vals) else '-'
    pos = dict(DUMMY_PO_BY_YEAR.get(year) or DUMMY_PO_BY_YEAR.get(key) or {})
    if not pos:
        pos = {k: '' for k in po_keys}
    return cos, pos
