from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import CampaignPerformance, CampaignRecipientStatus
from .serializers import CampaignPerformanceSerializer, CampaignRecipientStatusSerializer, BouncedEmailSerializer
from apps.campaigns.models import Campaign

from django.shortcuts import get_object_or_404
from urllib.parse import urlparse

class PublicCampaignAnalyticsView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        campaign = get_object_or_404(Campaign, share_token=token)
        contacts = campaign.target_list.contacts.filter(is_subscribed=True).order_by('email')
        recipient_statuses = CampaignRecipientStatus.objects.filter(
            campaign=campaign, contact__in=contacts,
        ).select_related('contact')

        by_contact = {item.contact_id: item for item in recipient_statuses}

        rows = []
        for contact in contacts:
            item = by_contact.get(contact.id)
            speaker_name = f"{contact.first_name} {contact.last_name}".strip()
            email = contact.email
            
            if item:
                status_val = item.status
                links = []
                for link in item.clicked_links:
                    try:
                        domain = urlparse(link).netloc
                        domain = domain.replace('www.', '')
                        domain = domain.split('.')[0] if domain else str(link)
                        if domain and domain not in links:
                            links.append(domain)
                    except Exception:
                        if link and str(link) not in links:
                            links.append(str(link))
                links_str = ", ".join(links)
                opened_at = item.opened_at.isoformat() if item.opened_at else None
                clicked_at = item.clicked_at.isoformat() if item.clicked_at else None
            else:
                status_val = 'pending'
                links_str = ''
                opened_at = None
                clicked_at = None
            
            rows.append({
                "speaker_name": speaker_name,
                "email": email,
                "delivery_status": status_val,
                "links_clicked": links_str,
                "opened_at": opened_at,
                "clicked_at": clicked_at
            })

        counts = recipient_statuses.aggregate(
            delivered=Count('id', filter=Q(status__in=['delivered', 'opened', 'clicked'])),
            opened=Count('id', filter=Q(opened_at__isnull=False) | Q(status__in=['opened', 'clicked'])),
            clicked=Count('id', filter=Q(clicked_at__isnull=False) | Q(status='clicked')),
        )

        totals = {
            "total_recipients": contacts.count(),
            "total_delivered": counts['delivered'],
            "total_opens": counts['opened'],
            "total_clicks": counts['clicked'],
        }

        return Response({
            "campaign_name": campaign.name,
            "totals": totals,
            "data": rows
        })

class CampaignPerformanceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CampaignPerformance.objects.all().order_by('-campaign_id')
    serializer_class = CampaignPerformanceSerializer


class BouncedEmailViewSet(viewsets.ReadOnlyModelViewSet):
    """Returns a list of all bounced emails (failed campaign recipients)."""
    serializer_class = BouncedEmailSerializer

    def get_queryset(self):
        return CampaignRecipientStatus.objects.filter(
            status='failed'
        ).select_related('contact', 'campaign').order_by('-failed_at')


class CampaignAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """Campaign-level counts plus the filterable recipient analytics list."""

    queryset = Campaign.objects.all()

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        campaign = self.get_object()
        status_filter = request.query_params.get('status', 'all')
        allowed_filters = {'all', 'delivered', 'failed', 'opened', 'clicked', 'sent', 'pending', 'unsubscribed', 'complaint', 'deferred', 'hard_bounce', 'soft_bounce', 'invalid_email', 'blocked', 'error'}
        if status_filter not in allowed_filters:
            return Response({'detail': 'Invalid status filter.'}, status=status.HTTP_400_BAD_REQUEST)

        contacts = campaign.target_list.contacts.filter(is_subscribed=True).order_by('email')
        recipient_statuses = CampaignRecipientStatus.objects.filter(
            campaign=campaign, contact__in=contacts,
        ).select_related('contact')

        if status_filter == 'all':
            by_contact = {item.contact_id: item for item in recipient_statuses}
            recipients = []
            for contact in contacts:
                item = by_contact.get(contact.id)
                if item:
                    recipients.append(CampaignRecipientStatusSerializer(item).data)
                else:
                    recipients.append({
                        'id': None, 'contact_id': contact.id, 'email': contact.email,
                        'first_name': contact.first_name, 'last_name': contact.last_name,
                        'status': 'pending', 'sent_at': None, 'delivered_at': None,
                        'opened_at': None, 'clicked_at': None, 'failed_at': None,
                        'last_event_at': None, 'error_message': '',
                    })
        else:
            if status_filter == 'sent':
                filtered_statuses = recipient_statuses.filter(status__in=['sent', 'delivered', 'opened', 'clicked'])
            elif status_filter == 'delivered':
                filtered_statuses = recipient_statuses.filter(status__in=['delivered', 'opened', 'clicked'])
            elif status_filter == 'opened':
                filtered_statuses = recipient_statuses.filter(status__in=['opened', 'clicked'])
            elif status_filter == 'failed':
                filtered_statuses = recipient_statuses.filter(status__in=['failed', 'hard_bounce', 'soft_bounce', 'invalid_email', 'blocked', 'error'])
            else:
                filtered_statuses = recipient_statuses.filter(status=status_filter)

            recipients = CampaignRecipientStatusSerializer(
                filtered_statuses, many=True,
            ).data

        counts = recipient_statuses.aggregate(
            sent=Count('id', filter=Q(status__in=['sent', 'delivered', 'opened', 'clicked'])),
            delivered=Count('id', filter=Q(status__in=['delivered', 'opened', 'clicked'])),
            failed=Count('id', filter=Q(status__in=['failed', 'hard_bounce', 'soft_bounce', 'invalid_email', 'blocked', 'error'])),
            opened=Count('id', filter=Q(opened_at__isnull=False) | Q(status__in=['opened', 'clicked'])),
            clicked=Count('id', filter=Q(clicked_at__isnull=False) | Q(status='clicked')),
            unsubscribed=Count('id', filter=Q(status='unsubscribed')),
            complaints=Count('id', filter=Q(status='complaint')),
            deferred=Count('id', filter=Q(status='deferred')),
            hard_bounces=Count('id', filter=Q(status='hard_bounce')),
            soft_bounces=Count('id', filter=Q(status='soft_bounce')),
            invalid=Count('id', filter=Q(status='invalid_email')),
            blocked=Count('id', filter=Q(status='blocked')),
            errors=Count('id', filter=Q(status='error')),
        )
        counts['total_recipients'] = contacts.count()
        counts['pending'] = max(counts['total_recipients'] - counts['sent'] - counts['failed'], 0)

        return Response({
            'campaign': {'id': campaign.id, 'name': campaign.name, 'status': campaign.status, 'share_token': campaign.share_token},
            'summary': counts,
            'filter': status_filter,
            'recipients': recipients,
        })

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        import openpyxl
        from django.http import HttpResponse
        from urllib.parse import urlparse

        campaign = self.get_object()
        
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Analytics"

        headers = ['SPEAKER_NAME', 'EMAIL', 'DELIVERY_STATUS', 'LINKS_CLICKED']
        ws.append(headers)

        contacts = campaign.target_list.contacts.filter(is_subscribed=True).order_by('email')
        recipient_statuses = CampaignRecipientStatus.objects.filter(
            campaign=campaign, contact__in=contacts,
        ).select_related('contact')

        by_contact = {item.contact_id: item for item in recipient_statuses}

        for contact in contacts:
            item = by_contact.get(contact.id)
            speaker_name = f"{contact.first_name} {contact.last_name}".strip()
            email = contact.email
            
            if item:
                status = item.status
                links = []
                for link in item.clicked_links:
                    try:
                        domain = urlparse(link).netloc
                        domain = domain.replace('www.', '')
                        domain = domain.split('.')[0] if domain else str(link)
                        if domain and domain not in links:
                            links.append(domain)
                    except Exception:
                        if link and str(link) not in links:
                            links.append(str(link))
                links_str = ", ".join(links)
            else:
                status = 'pending'
                links_str = ''
            
            ws.append([speaker_name, email, status, links_str])

        ws.column_dimensions['A'].width = 30
        ws.column_dimensions['B'].width = 40
        ws.column_dimensions['C'].width = 20
        ws.column_dimensions['D'].width = 50

        safe_name = "".join(c if c.isalnum() else "_" for c in campaign.name).lower()
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{safe_name}_analytics.xlsx"'
        wb.save(response)

        return response


class BrevoWebhookView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        data = request.data
        event_type = data.get('event')
        tags = data.get('tags') or data.get('tag') or []
        if isinstance(tags, str):
            tags = [tags]

        try:
            campaign_id = next((
                str(tag).replace('campaign-', '')
                for tag in tags
                if str(tag).isdigit() or str(tag).startswith('campaign-')
            ), None)
            if not campaign_id:
                return Response({'status': 'ok'})

            performance, _ = CampaignPerformance.objects.get_or_create(campaign_id=campaign_id)
            email = data.get('email') or data.get('recipient')
            recipient = None
            if email:
                recipient = CampaignRecipientStatus.objects.filter(
                    campaign_id=campaign_id, contact__email__iexact=email,
                ).select_related('contact').first()

            now = timezone.now()
            if event_type == 'delivered':
                performance.total_delivered += 1
                if recipient and recipient.status not in ('opened', 'clicked', 'hard_bounce', 'soft_bounce', 'invalid_email', 'blocked', 'error', 'failed'):
                    recipient.status = 'delivered'
                    recipient.delivered_at = now
            elif event_type in ('opened', 'unique_opened', 'first_opening', 'proxy_open'):
                performance.total_opens += 1
                if recipient:
                    if recipient.status not in ('clicked', 'unsubscribed', 'complaint', 'hard_bounce', 'soft_bounce', 'invalid_email', 'blocked', 'error', 'failed'):
                        recipient.status = 'opened'
                    recipient.opened_at = recipient.opened_at or now
                    if 'ip' in data:
                        recipient.metadata['ip'] = data['ip']
                    if 'user_agent' in data:
                        recipient.metadata['user_agent'] = data['user_agent']
            elif event_type == 'click':
                performance.total_clicks += 1
                if recipient:
                    recipient.status = 'clicked'
                    recipient.clicked_at = recipient.clicked_at or now
                    if 'ip' in data:
                        recipient.metadata['ip'] = data['ip']
                    if 'user_agent' in data:
                        recipient.metadata['user_agent'] = data['user_agent']
                    link = data.get('link')
                    if link and isinstance(recipient.clicked_links, list):
                        recipient.clicked_links.append(link)
            elif event_type == 'unsubscribe':
                performance.total_unsubscribed += 1
                if recipient:
                    recipient.status = 'unsubscribed'
            elif event_type == 'spam':
                performance.total_complaints += 1
                if recipient:
                    recipient.status = 'complaint'
            elif event_type == 'deferred':
                performance.total_deferred += 1
                if recipient:
                    recipient.status = 'deferred'
            elif event_type == 'hard_bounce':
                performance.total_hard_bounces += 1
                performance.total_bounces += 1
                performance.total_failed += 1
                if recipient:
                    recipient.status = 'hard_bounce'
                    recipient.failed_at = now
                    recipient.error_message = 'Hard Bounce'
            elif event_type == 'soft_bounce':
                performance.total_soft_bounces += 1
                performance.total_bounces += 1
                performance.total_failed += 1
                if recipient:
                    recipient.status = 'soft_bounce'
                    recipient.failed_at = now
                    recipient.error_message = 'Soft Bounce'
            elif event_type == 'invalid_email':
                performance.total_invalid += 1
                performance.total_failed += 1
                if recipient:
                    recipient.status = 'invalid_email'
                    recipient.failed_at = now
                    recipient.error_message = 'Invalid Email'
            elif event_type == 'blocked':
                performance.total_blocked += 1
                performance.total_failed += 1
                if recipient:
                    recipient.status = 'blocked'
                    recipient.failed_at = now
                    recipient.error_message = 'Blocked'
            elif event_type == 'error':
                performance.total_errors += 1
                performance.total_failed += 1
                if recipient:
                    recipient.status = 'error'
                    recipient.failed_at = now
                    recipient.error_message = 'Error'

            performance.save()
            if recipient:
                recipient.last_event_at = now
                recipient.save()
        except (Campaign.DoesNotExist, ValueError, TypeError):
            # Acknowledge stale/malformed provider events so Brevo does not retry forever.
            pass

        return Response({'status': 'ok'})
