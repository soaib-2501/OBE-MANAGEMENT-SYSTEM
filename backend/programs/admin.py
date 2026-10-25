from django.contrib import admin
from .models import Programme, ProgrammeStatement


class ProgrammeStatementInline(admin.TabularInline):
    model = ProgrammeStatement
    extra = 0


@admin.register(Programme)
class ProgrammeAdmin(admin.ModelAdmin):
    list_display = ['name', 'degree', 'branch', 'slug', 'order']
    inlines = [ProgrammeStatementInline]


@admin.register(ProgrammeStatement)
class ProgrammeStatementAdmin(admin.ModelAdmin):
    list_display = ['programme', 'kind', 'code', 'group_title', 'order']
    list_filter = ['kind', 'programme']
