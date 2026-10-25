from rest_framework import serializers
from .models import AssessmentToolsDocument, tools_are_question_map


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
        cleaned = []
        for tool in value:
            if not isinstance(tool, dict):
                raise serializers.ValidationError('Each assessment tool must be an object.')
            questions = tool.get('questions') or []
            if not isinstance(questions, list):
                raise serializers.ValidationError('Each tool needs a questions list.')
            qs = []
            for row in questions:
                if not isinstance(row, dict):
                    raise serializers.ValidationError('Each question must be an object.')
                qs.append({
                    'qno': str(row.get('qno') or '').strip(),
                    'co_code': str(row.get('co_code') or '').strip(),
                    'ques_level': str(row.get('ques_level') or '').strip(),
                    'remarks': str(row.get('remarks') or '').strip(),
                })
            cleaned.append({
                'name': str(tool.get('name') or '').strip(),
                'questions': qs,
            })
        if cleaned and not tools_are_question_map(cleaned):
            raise serializers.ValidationError('Each assessment tool needs a questions list.')
        return cleaned
