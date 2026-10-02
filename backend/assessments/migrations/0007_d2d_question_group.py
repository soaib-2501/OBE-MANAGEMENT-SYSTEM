from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('assessments', '0006_lab_mid_end'),
    ]

    operations = [
        migrations.AddField(
            model_name='assessmentquestion',
            name='group',
            field=models.CharField(blank=True, max_length=40),
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
                    ('D2D', 'D2D'),
                ],
                max_length=12,
            ),
        ),
    ]
