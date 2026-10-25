from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from attainments.models import HistoricalCoAttainment
from attainments.scope import offering_identity
from attainments.year_utils import previous_academic_year
from courses.models import Course
from courses.serializers import CourseSerializer
from .models import OpeningReport
from .serializers import OpeningReportSerializer


def faculty_course(user, course_id):
    qs = Course.objects.prefetch_related('outcomes__mappings').select_related('faculty')
    if user.is_faculty_role:
        qs = qs.filter(faculty=user)
    return qs.filter(pk=course_id).first()


def historical_years_for(course):
    return sorted(
        set(
            HistoricalCoAttainment.objects.filter(
                offering_identity(course),
            ).values_list('academic_year', flat=True)
        ),
        reverse=True,
    )


class OpeningReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = faculty_course(request.user, course_id)
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        report, created = OpeningReport.objects.get_or_create(course=course)
        if created:
            report.apply_defaults()
            report.save()
        return Response({
            'report': OpeningReportSerializer(report).data,
            'course': CourseSerializer(course).data,
            'previous_academic_year': previous_academic_year(course.academic_year),
            'historical_years': historical_years_for(course),
        })

    def patch(self, request, course_id):
        course = faculty_course(request.user, course_id)
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        report, created = OpeningReport.objects.get_or_create(course=course)
        if created:
            report.apply_defaults()
            report.save()
        serializer = OpeningReportSerializer(report, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        report.refresh_from_db()
        return Response({
            'report': OpeningReportSerializer(report).data,
            'course': CourseSerializer(course).data,
            'previous_academic_year': previous_academic_year(course.academic_year),
            'historical_years': historical_years_for(course),
        })
