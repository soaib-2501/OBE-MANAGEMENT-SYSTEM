from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('opening_reports', '0003_openingreport_co_prev_years'),
    ]

    operations = [
        migrations.AddField(
            model_name='openingreport',
            name='module_coordinator',
            field=models.TextField(blank=True),
        ),
    ]
