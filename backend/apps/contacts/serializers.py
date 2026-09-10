from rest_framework import serializers
from .models import Contact, ContactList, IgnoredContact, ContactBatch, MutualContact

class ContactListSerializer(serializers.ModelSerializer):
    contacts_count = serializers.SerializerMethodField()

    class Meta:
        model = ContactList
        fields = ['id', 'name', 'description', 'is_default', 'contacts_count', 'created_at', 'updated_at']

    def get_contacts_count(self, obj):
        if hasattr(obj, 'contacts_count'):
            return obj.contacts_count
        return obj.contacts.count()

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'

class IgnoredContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = IgnoredContact
        fields = '__all__'

class ContactBatchSerializer(serializers.ModelSerializer):
    contacts_count = serializers.SerializerMethodField()

    class Meta:
        model = ContactBatch
        fields = ['id', 'name', 'contact_list', 'contacts_count', 'created_at']

    def get_contacts_count(self, obj):
        if hasattr(obj, 'contacts_count'):
            return obj.contacts_count
        return obj.contacts.count()

class MutualContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = MutualContact
        fields = '__all__'

