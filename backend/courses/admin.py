from django.contrib import admin
from .models import (
    AcademicSession, FacultyProfile, NbaSubjectCatalog,
    Course, CourseOutcome, CoPoMapping, LectureModule, CourseBook,
)

admin.site.register(AcademicSession)
admin.site.register(FacultyProfile)
admin.site.register(NbaSubjectCatalog)
admin.site.register(Course)
admin.site.register(CourseOutcome)
admin.site.register(CoPoMapping)
admin.site.register(LectureModule)
admin.site.register(CourseBook)
