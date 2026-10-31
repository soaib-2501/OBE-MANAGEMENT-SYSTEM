from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from .dashboard import DashboardSummaryView

def api_root(request):
    return JsonResponse({
        "status": "online",
        "message": "OBE Management System API is running successfully.",
        "admin": "/admin/",
        "api": "/api/"
    })

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),

    # Auth (login / refresh) + user management
    path('api/auth/', include('users.urls')),
    path('api/dashboard/', DashboardSummaryView.as_view(), name='dashboard'),

    # OBE modules — one router include per app
    path('api/courses/', include('courses.urls')),
    path('api/assessments/', include('assessments.urls')),
    path('api/attainments/', include('attainments.urls')),
    path('api/opening-reports/', include('opening_reports.urls')),
    path('api/assessment-tools/', include('assessment_tools.urls')),
    path('api/closing-reports/', include('closing_reports.urls')),
    path('api/programs/', include('programs.urls')),
]
