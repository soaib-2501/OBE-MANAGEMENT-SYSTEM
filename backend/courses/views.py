from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from users.permissions import IsAdminRole
from .access import scope_to_owner
from .copy_offering import catalog_for_new_session, copy_offering_to_session, load_session
from .models import (
    AcademicSession, FacultyProfile, NbaSubjectCatalog, Course, CourseOutcome, CoPoMapping,
    copy_catalog_from_previous,
)
from .serializers import (
    AcademicSessionSerializer, FacultyProfileSerializer, NbaSubjectCatalogSerializer,
    CourseSerializer, CourseOutcomeSerializer, CoPoMappingSerializer,
)


def faculty_course_qs(user, qs):
    return scope_to_owner(user, qs, 'faculty')


class AcademicSessionViewSet(viewsets.ModelViewSet):
    serializer_class = AcademicSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    queryset = AcademicSession.objects.all()

    def get_permissions(self):
        if self.request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        session = serializer.save()
        copy_catalog_from_previous(session)


class FacultyProfileViewSet(viewsets.ModelViewSet):
    serializer_class = FacultyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = FacultyProfile.objects.select_related('user').all()
        campus = self.request.query_params.get('campus')
        if campus:
            qs = qs.filter(campus=campus)
        if self.request.query_params.get('active') == '1':
            qs = qs.filter(is_active=True)
        return qs


class NbaSubjectCatalogViewSet(viewsets.ModelViewSet):
    serializer_class = NbaSubjectCatalogSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        if self.request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = NbaSubjectCatalog.objects.select_related('session').all()
        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(session_id=session_id)
        year = self.request.query_params.get('calendar_year')
        sem = self.request.query_params.get('semester_type')
        if year:
            qs = qs.filter(session__calendar_year=year)
        if sem:
            qs = qs.filter(session__semester_type=sem)
        program = self.request.query_params.get('program')
        if program:
            qs = qs.filter(program_name__icontains=program)
        kind = (self.request.query_params.get('kind') or '').upper()
        if kind in ('LAB', 'THEORY'):
            lab_q = {'course_name__iregex': r'\yLAB\y'}
            if kind == 'LAB':
                qs = qs.filter(**lab_q)
            else:
                qs = qs.exclude(**lab_q)
        return qs


class CourseViewSet(viewsets.ModelViewSet):
    """Each login sees and edits only the offerings they created."""
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Course.objects.prefetch_related('outcomes__mappings', 'modules', 'books').select_related(
            'faculty', 'academic_session', 'catalog_entry', 'teaching_faculty', 'course_coordinator', 'programme',
        )
        qs = faculty_course_qs(self.request.user, qs)
        year = self.request.query_params.get('academic_year') or self.request.query_params.get('session')
        if year:
            qs = qs.filter(academic_year=year)
        session_id = self.request.query_params.get('academic_session')
        if session_id:
            qs = qs.filter(academic_session_id=session_id)
        kind = (self.request.query_params.get('course_kind') or '').upper()
        if kind in ('LAB', 'THEORY'):
            qs = qs.filter(course_kind=kind)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        extra = {'faculty': user}
        coord = serializer.validated_data.get('course_coordinator')
        if not serializer.validated_data.get('coordinator_names'):
            extra['coordinator_names'] = (
                coord.full_name if coord else (user.get_full_name() or user.username)
            )
        serializer.save(**extra)

    def perform_update(self, serializer):
        serializer.save(faculty=self.request.user)

    @action(detail=False, methods=['post'], url_path='from-previous')
    def from_previous(self, request):
        source = self.get_queryset().filter(pk=request.data.get('source')).first()
        if not source:
            return Response({'detail': 'Previous course was not found on your account.'}, status=status.HTTP_404_NOT_FOUND)
        session = load_session(request.data.get('academic_session'))
        catalog = catalog_for_new_session(source, session, request.data.get('catalog_entry'))
        from courses.models import FacultyProfile
        teaching = coordinator = None
        if request.data.get('teaching_faculty'):
            teaching = FacultyProfile.objects.filter(pk=request.data.get('teaching_faculty')).first()
        if request.data.get('course_coordinator'):
            coordinator = FacultyProfile.objects.filter(pk=request.data.get('course_coordinator')).first()
        course = copy_offering_to_session(
            request.user, source, session, catalog, teaching, coordinator,
        )
        return Response(CourseSerializer(course, context={'request': request}).data, status=status.HTTP_201_CREATED)


class CourseOutcomeViewSet(viewsets.ModelViewSet):
    serializer_class = CourseOutcomeSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = CourseOutcome.objects.select_related('course').prefetch_related('mappings')
        qs = scope_to_owner(self.request.user, qs, 'course__faculty')
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs


class CoPoMappingViewSet(viewsets.ModelViewSet):
    serializer_class = CoPoMappingSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = CoPoMapping.objects.select_related('course_outcome__course')
        qs = scope_to_owner(self.request.user, qs, 'course_outcome__course__faculty')
        return qs
