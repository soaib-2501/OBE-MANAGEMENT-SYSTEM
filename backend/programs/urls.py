from rest_framework.routers import DefaultRouter
from .views import ProgrammeViewSet

router = DefaultRouter()
router.register('', ProgrammeViewSet, basename='programme')
urlpatterns = router.urls
