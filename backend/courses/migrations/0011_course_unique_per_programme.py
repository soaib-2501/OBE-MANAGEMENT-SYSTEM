from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0010_course_programme'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='course',
            name='unique_course_per_faculty_session',
        ),
        migrations.AddConstraint(
            model_name='course',
            constraint=models.UniqueConstraint(
                fields=('course_code', 'academic_year', 'faculty', 'programme'),
                name='unique_course_per_faculty_session_programme',
            ),
        ),
    ]
