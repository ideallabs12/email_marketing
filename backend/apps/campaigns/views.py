from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Campaign
from .serializers import CampaignSerializer

class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all().order_by('-created_at')
    serializer_class = CampaignSerializer

    def destroy(self, request, *args, **kwargs):
        campaign = self.get_object()
        if campaign.status == 'sending':
            return Response(
                {'error': 'A campaign cannot be deleted while it is sending.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        campaign = self.get_object()

        if campaign.status not in ('draft', 'failed'):
            return Response(
                {'error': f"Cannot send a campaign with status '{campaign.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        campaign.status = 'sending'
        campaign.save()

        # Trigger the async Celery task
        from .tasks import send_campaign_emails
        send_campaign_emails.delay(campaign.id)

        return Response({'status': 'Campaign queued for sending.'})


