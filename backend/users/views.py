from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User
from .serializers import (
    MyTokenObtainPairSerializer,
    UserSerializer,
    SignupSerializer,
    effective_role,
    admin_account_exists,
)
from .permissions import IsAdminRole
from obe_backend.http import AuthRateThrottle


class MyTokenObtainPairView(TokenObtainPairView):
    """POST username + password -> access & refresh tokens (+ role, name)."""
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]
    serializer_class = MyTokenObtainPairSerializer


class ThrottledTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]


class SignupView(APIView):
    """First administrator only. Faculty accounts are created by an admin."""
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def get(self, request):
        open_first_admin = not admin_account_exists()
        return Response({
            'admin_signup_open': open_first_admin,
            'signup_open': open_first_admin,
        })

    def post(self, request):
        with transaction.atomic():
            locked = User.objects.select_for_update().filter(
                Q(role=User.Role.ADMIN) | Q(is_superuser=True),
            )
            if locked.exists():
                return Response(
                    {'detail': 'Public signup is closed. Ask an administrator to create your account.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            payload = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            payload['role'] = User.Role.ADMIN
            serializer = SignupSerializer(data=payload)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
        refresh = MyTokenObtainPairSerializer.get_token(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': effective_role(user),
            'name': user.get_full_name() or user.username,
            'user_id': user.id,
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('refresh')
        if not token:
            return Response({'detail': 'refresh is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(token).blacklist()
        except Exception:
            return Response({'detail': 'Invalid refresh token.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """GET the currently logged-in user's profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = UserSerializer(request.user, context={'request': request}).data
        data['role'] = effective_role(request.user)
        return Response(data)


class UserViewSet(viewsets.ModelViewSet):
    """
    Admin: add / update / delete faculty. Faculty may only retrieve themselves.
    """
    serializer_class = UserSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if user.is_admin_role:
            qs = User.objects.all().order_by('username')
            role = self.request.query_params.get('role')
            if role:
                qs = qs.filter(role=role)
            return qs
        return User.objects.filter(pk=user.pk)

    def get_permissions(self):
        if self.request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            return [IsAdminRole()]
        return [IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        if str(kwargs.get('pk')) == str(request.user.id):
            return Response({'detail': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)
