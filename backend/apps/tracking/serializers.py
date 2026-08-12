from rest_framework import serializers
from .models import CampaignPerformance, CampaignRecipientStatus

class CampaignPerformanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignPerformance
        fields = '__all__'


class CampaignRecipientStatusSerializer(serializers.ModelSerializer):
    contact_id = serializers.IntegerField(source='contact.id', read_only=True)
    email = serializers.EmailField(source='contact.email', read_only=True)
    first_name = serializers.CharField(source='contact.first_name', read_only=True)
    last_name = serializers.CharField(source='contact.last_name', read_only=True)

    class Meta:
        model = CampaignRecipientStatus
        fields = [
            'id', 'contact_id', 'email', 'first_name', 'last_name', 'status',
            'sent_at', 'delivered_at', 'opened_at', 'clicked_at', 'failed_at',
            'last_event_at', 'error_message', 'clicked_links', 'metadata'
        ]

class BouncedEmailSerializer(CampaignRecipientStatusSerializer):
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    campaign_id = serializers.IntegerField(source='campaign.id', read_only=True)

    class Meta(CampaignRecipientStatusSerializer.Meta):
        fields = CampaignRecipientStatusSerializer.Meta.fields + ['campaign_name', 'campaign_id']
