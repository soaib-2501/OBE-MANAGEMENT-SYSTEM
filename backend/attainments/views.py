from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from obe_backend.http import parse_pk
from .models import Attainment, HistoricalCoAttainment, ProgramAttainment
from .scope import offering_identity
from .serializers import AttainmentSerializer, ProgramAttainmentSerializer
from .services import calculate_for_course
from .year_utils import previous_academic_year


class AttainmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only for normal CRUD (GET list/retrieve only) — attainments are never
    edited by hand, only ever written via the /calculate/ action below.
    """
    queryset = Attainment.objects.all()
    serializer_class = AttainmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_faculty_role:
            qs = qs.filter(course__faculty=user)
        course_id = self.request.query_params.get('course')
        return qs.filter(course_id=course_id) if course_id else qs

    @action(detail=False, methods=['get'])
    def program(self, request):
        course_id = request.query_params.get('course')
        qs = ProgramAttainment.objects.all()
        if request.user.is_faculty_role:
            qs = qs.filter(course__faculty=request.user)
        if course_id:
            qs = qs.filter(course_id=course_id)
        return Response(ProgramAttainmentSerializer(qs, many=True).data)

    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """POST { "course": <id> } -> recalculates CO and PO/PSO attainment."""
        from courses.models import Course
        if not request.data.get('course'):
            return Response({'error': 'course is required'}, status=400)
        course_id = parse_pk(request.data.get('course'), 'course')
        course = Course.objects.filter(pk=course_id).first()
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        if request.user.is_faculty_role and course.faculty_id != request.user.id:
            return Response({'error': 'Not allowed.'}, status=403)
        co_results, po_results = calculate_for_course(course_id)
        return Response({
            'co': AttainmentSerializer(co_results, many=True).data,
            'po_pso': ProgramAttainmentSerializer(po_results, many=True).data,
        })

    @action(detail=False, methods=['get'])
    def sheet(self, request):
        from courses.models import Course
        from .services import build_sheet
        if not request.query_params.get('course'):
            return Response({'error': 'course is required'}, status=400)
        course_id = parse_pk(request.query_params.get('course'), 'course')
        course = Course.objects.filter(pk=course_id).first()
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        if request.user.is_faculty_role and course.faculty_id != request.user.id:
            return Response({'error': 'Not allowed.'}, status=403)
        return Response(build_sheet(course))

    @action(detail=False, methods=['get'])
    def historical(self, request):
        from courses.models import Course
        if not request.query_params.get('course'):
            return Response({'error': 'course is required'}, status=400)
        course_id = parse_pk(request.query_params.get('course'), 'course')
        course = Course.objects.filter(pk=course_id).first()
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        if request.user.is_faculty_role and course.faculty_id != request.user.id:
            return Response({'error': 'Not allowed.'}, status=403)
        year = request.query_params.get('academic_year') or previous_academic_year(course.academic_year)
        base = HistoricalCoAttainment.objects.filter(offering_identity(course))
        available_years = sorted(set(base.values_list('academic_year', flat=True)), reverse=True)
        records = []
        if year:
            for row in base.filter(academic_year=year):
                records.append({
                    'co_code': row.co_code,
                    'attainment': str(row.attainment),
                    'academic_year': row.academic_year,
                    'nba_code': row.nba_code,
                })
        return Response({
            'requested_year': year,
            'available_years': available_years,
            'records': records,
        })
