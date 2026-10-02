from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from courses.models import Course
from courses.serializers import CourseSerializer
from .models import AssessmentToolsDocument, default_co_rows, default_course_heading, default_title, tools_are_co_rows
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
        rows = default_co_rows(course, doc.tools if tools_are_co_rows(doc.tools) else None)
        dirty = created
        if rows != (doc.tools or []):
            doc.tools = rows
            dirty = True
        if not doc.doc_title or doc.doc_title in ('Assessment Tools',):
            doc.doc_title = default_title(course)
            dirty = True
        if not doc.sub_heading or doc.sub_heading.startswith('Cognitive level'):
            doc.sub_heading = default_course_heading(course)
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
        if created:
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
