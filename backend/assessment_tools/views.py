from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from courses.models import Course
from courses.serializers import CourseSerializer
from .models import (
    AssessmentToolsDocument, default_question_tools, default_title, tools_are_question_map,
)
from .serializers import AssessmentToolsDocumentSerializer


def faculty_course(user, course_id):
    qs = Course.objects.prefetch_related('outcomes').select_related('faculty')
    if user.is_faculty_role:
        qs = qs.filter(faculty=user)
    return qs.filter(pk=course_id).first()


class AssessmentToolsDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = faculty_course(request.user, course_id)
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        doc, created = AssessmentToolsDocument.objects.get_or_create(course=course)
        dirty = created
        if not tools_are_question_map(doc.tools):
            doc.tools = default_question_tools(course)
            dirty = True
        if not doc.doc_title or doc.doc_title.startswith('Assessment Tools for CO Attainment'):
            doc.doc_title = default_title()
            dirty = True
        if not doc.semester_label:
            sem = 'EVEN' if course.semester == 'EVEN' else 'ODD'
            doc.semester_label = f'{sem} Semester'
            dirty = True
        if dirty:
            doc.save()
        return Response({
            'document': AssessmentToolsDocumentSerializer(doc).data,
            'course': CourseSerializer(course).data,
        })

    def patch(self, request, course_id):
        course = faculty_course(request.user, course_id)
        if not course:
            return Response({'error': 'Course not found.'}, status=404)
        doc, created = AssessmentToolsDocument.objects.get_or_create(course=course)
        if created or not tools_are_question_map(doc.tools):
            doc.apply_defaults()
            doc.save()
        serializer = AssessmentToolsDocumentSerializer(doc, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        doc.refresh_from_db()
        return Response({
            'document': AssessmentToolsDocumentSerializer(doc).data,
            'course': CourseSerializer(course).data,
        })
