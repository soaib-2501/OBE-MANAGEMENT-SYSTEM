from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from attainments.year_utils import previous_academic_year
from courses.models import Course
from courses.serializers import CourseSerializer

from .history import compact_year
from .models import ClosingReport, ClosingYearSnapshot
from .serializers import ClosingReportSerializer, ClosingYearSnapshotSerializer
from .services import build_synced, collect_history, hydrate_report, seed_dummy_history


def faculty_course(user, course_id, prefetch=True):
    qs = Course.objects.all()
    if prefetch:
        qs = qs.prefetch_related('outcomes__mappings').select_related('faculty')
    if user.is_faculty_role:
        qs = qs.filter(faculty=user)
    return qs.filter(pk=course_id).first()


def payload(course, report, force_tables=False):
    synced = build_synced(course)
    years_newest_first, by_year, stored = collect_history(course)
    years = list(reversed(years_newest_first))
    hydrate_report(report, course, synced, by_year, years, force_tables=force_tables)
    report.refresh_from_db()
    return {
        'report': ClosingReportSerializer(report).data,
        'course': CourseSerializer(course).data,
        'synced': synced,
        'history': {
            'prior_years': years,
            'by_year': by_year,
            'stored_years': sorted(stored, reverse=True),
            'has_stored': bool(stored),
        },
        'previous_academic_year': previous_academic_year(course.academic_year),
        'previous_year_label': compact_year(previous_academic_year(course.academic_year) or ''),
        'current_year_label': compact_year(course.academic_year),
    }


class ClosingReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = faculty_course(request.user, course_id)
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        report, created = ClosingReport.objects.get_or_create(course=course)
        if created:
            report.apply_defaults()
            report.save()
        return Response(payload(course, report))

    def patch(self, request, course_id):
        course = faculty_course(request.user, course_id, prefetch=False)
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        report, created = ClosingReport.objects.get_or_create(course=course)
        if created:
            report.apply_defaults()
            report.save()
        serializer = ClosingReportSerializer(report, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response({'report': ClosingReportSerializer(instance).data})


class ClosingReportLoadHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        course = faculty_course(request.user, course_id)
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        created, _ = seed_dummy_history(course)
        report, was_created = ClosingReport.objects.get_or_create(course=course)
        if was_created:
            report.apply_defaults()
            report.save()
        data = payload(course, report, force_tables=True)
        data['status'] = (
            f'Loaded dummy previous-year data for {", ".join(created)}.'
            if created
            else 'Previous-year snapshots were already on file.'
        )
        data['seeded_years'] = created
        return Response(data)


class ClosingYearSnapshotView(APIView):
    """Future upload path: store CO/PO attainments for a prior session."""
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        course = faculty_course(request.user, course_id)
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        year = (request.data.get('academic_year') or '').strip()
        if not year:
            return Response({'error': 'academic_year is required.'}, status=400)
        source = request.data.get('source') or ClosingYearSnapshot.Source.UPLOAD
        if source not in ClosingYearSnapshot.Source.values:
            source = ClosingYearSnapshot.Source.UPLOAD
        obj, _ = ClosingYearSnapshot.objects.update_or_create(
            course_code=course.course_code,
            academic_year=year,
            semester=request.data.get('semester') or course.semester,
            defaults={
                'nba_code': request.data.get('nba_code') or course.nba_code or '',
                'co_attainments': request.data.get('co_attainments') or {},
                'po_attainments': request.data.get('po_attainments') or {},
                'source': source,
            },
        )
        report, _ = ClosingReport.objects.get_or_create(course=course)
        data = payload(course, report)
        data['snapshot'] = ClosingYearSnapshotSerializer(obj).data
        return Response(data, status=201)
