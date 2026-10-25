from rest_framework import serializers
from .models import ClosingReport, ClosingYearSnapshot


class ClosingReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClosingReport
        fields = [
            'id', 'course', 'doc_title', 'semester_label', 'module_coordinator',
            'watermark_text', 'teaching_methods', 'eval_strategies',
            'co_current', 'po_current', 'grade_percents', 'co8_rows', 'popso9',
            'suggestions', 'weak_actions', 'bright_actions',
            'assignment1', 'practice_qs', 'mini_projects', 'updated_at',
        ]
        read_only_fields = ['id', 'course', 'updated_at']


class ClosingYearSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClosingYearSnapshot
        fields = [
            'id', 'course_code', 'nba_code', 'academic_year', 'semester', 'faculty',
            'co_attainments', 'po_attainments', 'source', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']
