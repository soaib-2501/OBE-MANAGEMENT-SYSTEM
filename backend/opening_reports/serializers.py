from rest_framework import serializers
from .models import OpeningReport


class OpeningReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpeningReport
        fields = [
            'id', 'course', 'semester_label', 'watermark_text',
            'gaps_nil', 'gaps_rows', 'mods_nil', 'mods_rows', 'co_actions', 'co_targets', 'co_prev_years',
            'teaching_methods', 'teaching_other',
            'weak_strategies', 'weak_other',
            'bright_strategies', 'bright_other',
            'eval_strategies', 'eval_other',
            'module_coordinator',
            'guidelines', 'efforts_rows', 'impact_points', 'updated_at',
        ]
        read_only_fields = ['id', 'course', 'updated_at']
