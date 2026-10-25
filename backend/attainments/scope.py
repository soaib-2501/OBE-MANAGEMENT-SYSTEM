from django.db.models import Q


def offering_identity(course):
    """Limit history/snapshots to this faculty's offering of the subject."""
    q = Q(course_code=course.course_code, semester=course.semester)
    if course.faculty_id:
        return q & Q(faculty_id=course.faculty_id)
    return q & Q(faculty__isnull=True)
