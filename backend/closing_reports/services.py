from copy import deepcopy

from attainments.models import Attainment, HistoricalCoAttainment, ProgramAttainment
from attainments.services import build_sheet, calculate_for_course
from attainments.year_utils import previous_academic_year
from opening_reports.models import OpeningReport

from .history import compact_year, dummy_values_for_year, prior_years
from .models import (
    DEFAULT_BRIGHT_ACTIONS,
    DEFAULT_WEAK_ACTIONS,
    ClosingYearSnapshot,
)


def fmt_num(value):
    if value is None or value == '':
        return ''
    try:
        number = float(value)
    except (TypeError, ValueError):
        return str(value)
    if number == int(number):
        return str(int(number))
    text = f'{number:.2f}'.rstrip('0').rstrip('.')
    return text


def _checked_labels(items, other=''):
    labels = [item.get('label') for item in (items or []) if item.get('checked') and item.get('label')]
    if other:
        labels.append(other)
    return labels


def _numeric(value):
    if value is None or value == '' or value == '-':
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _slot_for_year(history_by_year, year):
    if not year:
        return {}
    if year in (history_by_year or {}):
        return history_by_year[year]
    want = compact_year(year)
    for key, slot in (history_by_year or {}).items():
        if compact_year(key) == want:
            return slot
    return {}


def collect_history(course):
    years = prior_years(course.academic_year, 3)
    by_year = {}
    stored = set()

    snaps = ClosingYearSnapshot.objects.filter(
        course_code=course.course_code,
        semester=course.semester,
    )
    for snap in snaps:
        by_year[snap.academic_year] = {
            'cos': dict(snap.co_attainments or {}),
            'pos': dict(snap.po_attainments or {}),
            'source': snap.source,
        }
        stored.add(snap.academic_year)

    hist = HistoricalCoAttainment.objects.filter(
        course_code=course.course_code,
        semester=course.semester,
    )
    for rec in hist:
        slot = by_year.setdefault(rec.academic_year, {'cos': {}, 'pos': {}, 'source': 'COMPUTED'})
        slot['cos'][rec.co_code] = fmt_num(rec.attainment)
        stored.add(rec.academic_year)

    return years, by_year, stored


def seed_dummy_history(course):
    """Create SEED snapshots for the previous three years if none exist."""
    outcomes = list(course.outcomes.all().order_by('order', 'id'))
    po_keys = course.po_pso_keys()
    years = prior_years(course.academic_year, 3)
    created = []
    for year in years:
        cos, pos = dummy_values_for_year(year, outcomes, po_keys)
        obj, was_created = ClosingYearSnapshot.objects.get_or_create(
            course_code=course.course_code,
            academic_year=year,
            semester=course.semester,
            defaults={
                'nba_code': course.nba_code or '',
                'co_attainments': cos,
                'po_attainments': pos,
                'source': ClosingYearSnapshot.Source.SEED,
            },
        )
        if was_created:
            created.append(year)
        elif obj.source == ClosingYearSnapshot.Source.SEED and not obj.co_attainments:
            obj.co_attainments = cos
            obj.po_attainments = pos
            obj.nba_code = course.nba_code or obj.nba_code
            obj.save()
    return created, collect_history(course)


def _grade_percents_fallback():
    return [
        {'grade': g, 'pct': '', 'count': 0}
        for g in ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F', 'I')
    ]


def _grades_from_sheet(sheet):
    dist = sheet.get('grade_distribution') or []
    results = sheet.get('results') or []
    has_marks = any(_numeric(row.get('total')) for row in results)
    if not dist or not has_marks:
        return _grade_percents_fallback()
    return [
        {
            'grade': row.get('grade') or '',
            'pct': fmt_num(row.get('percent')),
            'count': int(row.get('count') or 0),
        }
        for row in dist
    ]


def build_synced(course):
    opening = OpeningReport.objects.filter(course=course).first()
    teaching = _checked_labels(
        getattr(opening, 'teaching_methods', None),
        getattr(opening, 'teaching_other', '') if opening else '',
    )
    evals = _checked_labels(
        getattr(opening, 'eval_strategies', None),
        getattr(opening, 'eval_other', '') if opening else '',
    )
    weak = [
        {'action': label, 'proof': ''}
        for label in _checked_labels(
            getattr(opening, 'weak_strategies', None),
            getattr(opening, 'weak_other', '') if opening else '',
        )
    ]
    bright = [
        {'action': label, 'proof': ''}
        for label in _checked_labels(
            getattr(opening, 'bright_strategies', None),
            getattr(opening, 'bright_other', '') if opening else '',
        )
    ]

    try:
        calculate_for_course(course.id)
        sheet = build_sheet(course)
    except Exception:
        sheet = {}

    co_current = {}
    for row in sheet.get('cos') or []:
        co_current[row['co_code']] = fmt_num(row.get('final'))
    if not any(co_current.values()):
        for att in Attainment.objects.filter(course=course).select_related('course_outcome'):
            co_current[att.course_outcome.co_code] = fmt_num(att.final_attainment)

    po_current = {}
    for key, value in (sheet.get('po_attainment') or {}).items():
        po_current[key] = fmt_num(value)
    if not any(po_current.values()):
        for pa in ProgramAttainment.objects.filter(course=course):
            po_current[pa.po_key] = fmt_num(pa.percentage)

    return {
        'teaching_methods': teaching,
        'eval_strategies': evals,
        'weak_actions': weak,
        'bright_actions': bright,
        'co_current': co_current,
        'po_current': po_current,
        'grade_percents': _grades_from_sheet(sheet),
        'total_students': sheet.get('roster_count') or 0,
        'co_targets_opening': dict(opening.co_targets) if opening and opening.co_targets else {},
        'co_actions_opening': dict(opening.co_actions) if opening and opening.co_actions else {},
        'mapped_po_keys': mapped_po_columns(course),
    }


def mapped_po_columns(course):
    po_keys = course.po_pso_keys()
    used = set()
    for co in course.outcomes.all():
        for mapping in co.mappings.all():
            if mapping.level not in (None, '', 0):
                used.add(mapping.po_key)
    return [key for key in po_keys if key in used] or list(po_keys)


def mapping_checks(co, po_keys):
    mapped = {m.po_key: m.level for m in co.mappings.all()}
    checks = {}
    for key in po_keys:
        lvl = mapped.get(key)
        checks[key] = bool(lvl not in (None, '', 0))
    return checks


def build_co8_rows(course, synced, history_by_year, prev_year):
    po_keys = synced.get('mapped_po_keys') or mapped_po_columns(course)
    hist = _slot_for_year(history_by_year, prev_year).get('cos') or {}
    rows = []
    for co in course.outcomes.all().order_by('order', 'id'):
        action = (synced.get('co_actions_opening') or {}).get(co.co_code) or ''
        rows.append({
            'co': co.co_code,
            'a_prev': hist.get(co.co_code, ''),
            'action': action,
            'proof': '',
            'checks': mapping_checks(co, po_keys),
        })
    return rows


def build_popso9(course, synced, history_by_year, prev_year):
    po_keys = course.po_pso_keys()
    hist = _slot_for_year(history_by_year, prev_year).get('pos') or {}
    out = {}
    for key in po_keys:
        out[key] = {
            'a_prev': hist.get(key, ''),
            'action': '',
            'proof': '',
        }
    return out


def _norm_checks(checks, po_keys):
    raw = checks or {}
    lower = {str(key).lower(): value for key, value in raw.items()}
    return {key: bool(raw.get(key) or lower.get(key.lower())) for key in po_keys}


def _merge_co8(existing, built):
    old = {row.get('co'): row for row in (existing or []) if isinstance(row, dict)}
    merged = []
    for row in built:
        prev = old.get(row['co']) or {}
        po_keys = list((row.get('checks') or {}).keys())
        merged.append({
            **row,
            'action': prev.get('action') if prev.get('action') not in (None, '') else row['action'],
            'proof': prev.get('proof') if prev.get('proof') not in (None, '') else row['proof'],
            'checks': _norm_checks(prev.get('checks') or row.get('checks'), po_keys),
        })
    return merged


def _merge_popso9(existing, built):
    old = existing or {}
    merged = {}
    for key, row in built.items():
        prev = old.get(key) or {}
        merged[key] = {
            **row,
            'action': prev.get('action') if prev.get('action') not in (None, '') else row['action'],
            'proof': prev.get('proof') if prev.get('proof') not in (None, '') else row['proof'],
        }
    return merged


def hydrate_report(report, course, synced, history_by_year, years, force_tables=False):
    changed = False
    report.apply_defaults()
    prev_year = previous_academic_year(course.academic_year) or ((years or [None])[-1] if years else '')

    def fill_if_empty(field, value):
        nonlocal changed
        current = getattr(report, field)
        empty = current in (None, '', [], {})
        if empty and value:
            setattr(report, field, deepcopy(value))
            changed = True

    fill_if_empty('teaching_methods', synced.get('teaching_methods'))
    fill_if_empty('eval_strategies', synced.get('eval_strategies'))
    fill_if_empty('weak_actions', synced.get('weak_actions'))
    fill_if_empty('bright_actions', synced.get('bright_actions'))

    live_co = synced.get('co_current') or {}
    live_po = synced.get('po_current') or {}
    live_grades = synced.get('grade_percents') or []
    if any(str(v).strip() for v in live_co.values()):
        report.co_current = deepcopy(live_co)
        changed = True
    elif not report.co_current:
        report.co_current = deepcopy(live_co)
        changed = True
    if any(str(v).strip() for v in live_po.values()):
        report.po_current = deepcopy(live_po)
        changed = True
    elif not report.po_current:
        report.po_current = deepcopy(live_po)
        changed = True
    if any(str(g.get('pct') or '').strip() or g.get('count') for g in live_grades):
        report.grade_percents = deepcopy(live_grades)
        changed = True
    elif not report.grade_percents:
        report.grade_percents = deepcopy(live_grades or _grade_percents_fallback())
        changed = True

    if not report.weak_actions:
        report.weak_actions = deepcopy(DEFAULT_WEAK_ACTIONS)
        changed = True
    if not report.bright_actions:
        report.bright_actions = deepcopy(DEFAULT_BRIGHT_ACTIONS)
        changed = True
    if not report.teaching_methods:
        report.teaching_methods = ['']
        changed = True
    if not report.eval_strategies:
        report.eval_strategies = ['']
        changed = True

    built_co8 = build_co8_rows(course, synced, history_by_year, prev_year)
    built_po = build_popso9(course, synced, history_by_year, prev_year)
    if force_tables or not report.co8_rows:
        report.co8_rows = built_co8
        changed = True
    else:
        report.co8_rows = _merge_co8(report.co8_rows, built_co8)
        changed = True
    if force_tables or not report.popso9:
        report.popso9 = built_po
        changed = True
    else:
        report.popso9 = _merge_popso9(report.popso9, built_po)
        changed = True
    if not report.doc_title:
        report.doc_title = 'Course Closing Report'
        changed = True
    if changed:
        report.save()
    return changed
