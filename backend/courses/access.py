def faculty_owns_course(user, course):
    """Every login, including admin, only owns courses they created."""
    if user is None or not getattr(user, 'is_authenticated', False) or course is None:
        return False
    return course.faculty_id == user.id


def scope_to_owner(user, qs, lookup='faculty'):
    if user is None or not getattr(user, 'is_authenticated', False):
        return qs.none()
    return qs.filter(**{lookup: user})


def owned_course_or_error(user, course, error_cls):
    if not faculty_owns_course(user, course):
        raise error_cls('You can only use your own course offerings.')
    return course
