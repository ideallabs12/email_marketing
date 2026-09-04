from rest_framework import serializers
from .models import Campaign, AdvanceCampaign

class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = '__all__'

class AdvanceCampaignSerializer(serializers.ModelSerializer):
    campaigns = CampaignSerializer(many=True, read_only=True)

    class Meta:
        model = AdvanceCampaign
        fields = '__all__'
