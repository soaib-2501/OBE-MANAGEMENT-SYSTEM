from django.db import IntegrityError
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import exception_handler


class AuthRateThrottle(AnonRateThrottle):
    scope = 'auth'


def parse_pk(value, field='id'):
    try:
        pk = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field: 'Must be a positive integer.'})
    if pk < 1:
        raise ValidationError({field: 'Must be a positive integer.'})
    return pk


def api_exception_handler(exc, context):
    if isinstance(exc, IntegrityError):
        return Response(
            {'detail': 'This record conflicts with an existing one.'},
            status=status.HTTP_409_CONFLICT,
        )
    return exception_handler(exc, context)
