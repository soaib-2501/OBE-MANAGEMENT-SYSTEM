from django.db import models
from courses.models import Course


LAB_DIRECT_DEFAULTS = [
    'Eval 1(D2D)',
    'Mid Viva, Project(D2D)',
    'Mid Viva, End Viva',
    'Eval 1(D2D), Eval 2(D2D)',
    'Project(D2D)',
]


def tools_are_co_rows(tools):
    if not tools or not isinstance(tools, list):
        return False
    first = tools[0]
    return isinstance(first, dict) and 'questions' not in first and (
        'direct' in first or 'indirect' in first
    )


def default_direct_for(course, index):
    is_lab = bool(getattr(course, 'is_lab', False) or getattr(course, 'course_kind', '') == 'LAB')
    if is_lab:
        if index < len(LAB_DIRECT_DEFAULTS):
            return LAB_DIRECT_DEFAULTS[index]
        return 'Eval 1(D2D)'
    return 'T1, T2, T3'


def default_co_rows(course, existing=None):
    saved = {}
    if tools_are_co_rows(existing):
        for row in existing:
            saved[row.get('co_code')] = row
    rows = []
    outcomes = list(course.outcomes.all().order_by('order', 'id'))
    for i, co in enumerate(outcomes):
        prev = saved.get(co.co_code) or {}
        if 'direct' in prev:
            direct = prev.get('direct') or ''
        else:
            direct = default_direct_for(course, i)
        if 'indirect' in prev:
            indirect = prev.get('indirect') or ''
        else:
            indirect = 'Course Exit Survey'
        rows.append({
            'co_code': co.co_code,
            'direct': direct,
            'indirect': indirect,
        })
    return rows


def default_title(course):
    name = (course.course_name or course.course_code or 'Course').strip()
    return f'Assessment Tools for CO Attainment –{name}'


def default_course_heading(course):
    name = (course.course_name or '').strip()
    code = (course.course_code or '').strip()
    if name and code:
        return f'{name} [{code}]'
    return name or code


class AssessmentToolsDocument(models.Model):
    """CO-wise Direct / Indirect assessment tools for one offering."""
    course = models.OneToOneField(
        Course, on_delete=models.CASCADE, related_name='assessment_tools',
    )
    doc_title = models.CharField(max_length=255, default='Assessment Tools for CO Attainment')
    sub_heading = models.CharField(max_length=255, blank=True)
    semester_label = models.CharField(max_length=80, blank=True)
    module_coordinator = models.CharField(max_length=255, blank=True)
    watermark_text = models.CharField(max_length=80, blank=True)
    tools = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Attainment Sheet — {self.course}'

    def apply_defaults(self):
        if not self.doc_title or self.doc_title in ('Assessment Tools',):
            self.doc_title = default_title(self.course)
        if not self.sub_heading or self.sub_heading.startswith('Cognitive level'):
            self.sub_heading = default_course_heading(self.course)
        if not tools_are_co_rows(self.tools):
            self.tools = default_co_rows(self.course, None)
