"""Copy one user's offering into a new session without touching the source."""
from copy import deepcopy

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from rest_framework.exceptions import ValidationError

from assessments.models import Assessment, AssessmentQuestion, GradeBand, Student, StudentMark
from assessment_tools.models import AssessmentToolsDocument
from attainments.models import Attainment, ProgramAttainment
from closing_reports.models import ClosingReport
from courses.models import (
    AcademicSession, Course, CourseBook, CourseOutcome, CoPoMapping, LectureModule, NbaSubjectCatalog,
)
from opening_reports.models import OpeningReport


def _values(instance, skip):
    data = {}
    for field in instance._meta.concrete_fields:
        if field.primary_key or field.name in skip or getattr(field, 'auto_now', False) or getattr(field, 'auto_now_add', False):
            continue
        value = getattr(instance, field.name)
        if isinstance(value, (list, dict)):
            value = deepcopy(value)
        data[field.name] = value
    return data


def related_or_none(instance, name):
    try:
        return getattr(instance, name)
    except ObjectDoesNotExist:
        return None


def catalog_for_new_session(source, session, catalog_id=None):
    if catalog_id:
        row = NbaSubjectCatalog.objects.filter(pk=catalog_id, session=session).first()
        if not row:
            raise ValidationError({'catalog_entry': 'Pick an NBA subject from the new session.'})
        return row
    return NbaSubjectCatalog.objects.filter(
        session=session,
        course_code=source.course_code,
        nba_code=source.nba_code,
    ).first()


@transaction.atomic
def copy_offering_to_session(user, source, session, catalog=None, teaching_faculty=None, course_coordinator=None):
    if source.faculty_id != user.id:
        raise ValidationError('You can only copy your own courses.')
    if source.academic_session_id and source.academic_session_id == session.id:
        raise ValidationError('Choose a different session. The previous course stays unchanged.')

    final_code = catalog.course_code if catalog is not None else source.course_code
    exists = Course.objects.filter(
        faculty=user,
        course_code=final_code,
        academic_year=session.label,
        programme=source.programme,
    ).exists()
    if exists:
        raise ValidationError(
            'You already have this course in that session. Open it from your list and edit that copy.'
        )

    course = Course(
        faculty=user,
        academic_session=session,
        catalog_entry=catalog,
        semester=session.semester_type,
        academic_year=session.label,
        teaching_faculty=teaching_faculty or source.teaching_faculty,
        course_coordinator=course_coordinator or source.course_coordinator,
    )
    for name, value in _values(source, {
        'faculty', 'academic_session', 'catalog_entry', 'semester', 'academic_year',
        'teaching_faculty', 'course_coordinator', 'is_lab',
    }).items():
        setattr(course, name, value)
    if catalog is not None:
        course.course_code = catalog.course_code
        course.course_name = catalog.course_name
        course.nba_code = catalog.nba_code
        course.year_of_study = catalog.year_of_study
        course.semester_number = catalog.semester_number
        if catalog.credits:
            course.credits = catalog.credits
    course.save()

    co_map = {}
    for outcome in source.outcomes.all().prefetch_related('mappings'):
        new_outcome = CourseOutcome.objects.create(
            course=course,
            **_values(outcome, {'course'}),
        )
        co_map[outcome.id] = new_outcome
        for mapping in outcome.mappings.all():
            CoPoMapping.objects.create(
                course_outcome=new_outcome,
                **_values(mapping, {'course_outcome'}),
            )

    for module in source.modules.all():
        LectureModule.objects.create(course=course, **_values(module, {'course'}))
    for book in source.books.all():
        CourseBook.objects.create(course=course, **_values(book, {'course'}))

    opening = related_or_none(source, 'opening_report')
    if opening is not None:
        OpeningReport.objects.create(course=course, **_values(opening, {'course'}))

    tools = related_or_none(source, 'assessment_tools')
    if tools is not None:
        AssessmentToolsDocument.objects.create(course=course, **_values(tools, {'course'}))

    closing = related_or_none(source, 'closing_report')
    if closing is not None:
        ClosingReport.objects.create(course=course, **_values(closing, {'course'}))

    assessment_map = {}
    question_map = {}
    for assessment in source.assessments.all().prefetch_related('questions'):
        new_assessment = Assessment.objects.create(
            course=course,
            **_values(assessment, {'course'}),
        )
        assessment_map[assessment.id] = new_assessment
        for question in assessment.questions.all():
            payload = _values(question, {'assessment', 'course_outcome'})
            old_co = question.course_outcome_id
            payload['course_outcome'] = co_map.get(old_co) if old_co else None
            new_question = AssessmentQuestion.objects.create(assessment=new_assessment, **payload)
            question_map[question.id] = new_question

    student_map = {}
    for student in source.students.all():
        student_map[student.id] = Student.objects.create(
            course=course,
            **_values(student, {'course'}),
        )

    for mark in StudentMark.objects.filter(assessment__course=source):
        new_assessment = assessment_map.get(mark.assessment_id)
        new_student = student_map.get(mark.student_id)
        if not new_assessment or not new_student:
            continue
        StudentMark.objects.create(
            assessment=new_assessment,
            student=new_student,
            question=question_map.get(mark.question_id),
            course_outcome=co_map.get(mark.course_outcome_id) if mark.course_outcome_id else None,
            marks_obtained=mark.marks_obtained,
        )

    for row in Attainment.objects.filter(course=source):
        new_outcome = co_map.get(row.course_outcome_id)
        if not new_outcome:
            continue
        Attainment.objects.create(
            course=course,
            course_outcome=new_outcome,
            **_values(row, {'course', 'course_outcome'}),
        )
    for row in ProgramAttainment.objects.filter(course=source):
        ProgramAttainment.objects.create(course=course, **_values(row, {'course'}))

    for band in GradeBand.objects.filter(course=source):
        GradeBand.objects.create(course=course, **_values(band, {'course'}))

    return course


def load_session(session_id):
    try:
        return AcademicSession.objects.get(pk=int(session_id))
    except (AcademicSession.DoesNotExist, TypeError, ValueError):
        raise ValidationError({'academic_session': 'Select a valid session.'})
