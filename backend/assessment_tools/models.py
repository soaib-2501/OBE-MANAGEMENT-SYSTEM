from django.db import models
from courses.models import Course


def tools_are_question_map(tools):
    if not tools or not isinstance(tools, list):
        return False
    first = tools[0]
    return isinstance(first, dict) and isinstance(first.get('questions'), list)


def _co_at(outcomes, index):
    if not outcomes:
        return None
    if 0 <= index < len(outcomes):
        return outcomes[index]
    return outcomes[-1]


def default_question_tools(course):
    outcomes = list(course.outcomes.all().order_by('order', 'id'))
    is_lab = bool(getattr(course, 'is_lab', False) or getattr(course, 'course_kind', '') == 'LAB')
    if is_lab:
        specs = [('Mid Sem', None, 2), ('End Sem', None, 2), ('D2D', None, 5)]
    else:
        specs = [
            ('T-1', None, 4),
            ('T-2', None, 4),
            ('T-3', [0, 1, 2, 2, 1, 3], 6),
        ]
    tools = []
    for name, indexes, count in specs:
        questions = []
        for i in range(count):
            idx = indexes[i] if indexes and i < len(indexes) else i
            co = _co_at(outcomes, idx)
            questions.append({
                'qno': f'Q{i + 1}',
                'co_code': co.co_code if co else '',
                'ques_level': co.cognitive_level if co else '',
                'remarks': '',
            })
        tools.append({'name': name, 'questions': questions})
    return tools


def default_title():
    return 'Cognitive level mapping of CO to the assessment tool'


class AssessmentToolsDocument(models.Model):
    """Cognitive-level mapping of COs to T1/T2/T3 (or lab) assessment questions."""
    course = models.OneToOneField(
        Course, on_delete=models.CASCADE, related_name='assessment_tools',
    )
    doc_title = models.CharField(max_length=255, default='Cognitive level mapping of CO to the assessment tool')
    sub_heading = models.CharField(max_length=255, blank=True)
    semester_label = models.CharField(max_length=80, blank=True)
    module_coordinator = models.CharField(max_length=255, blank=True)
    watermark_text = models.CharField(max_length=80, blank=True)
    tools = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Assessment Tool — {self.course}'

    def apply_defaults(self):
        if not self.doc_title or self.doc_title.startswith('Assessment Tools for CO Attainment'):
            self.doc_title = default_title()
        if not tools_are_question_map(self.tools):
            self.tools = default_question_tools(self.course)
        if not self.semester_label:
            sem = 'EVEN' if getattr(self.course, 'semester', '') == 'EVEN' else 'ODD'
            self.semester_label = f'{sem} Semester'
