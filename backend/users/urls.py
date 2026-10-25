from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    MyTokenObtainPairView, MeView, UserViewSet, SignupView,
    LogoutView, ThrottledTokenRefreshView,
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('logout/', LogoutView.as_view(), name='token_logout'),
    path('refresh/', ThrottledTokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
] + router.urls
