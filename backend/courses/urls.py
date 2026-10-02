from rest_framework.routers import DefaultRouter
from .views import (
    AcademicSessionViewSet, FacultyProfileViewSet, NbaSubjectCatalogViewSet,
    CourseViewSet, CourseOutcomeViewSet, CoPoMappingViewSet,
)

router = DefaultRouter()
router.register('sessions', AcademicSessionViewSet, basename='academic-session')
router.register('faculty-directory', FacultyProfileViewSet, basename='faculty-profile')
router.register('catalog', NbaSubjectCatalogViewSet, basename='nba-catalog')
router.register('outcomes', CourseOutcomeViewSet, basename='course-outcome')
router.register('mappings', CoPoMappingViewSet, basename='co-po-mapping')
router.register('', CourseViewSet, basename='course')

urlpatterns = router.urls
