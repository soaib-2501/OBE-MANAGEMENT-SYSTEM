"""Default T1/T2/T3/TA/Feedback blocks and question columns for a course offering."""
from .models import Assessment, AssessmentQuestion, GradeBand, LAB_SHEET_TYPES, SHEET_TYPES

DEFAULT_LABELS = {
    'T1': 'Exam: T1',
    'T2': 'Exam: T2',
    'T3': 'Exam: T3',
    'TA': 'TA Marks',
    'FEEDBACK': 'Exit Survey',
    'MID': 'Mid Term',
    'END': 'End Term',
    'D2D': 'D2D',
}

DEFAULT_GRADES = [
    (0, 'F'), (30, 'D'), (36, 'C'), (43, 'C+'),
    (50, 'B'), (60, 'B+'), (70, 'A'), (80, 'A+'),
]


def _co_id(outcomes, index):
    return outcomes[index].id if index < len(outcomes) else None


def default_questions(assessment_type, outcomes):
    if assessment_type in ('T1', 'T2'):
        rows = []
        for i in range(max(4, min(4, len(outcomes) or 4))):
            rows.append({
                'key': f'Q{i + 1}',
                'label': f'Q{i + 1}',
                'max_marks': 5,
                'course_outcome_id': _co_id(outcomes, i),
            })
        return rows
    if assessment_type == 'T3':
        mapping = [
            ('Q1', 'Q1', 3, 0),
            ('Q2', 'Q2', 5, 1),
            ('Q3', 'Q3', 5, 2),
            ('Q4', 'Q4', 5, 2),
            ('Q5', 'Q5', 7, 1),
            ('Q6', 'Q6', 10, 3),
        ]
        return [
            {'key': k, 'label': lab, 'max_marks': mx, 'course_outcome_id': _co_id(outcomes, idx)}
            for k, lab, mx, idx in mapping
        ]
    if assessment_type == 'TA':
        return [
            {'key': 'Attendance', 'label': 'Attendance', 'max_marks': 5, 'course_outcome_id': None},
            {'key': 'Project', 'label': 'Project', 'max_marks': 10, 'course_outcome_id': _co_id(outcomes, 3)},
            {'key': 'Assignment1', 'label': 'Assignment 1', 'max_marks': 5, 'course_outcome_id': _co_id(outcomes, 0)},
            {'key': 'ClassTest1', 'label': 'Class Test 1', 'max_marks': 5, 'course_outcome_id': _co_id(outcomes, 2)},
        ]
    if assessment_type == 'FEEDBACK':
        if not outcomes:
            return [{'key': 'CO1', 'label': 'CO1 rating', 'max_marks': 5, 'course_outcome_id': None}]
        return [
            {
                'key': f'CO{i + 1}',
                'label': f'{co.co_code} statement rating',
                'max_marks': 5,
                'course_outcome_id': co.id,
            }
            for i, co in enumerate(outcomes)
        ]
    if assessment_type == 'MID':
        return [
            {'key': 'Q1', 'label': 'Q1 (10 marks)', 'max_marks': 10, 'course_outcome_id': _co_id(outcomes, 1)},
            {'key': 'Q2', 'label': 'Q2 (10 marks)', 'max_marks': 10, 'course_outcome_id': _co_id(outcomes, 2)},
        ]
    if assessment_type == 'END':
        return [
            {'key': 'Q1', 'label': 'Q1 (10 marks)', 'max_marks': 10, 'course_outcome_id': _co_id(outcomes, 2)},
            {'key': 'Q2', 'label': 'Q2 (10 marks)', 'max_marks': 10, 'course_outcome_id': _co_id(outcomes, 2)},
        ]
    if assessment_type == 'D2D':
        return [
            {'key': 'EVAL1_CO1', 'label': '[CO1] (5 Marks)', 'max_marks': 5, 'course_outcome_id': _co_id(outcomes, 0), 'group': 'Eval1'},
            {'key': 'EVAL1_CO4', 'label': '[CO4] (10 marks)', 'max_marks': 10, 'course_outcome_id': _co_id(outcomes, 3), 'group': 'Eval1'},
            {'key': 'EVAL2_CO4', 'label': '[CO4] 15 marks', 'max_marks': 15, 'course_outcome_id': _co_id(outcomes, 3), 'group': 'Eval2'},
            {'key': 'PBL_CO2', 'label': '[CO2] 10 marks', 'max_marks': 10, 'course_outcome_id': _co_id(outcomes, 1), 'group': 'PBL'},
            {'key': 'PBL_CO5', 'label': '[CO5] 10 marks', 'max_marks': 10, 'course_outcome_id': _co_id(outcomes, 4), 'group': 'PBL'},
        ]
    return []


def ensure_blocks(course, types):
    outcomes = list(course.outcomes.all().order_by('order', 'id'))
    created = []
    for typ in types:
        qs = Assessment.objects.filter(course=course, assessment_type=typ).order_by('id')
        obj = qs.first()
        if obj is None:
            obj = Assessment.objects.create(
                course=course,
                assessment_type=typ,
                exam_label=DEFAULT_LABELS.get(typ, typ),
                target_percent=50,
                use_ceiling=typ in ('T3', 'TA'),
                max_marks=20,
            )
        if not obj.exam_label:
            obj.exam_label = DEFAULT_LABELS.get(typ, typ)
            obj.save(update_fields=['exam_label'])
        if not obj.questions.exists():
            for i, q in enumerate(default_questions(typ, outcomes)):
                AssessmentQuestion.objects.create(
                    assessment=obj,
                    key=q['key'],
                    label=q['label'],
                    max_marks=q['max_marks'],
                    course_outcome_id=q['course_outcome_id'],
                    order=i,
                    group=q.get('group') or '',
                )
            created.append(typ)
        elif typ == 'FEEDBACK' and outcomes:
            existing_co_ids = set(obj.questions.values_list('course_outcome_id', flat=True))
            last_order = obj.questions.count()
            for i, co in enumerate(outcomes):
                if co.id not in existing_co_ids:
                    AssessmentQuestion.objects.create(
                        assessment=obj,
                        key=f'CO{i + 1}',
                        label=f'{co.co_code} rating',
                        max_marks=5,
                        course_outcome_id=co.id,
                        order=last_order + i,
                    )
        total = sum(float(q.max_marks) for q in obj.questions.all())
        if total:
            obj.max_marks = max(1, int(round(total)))
            obj.save(update_fields=['max_marks'])
    if not course.grade_bands.exists():
        for i, (mn, g) in enumerate(DEFAULT_GRADES):
            GradeBand.objects.create(course=course, min_marks=mn, grade=g, order=i)
    return created


def ensure_sheet_blocks(course):
    return ensure_blocks(course, SHEET_TYPES)


def ensure_lab_blocks(course):
    return ensure_blocks(course, LAB_SHEET_TYPES)
