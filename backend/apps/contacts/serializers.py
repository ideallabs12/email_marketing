from rest_framework import serializers
from .models import Contact, ContactList, IgnoredContact, ContactBatch

class ContactListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactList
        fields = ['id', 'name', 'description', 'is_default', 'created_at', 'updated_at']

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'

class IgnoredContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = IgnoredContact
        fields = '__all__'

class ContactBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactBatch
        fields = '__all__'
