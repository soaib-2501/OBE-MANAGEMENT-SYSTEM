import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('closing_reports', '0001_initial'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='closingyearsnapshot',
            name='unique_closing_year_snapshot',
        ),
        migrations.AddField(
            model_name='closingyearsnapshot',
            name='faculty',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='closing_year_snapshots',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name='closingyearsnapshot',
            constraint=models.UniqueConstraint(
                fields=('course_code', 'academic_year', 'semester', 'faculty'),
                name='unique_closing_year_snapshot_per_faculty',
            ),
        ),
    ]
