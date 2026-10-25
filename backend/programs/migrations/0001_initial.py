from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Programme',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('degree', models.CharField(choices=[('BTECH', 'B.Tech'), ('MTECH', 'M.Tech')], max_length=8)),
                ('branch', models.CharField(max_length=40)),
                ('name', models.CharField(max_length=120)),
                ('slug', models.SlugField(max_length=80, unique=True)),
                ('order', models.PositiveSmallIntegerField(default=0)),
            ],
            options={'ordering': ['order', 'id']},
        ),
        migrations.CreateModel(
            name='ProgrammeStatement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(choices=[('PO', 'Programme Outcome'), ('PSO', 'Programme Specific Outcome')], max_length=8)),
                ('group_title', models.CharField(blank=True, max_length=160)),
                ('code', models.CharField(max_length=16)),
                ('title', models.CharField(blank=True, max_length=120)),
                ('statement', models.TextField()),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('programme', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='statements', to='programs.programme')),
            ],
            options={'ordering': ['kind', 'order', 'id']},
        ),
    ]
