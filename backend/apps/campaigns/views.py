import requests
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Campaign, AdvanceCampaign
from .serializers import CampaignSerializer, AdvanceCampaignSerializer

class SenderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fallback_senders = [
            {"name": "Signature Talks", "email": "global@signaturetalks.org"},
            {"name": "WYNx Talks", "email": "info@wynxtalks.com"},
            {"name": "Voice Talks", "email": "info@voicetalks.org"},
            {"name": "ICON Conferences", "email": "contact@iconconferences.org"},
            {"name": "IDIAS", "email": "contact@idias.org"},
        ]

        brevo_api_key = getattr(settings, 'BREVO_API_KEY', None)
        if not brevo_api_key:
            return Response(fallback_senders)

        try:
            response = requests.get(
                'https://api.brevo.com/v3/senders',
                headers={'api-key': brevo_api_key, 'accept': 'application/json'}
            )
            response.raise_for_status()
            data = response.json()
            senders = []
            for sender in data.get('senders', []):
                senders.append({
                    "name": sender.get('name', ''),
                    "email": sender.get('email', ''),
                })
            if not senders:
                return Response(fallback_senders)
            return Response(senders)
        except Exception as e:
            return Response(fallback_senders)


class CampaignViewSet(viewsets.ModelViewSet):
    serializer_class = CampaignSerializer

    def get_queryset(self):
        qs = Campaign.objects.all().order_by('-created_at')
        if self.action == 'list':
            qs = qs.filter(advance_campaign__isnull=True)
        return qs

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

    @action(detail=True, methods=['post'], url_path='convert-to-advanced')
    def convert_to_advanced(self, request, pk=None):
        campaign = self.get_object()

        if campaign.advance_campaign:
            return Response(
                {'error': 'This campaign is already part of an advance campaign.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        advance_campaign = AdvanceCampaign.objects.create(
            name=campaign.name,
            target_list=campaign.target_list
        )

        campaign.advance_campaign = advance_campaign
        campaign.save()

        return Response({
            'status': 'Converted to advance campaign.',
            'advance_campaign_id': advance_campaign.id
        })


class AdvanceCampaignViewSet(viewsets.ModelViewSet):
    serializer_class = AdvanceCampaignSerializer

    def get_queryset(self):
        try:
            list(AdvanceCampaign.objects.only('id', 'share_token')[:1])
            return AdvanceCampaign.objects.all().order_by('-created_at')
        except Exception:
            return AdvanceCampaign.objects.defer('share_token').order_by('-created_at')


    @action(detail=False, methods=['get'], url_path='recent-blasts')
    def recent_blasts(self, request):
        recent = Campaign.objects.filter(advance_campaign__isnull=False).order_by('-created_at')[:50]
        serializer = CampaignSerializer(recent, many=True)
        return Response({'results': serializer.data})


