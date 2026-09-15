from rest_framework import serializers
from .models import Campaign, AdvanceCampaign, Event, PodcastSender

class PodcastSenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PodcastSender
        fields = '__all__'

class EventSerializer(serializers.ModelSerializer):
    podcast_sender_name = serializers.CharField(source='podcast_sender.name', read_only=True)

    class Meta:
        model = Event
        fields = '__all__'

class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = '__all__'

class AdvanceCampaignSerializer(serializers.ModelSerializer):
    campaigns = CampaignSerializer(many=True, read_only=True)
    share_token = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()

    class Meta:
        model = AdvanceCampaign
        fields = '__all__'

    def get_share_token(self, obj):
        try:
            val = getattr(obj, 'share_token', None)
            if val:
                return str(val)
        except Exception:
            pass
        import uuid
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"advance-campaign-{obj.id}"))

    def get_slug(self, obj):
        from django.utils.text import slugify
        return slugify(obj.name) or f"campaign-{obj.id}"

