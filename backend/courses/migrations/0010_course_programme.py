from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0009_course_is_lab'),
        ('programs', '0002_seed_programmes'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='programme',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='courses',
                to='programs.programme',
            ),
        ),
    ]
