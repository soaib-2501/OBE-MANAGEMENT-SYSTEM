from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from users.permissions import IsAdminRole
from .models import Programme, ProgrammeStatement
from .seed import seed_programmes
from .serializers import ProgrammeSerializer


class ProgrammeViewSet(viewsets.ModelViewSet):
    serializer_class = ProgrammeSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    queryset = Programme.objects.prefetch_related('statements').all()

    def get_permissions(self):
        if self.request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        if not Programme.objects.exists():
            seed_programmes(Programme, ProgrammeStatement)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['post'], permission_classes=[IsAdminRole])
    def seed(self, request):
        created = seed_programmes(Programme, ProgrammeStatement)
        qs = Programme.objects.prefetch_related('statements').all()
        return Response({
            'created': created,
            'programmes': ProgrammeSerializer(qs, many=True).data,
        })
