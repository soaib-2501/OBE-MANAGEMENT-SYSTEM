from django.db import models


class Programme(models.Model):
    class Degree(models.TextChoices):
        BTECH = 'BTECH', 'B.Tech'
        MTECH = 'MTECH', 'M.Tech'

    degree = models.CharField(max_length=8, choices=Degree.choices)
    branch = models.CharField(max_length=40)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=80, unique=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class ProgrammeStatement(models.Model):
    class Kind(models.TextChoices):
        PO = 'PO', 'Programme Outcome'
        PSO = 'PSO', 'Programme Specific Outcome'

    programme = models.ForeignKey(Programme, on_delete=models.CASCADE, related_name='statements')
    kind = models.CharField(max_length=8, choices=Kind.choices)
    group_title = models.CharField(max_length=160, blank=True)
    code = models.CharField(max_length=16)
    title = models.CharField(max_length=120, blank=True)
    statement = models.TextField()
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['kind', 'order', 'id']

    def __str__(self):
        return f'{self.programme.slug} {self.code}'
