from django.db import migrations


def forwards(apps, schema_editor):
    Programme = apps.get_model('programs', 'Programme')
    ProgrammeStatement = apps.get_model('programs', 'ProgrammeStatement')
    from programs.seed import seed_programmes
    seed_programmes(Programme, ProgrammeStatement)


def backwards(apps, schema_editor):
    Programme = apps.get_model('programs', 'Programme')
    Programme.objects.filter(slug__in=['btech-cse', 'btech-it', 'mtech-cse', 'mtech-aids']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
