from rest_framework import serializers
from .models import Campaign, AdvanceCampaign

class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = '__all__'

class AdvanceCampaignSerializer(serializers.ModelSerializer):
    campaigns = CampaignSerializer(many=True, read_only=True)
    share_token = serializers.SerializerMethodField()

    class Meta:
        model = AdvanceCampaign
        fields = '__all__'

    def get_share_token(self, obj):
        try:
            val = getattr(obj, 'share_token', None)
            return str(val) if val else None
        except Exception:
            return None

