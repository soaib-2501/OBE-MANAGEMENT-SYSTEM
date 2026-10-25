from django.conf import settings
from django.db import models
from courses.models import Course


class ClosingReport(models.Model):
    """Faculty-editable closing report fields for one course offering."""
    course = models.OneToOneField(Course, on_delete=models.CASCADE, related_name='closing_report')
    doc_title = models.CharField(max_length=255, default='Course Closing Report')
    semester_label = models.CharField(max_length=80, blank=True)
    module_coordinator = models.CharField(max_length=255, blank=True)
    watermark_text = models.CharField(max_length=80, default='CLOSING')

    teaching_methods = models.JSONField(default=list, blank=True)
    eval_strategies = models.JSONField(default=list, blank=True)
    co_current = models.JSONField(default=dict, blank=True)
    po_current = models.JSONField(default=dict, blank=True)
    grade_percents = models.JSONField(default=list, blank=True)
    co8_rows = models.JSONField(default=list, blank=True)
    popso9 = models.JSONField(default=dict, blank=True)
    suggestions = models.JSONField(default=list, blank=True)
    weak_actions = models.JSONField(default=list, blank=True)
    bright_actions = models.JSONField(default=list, blank=True)
    assignment1 = models.JSONField(default=list, blank=True)
    practice_qs = models.JSONField(default=list, blank=True)
    mini_projects = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Closing Report — {self.course}'

    def apply_defaults(self):
        if not self.doc_title:
            self.doc_title = 'Course Closing Report'
        if not self.watermark_text:
            self.watermark_text = 'CLOSING'
        if not self.semester_label:
            sem = 'Even' if self.course.semester == Course.Semester.EVEN else 'Odd'
            self.semester_label = f'{sem} Semester'
        if not self.suggestions:
            self.suggestions = [{'suggestion': '', 'co': '', 'popso': ''}]


class ClosingYearSnapshot(models.Model):
    """Previous-year CO/PO attainment keyed by course identity + session (not Course PK)."""
    class Source(models.TextChoices):
        SEED = 'SEED', 'Dummy / seed'
        UPLOAD = 'UPLOAD', 'Uploaded'
        COMPUTED = 'COMPUTED', 'Computed from an offering'

    course_code = models.CharField(max_length=30)
    nba_code = models.CharField(max_length=20, blank=True)
    academic_year = models.CharField(max_length=20)
    semester = models.CharField(max_length=6, choices=Course.Semester.choices)
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='closing_year_snapshots',
    )
    co_attainments = models.JSONField(default=dict, blank=True)
    po_attainments = models.JSONField(default=dict, blank=True)
    source = models.CharField(max_length=12, choices=Source.choices, default=Source.SEED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-academic_year']
        constraints = [
            models.UniqueConstraint(
                fields=['course_code', 'academic_year', 'semester', 'faculty'],
                name='unique_closing_year_snapshot_per_faculty',
            ),
        ]

    def __str__(self):
        return f'{self.course_code} {self.academic_year} closing snapshot'


DEFAULT_WEAK_ACTIONS = [
    {'action': 'Extra classes were conducted', 'proof': 'Proof of extra class'},
    {'action': 'Group Project were given to club the weak students with bright students', 'proof': 'List of project titles'},
]
DEFAULT_BRIGHT_ACTIONS = [
    {'action': 'Motivated to work on some research based projects', 'proof': 'List of project titles'},
]
