from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attainments', '0008_sheet_questions_grades'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='historicalcoattainment',
            name='unique_historical_co_attainment',
        ),
        migrations.AddConstraint(
            model_name='historicalcoattainment',
            constraint=models.UniqueConstraint(
                fields=('course_code', 'academic_year', 'semester', 'co_code', 'faculty'),
                name='unique_historical_co_attainment_per_faculty',
            ),
        ),
    ]
