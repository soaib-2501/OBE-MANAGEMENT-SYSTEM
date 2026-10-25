from django.conf import settings
from django.db import models
from courses.models import Course, CourseOutcome


class Attainment(models.Model):
    """
    SRS 'Attainments' table: Attainment_ID · Course_ID · CO_Attainment · PO_Attainment · PSO_Attainment.
    Stored per Course Outcome so PO/PSO attainment can be derived from the CO-PO-PSO mapping.
    direct/indirect follow the standard OBE formula:
      direct = 60% test average + 20% assignment average
      indirect = 20% course-exit-feedback average
      final = direct + indirect
    """
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='attainments')
    course_outcome = models.OneToOneField(CourseOutcome, on_delete=models.CASCADE, related_name='attainment')

    direct_attainment = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    indirect_attainment = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    final_attainment = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    attainment_level = models.PositiveSmallIntegerField(null=True, blank=True)  # 0-3 scale
    breakdown = models.JSONField(default=dict, blank=True)
    calculated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.course_outcome.co_code} = {self.final_attainment}'


class ProgramAttainment(models.Model):
    """PO/PSO attainment for a course, derived from CO attainment × mapping strength."""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='program_attainments')
    po_key = models.CharField(max_length=8)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    attainment_level = models.PositiveSmallIntegerField(null=True, blank=True)
    calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('course', 'po_key')
        ordering = ['po_key']

    def __str__(self):
        return f'{self.course.course_code} {self.po_key} = {self.percentage}'


class HistoricalCoAttainment(models.Model):
    """
    CO attainment keyed by course identity + session, not by a single Course PK.
    Each academic year is a separate Course row, so Opening Report looks up
    previous years with course_code + academic_year + semester + co_code.
    """
    course_code = models.CharField(max_length=30)
    nba_code = models.CharField(max_length=20, blank=True)
    academic_year = models.CharField(max_length=20)
    semester = models.CharField(max_length=6, choices=Course.Semester.choices)
    co_code = models.CharField(max_length=20)
    attainment = models.DecimalField(max_digits=5, decimal_places=2)
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='historical_co_attainments',
    )
    source_course = models.ForeignKey(
        Course, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='archived_co_attainments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-academic_year', 'co_code']
        constraints = [
            models.UniqueConstraint(
                fields=['course_code', 'academic_year', 'semester', 'co_code', 'faculty'],
                name='unique_historical_co_attainment_per_faculty',
            ),
        ]

    def __str__(self):
        return f'{self.course_code} {self.co_code} {self.academic_year} = {self.attainment}'
