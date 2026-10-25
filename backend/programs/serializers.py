from rest_framework import serializers
from .models import Programme, ProgrammeStatement


class ProgrammeStatementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgrammeStatement
        fields = ['id', 'kind', 'group_title', 'code', 'title', 'statement', 'order']
        extra_kwargs = {'id': {'read_only': False, 'required': False}}


class ProgrammeSerializer(serializers.ModelSerializer):
    statements = ProgrammeStatementSerializer(many=True, required=False)

    class Meta:
        model = Programme
        fields = ['id', 'degree', 'branch', 'name', 'slug', 'order', 'statements']

    def create(self, validated_data):
        statements = validated_data.pop('statements', [])
        obj = Programme.objects.create(**validated_data)
        self._replace_statements(obj, statements)
        return obj

    def update(self, instance, validated_data):
        statements = validated_data.pop('statements', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if statements is not None:
            self._replace_statements(instance, statements)
        return instance

    def _replace_statements(self, programme, rows):
        programme.statements.all().delete()
        objs = []
        for i, row in enumerate(rows):
            row = dict(row)
            row.pop('id', None)
            row['order'] = i
            objs.append(ProgrammeStatement(programme=programme, **row))
        if objs:
            ProgrammeStatement.objects.bulk_create(objs)
