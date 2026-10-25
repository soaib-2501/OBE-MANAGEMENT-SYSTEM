from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User


def effective_role(user):
    return User.Role.ADMIN if user.is_admin_role else user.role


def admin_account_exists():
    return User.objects.filter(Q(role=User.Role.ADMIN) | Q(is_superuser=True)).exists()


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login serializer — adds role/name to the JWT payload and the response body."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = effective_role(user)
        token['name'] = user.get_full_name() or user.username
        return token

    def validate(self, attrs):
        identifier = attrs.get(self.username_field)
        if identifier and '@' in identifier:
            try:
                user = User.objects.get(email__iexact=identifier)
                attrs[self.username_field] = user.username
            except User.DoesNotExist:
                pass

        data = super().validate(attrs)
        if self.user.is_superuser and self.user.role != User.Role.ADMIN:
            self.user.role = User.Role.ADMIN
            self.user.save(update_fields=['role'])
        data['role'] = effective_role(self.user)
        data['name'] = self.user.get_full_name() or self.user.username
        data['user_id'] = self.user.id
        return data


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'password', 'is_active']

    def validate_password(self, value):
        if value:
            validate_password(value, user=self.instance)
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if user is None or not getattr(user, 'is_admin_role', False):
            if user is None or instance.pk != user.pk:
                data.pop('email', None)
            data.pop('is_active', None)
        return data

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'This field is required.'})
        user = User(**validated_data)
        user.set_password(password)
        if user.role == User.Role.ADMIN:
            user.is_staff = True
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if 'role' in validated_data and instance.is_superuser:
            validated_data['role'] = User.Role.ADMIN
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'role']

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_role(self, value):
        if value == User.Role.ADMIN and admin_account_exists():
            raise serializers.ValidationError(
                'An administrator already exists. Sign up as Faculty, or ask an admin to create your account.'
            )
        if value not in (User.Role.ADMIN, User.Role.FACULTY):
            raise serializers.ValidationError('Role must be ADMIN or FACULTY.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        if user.role == User.Role.ADMIN:
            user.is_staff = True
        user.save()
        return user
