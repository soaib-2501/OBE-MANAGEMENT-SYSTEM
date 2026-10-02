from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('opening_reports', '0002_openingreport_co_targets'),
    ]

    operations = [
        migrations.AddField(
            model_name='openingreport',
            name='co_prev_years',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
