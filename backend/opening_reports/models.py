from copy import deepcopy
from django.db import models
from courses.models import Course
from .defaults import (
    DEFAULT_BRIGHT, DEFAULT_EVAL, DEFAULT_TEACHING, DEFAULT_WEAK,
)


class OpeningReport(models.Model):
    """Report-specific fields for one Course offering. COs and mapping live on Course."""
    course = models.OneToOneField(Course, on_delete=models.CASCADE, related_name='opening_report')
    semester_label = models.CharField(max_length=80, blank=True)
    watermark_text = models.CharField(max_length=80, default='OPENING')

    gaps_nil = models.BooleanField(default=True)
    gaps_rows = models.JSONField(default=list, blank=True)

    mods_nil = models.BooleanField(default=True)
    mods_rows = models.JSONField(default=list, blank=True)

    co_actions = models.JSONField(default=dict, blank=True)
    co_targets = models.JSONField(default=dict, blank=True)
    co_prev_years = models.JSONField(default=dict, blank=True)

    teaching_methods = models.JSONField(default=list, blank=True)
    teaching_other = models.CharField(max_length=500, blank=True)
    weak_strategies = models.JSONField(default=list, blank=True)
    weak_other = models.CharField(max_length=500, blank=True)
    bright_strategies = models.JSONField(default=list, blank=True)
    bright_other = models.CharField(max_length=500, blank=True)
    eval_strategies = models.JSONField(default=list, blank=True)
    eval_other = models.CharField(max_length=500, blank=True)
    module_coordinator = models.TextField(blank=True)

    guidelines = models.JSONField(default=list, blank=True)
    efforts_rows = models.JSONField(default=list, blank=True)
    impact_points = models.JSONField(default=list, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Opening Report — {self.course}'

    def apply_defaults(self):
        if not self.teaching_methods:
            self.teaching_methods = deepcopy(DEFAULT_TEACHING)
        if not self.weak_strategies:
            self.weak_strategies = deepcopy(DEFAULT_WEAK)
        if not self.bright_strategies:
            self.bright_strategies = deepcopy(DEFAULT_BRIGHT)
        if not self.eval_strategies:
            self.eval_strategies = deepcopy(DEFAULT_EVAL)
        if not self.co_actions:
            self.co_actions = {
                co.co_code: 'Include more practice questions'
                for co in self.course.outcomes.all()
            }
        if not self.semester_label:
            sem = 'Even' if self.course.semester == Course.Semester.EVEN else 'Odd'
            self.semester_label = f'{sem} Semester'
        if not self.watermark_text:
            self.watermark_text = 'OPENING'
