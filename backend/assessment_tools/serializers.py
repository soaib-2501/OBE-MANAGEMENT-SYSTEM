from rest_framework import serializers
from .models import AssessmentToolsDocument, tools_are_co_rows


class AssessmentToolsDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentToolsDocument
        fields = [
            'id', 'course', 'doc_title', 'sub_heading', 'semester_label',
            'module_coordinator', 'watermark_text', 'tools', 'updated_at',
        ]
        read_only_fields = ['id', 'course', 'updated_at']

    def validate_tools(self, value):
        if value in (None, ''):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Tools must be a list.')
        if not tools_are_co_rows(value) and value:
            raise serializers.ValidationError('Each row needs direct and indirect assessment tools.')
        cleaned = []
        for row in value:
            if not isinstance(row, dict):
                raise serializers.ValidationError('Each row must be an object.')
            cleaned.append({
                'co_code': str(row.get('co_code') or '').strip(),
                'direct': str(row.get('direct') or '').strip(),
                'indirect': str(row.get('indirect') or '').strip(),
            })
        return cleaned
