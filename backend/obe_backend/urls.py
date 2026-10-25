from django.contrib import admin
from django.urls import path, include
from .dashboard import DashboardSummaryView

urlpatterns = [
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
