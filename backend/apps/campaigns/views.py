import requests
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Campaign, AdvanceCampaign, PodcastSender
from .serializers import CampaignSerializer, AdvanceCampaignSerializer, PodcastSenderSerializer
from apps.contacts.models import ContactList, ContactBatch

class PodcastSenderViewSet(viewsets.ModelViewSet):
    serializer_class = PodcastSenderSerializer
    queryset = PodcastSender.objects.all().order_by('name')


class GlobalLookupView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tid = request.query_params.get('tracking_id', '').strip().upper()
        if not tid:
            return Response({'error': 'No tracking_id provided'}, status=400)
            
        if tid.startswith('#'):
            tid = tid[1:]
            
        camp = Campaign.objects.filter(tracking_id=tid).first()
        if camp:
            return Response({'type': 'campaign', 'id': camp.id, 'url': f'/campaigns/{camp.id}/analytics'})
            
        adv = AdvanceCampaign.objects.filter(tracking_id=tid).first()
        if adv:
            return Response({'type': 'advance_campaign', 'id': adv.id, 'url': f'/advance-campaigns/{adv.id}'})
            
        lst = ContactList.objects.filter(tracking_id=tid).first()
        if lst:
            return Response({'type': 'list', 'id': lst.id, 'url': f'/contacts?list={lst.id}'})
            
        batch = ContactBatch.objects.filter(tracking_id=tid).first()
        if batch:
            return Response({'type': 'batch', 'id': batch.id, 'url': f'/contacts?batch={batch.id}'})
            
        return Response({'error': 'Not found'}, status=404)
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
        include_all = str(self.request.query_params.get('include_all', '')).lower() in ('true', '1')
        if self.action == 'list' and not include_all:
            qs = qs.filter(advance_campaign__isnull=True)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save()
        if obj.tracking_id and f"[#{obj.tracking_id}]" not in obj.name:
            obj.name = f"{obj.name.strip()} [#{obj.tracking_id}]"
            obj.save(update_fields=['name'])

    @action(detail=False, methods=['get'], url_path='calendar')
    def calendar(self, request):
        from apps.tracking.views import format_campaign_target

        qs = Campaign.objects.all().select_related(
            'template', 'target_list', 'advance_campaign', 'podcast_sender'
        ).prefetch_related('target_batches')

        data = []
        for c in qs.order_by('-created_at'):
            run_dt = c.sent_at or c.scheduled_at or c.created_at
            run_date_str = run_dt.strftime('%Y-%m-%d') if run_dt else ''
            run_time_str = run_dt.strftime('%H:%M') if run_dt else ''

            perf_data = None
            try:
                perf = getattr(c, 'performance', None)
                if perf:
                    perf_data = {
                        'total_sent': perf.total_sent,
                        'total_opens': perf.total_opens,
                        'total_clicks': perf.total_clicks,
                        'total_bounces': perf.total_bounces,
                        'total_delivered': perf.total_delivered,
                        'total_failed': perf.total_failed,
                        'total_unsubscribed': getattr(perf, 'total_unsubscribed', 0),
                        'open_rate': round((perf.total_opens / perf.total_delivered * 100), 1) if perf.total_delivered > 0 else 0,
                        'click_rate': round((perf.total_clicks / perf.total_delivered * 100), 1) if perf.total_delivered > 0 else 0,
                    }
            except Exception:
                perf_data = None

            list_name, batch_name, target_display = format_campaign_target(c)

            data.append({
                'id': c.id,
                'name': c.name,
                'subject': c.subject or (c.template.subject if c.template else ''),
                'status': c.status,
                'from_email': c.from_email,
                'sent_at': c.sent_at.isoformat() if c.sent_at else None,
                'scheduled_at': c.scheduled_at.isoformat() if c.scheduled_at else None,
                'created_at': c.created_at.isoformat() if c.created_at else None,
                'updated_at': c.updated_at.isoformat() if c.updated_at else None,
                'primary_date': run_date_str,
                'primary_time': run_time_str,
                'run_date_type': 'sent' if c.sent_at else ('scheduled' if c.scheduled_at else 'created'),
                'tracking_id': c.tracking_id,
                'share_token': str(c.share_token) if c.share_token else None,
                'is_advanced': bool(c.advance_campaign_id),
                'advance_campaign_id': c.advance_campaign_id,
                'advance_campaign_name': c.advance_campaign.name if c.advance_campaign else None,
                'template_id': c.template_id,
                'template_name': c.template.name if c.template else None,
                'template_html': c.template.html_content if c.template else '',
                'template_body': c.template.body if c.template else '',
                'target_list_id': c.target_list_id,
                'target_list_name': list_name,
                'target_batches_name': batch_name,
                'target_display': target_display,
                'performance': perf_data,
            })

        return Response({'results': data, 'count': len(data)})

    def destroy(self, request, *args, **kwargs):
        campaign = self.get_object()
        if campaign.status == 'sending':
            return Response(
                {'error': 'A campaign cannot be deleted while it is sending.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='check-duplicate')
    def check_duplicate(self, request):
        target_list = request.data.get('target_list')
        template = request.data.get('template')
        from_email = request.data.get('from_email')

        if not all([target_list, template, from_email]):
            return Response({'duplicate': False})

        qs = Campaign.objects.filter(
            target_list_id=target_list,
            template_id=template,
            from_email__iexact=from_email
        )
        
        target_batches = request.data.get('target_batches', [])
        if target_batches:
            qs = qs.filter(target_batches__in=target_batches).distinct()

        if qs.exists():
            return Response({'duplicate': True})
        return Response({'duplicate': False})

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

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        try:
            from config.urls import ensure_db_schema
            ensure_db_schema()
        except Exception:
            pass

    def get_queryset(self):
        try:
            list(AdvanceCampaign.objects.only('id', 'share_token')[:1])
            return AdvanceCampaign.objects.all().order_by('-created_at')
        except Exception:
            return AdvanceCampaign.objects.defer('share_token').order_by('-created_at')

    def perform_create(self, serializer):
        obj = serializer.save()
        if obj.tracking_id and f"[#{obj.tracking_id}]" not in obj.name:
            obj.name = f"{obj.name.strip()} [#{obj.tracking_id}]"
            obj.save(update_fields=['name'])

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception:
            # Self-heal schema in PostgreSQL if share_token column is missing
            from django.db import connection
            try:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns 
                                WHERE table_name='campaigns_advancecampaign' AND column_name='share_token'
                            ) THEN
                                ALTER TABLE campaigns_advancecampaign ADD COLUMN share_token UUID DEFAULT gen_random_uuid();
                                UPDATE campaigns_advancecampaign SET share_token = gen_random_uuid() WHERE share_token IS NULL;
                                ALTER TABLE campaigns_advancecampaign ALTER COLUMN share_token SET NOT NULL;
                                CREATE UNIQUE INDEX IF NOT EXISTS campaigns_advancecampaign_share_token_uniq ON campaigns_advancecampaign (share_token);
                            END IF;
                        END $$;
                    """)
                return super().create(request, *args, **kwargs)
            except Exception as retry_err:
                raise retry_err



    @action(detail=False, methods=['get'], url_path='recent-blasts')
    def recent_blasts(self, request):
        recent = Campaign.objects.filter(advance_campaign__isnull=False).order_by('-created_at')[:50]
        serializer = CampaignSerializer(recent, many=True)
        return Response({'results': serializer.data})


