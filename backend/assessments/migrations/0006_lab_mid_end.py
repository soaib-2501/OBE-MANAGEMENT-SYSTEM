from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0005_student_sort_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='batch',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AlterField(
            model_name='assessment',
            name='assessment_type',
            field=models.CharField(
                choices=[
                    ('T1', 'T1'),
                    ('T2', 'T2'),
                    ('T3', 'T3'),
                    ('TA', 'TA (Attendance / Project / Assignment)'),
                    ('FEEDBACK', 'Course Exit Feedback'),
                    ('ASSIGNMENT', 'Assignment'),
                    ('ATTENDANCE', 'Attendance'),
                    ('PROJECT', 'Project'),
                    ('MID', 'Mid Term'),
                    ('END', 'End Term'),
                ],
                max_length=12,
            ),
        ),
    ]
