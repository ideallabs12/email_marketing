from rest_framework import serializers
from .models import Contact, ContactList

class ContactListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactList
        fields = ['id', 'name', 'description', 'is_default', 'created_at', 'updated_at']

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'
