import uuid
from urllib.parse import urlparse
from django.db.models import Count, Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status, viewsets, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import CampaignPerformance, CampaignRecipientStatus
from .serializers import CampaignPerformanceSerializer, CampaignRecipientStatusSerializer, BouncedEmailSerializer
from apps.campaigns.models import Campaign, AdvanceCampaign

def get_campaign_target_contacts(campaign):
    contacts = campaign.target_list.contacts.filter(is_subscribed=True)
    if campaign.target_batches.exists():
        contacts = contacts.filter(batches__in=campaign.target_batches.all()).distinct()
    return contacts.order_by('email')

class PublicAdvanceCampaignView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        import uuid
        import re
        from django.http import Http404
        from django.utils.text import slugify

        adv_campaign = None
        direct_blast = None
        single_campaign = None
        token_str = str(token).strip()
        token_clean = token_str.lower().replace('_', '-')

        # 1. Try finding by exact share_token if valid UUID
        try:
            val = uuid.UUID(token_str)
            adv_campaign = AdvanceCampaign.objects.filter(share_token=val).first()
            if not adv_campaign:
                single_campaign = Campaign.objects.filter(share_token=val).first()
                if single_campaign and single_campaign.advance_campaign:
                    adv_campaign = single_campaign.advance_campaign
                    direct_blast = single_campaign
        except Exception:
            adv_campaign = None
            single_campaign = None

        # Helper matching function for slug / name variations
        token_base = re.sub(r'[-_]campaigns?$', '', token_clean)
        token_alphanumeric = re.sub(r'[^a-z0-9]', '', token_str.lower())
        token_base_alphanumeric = re.sub(r'[^a-z0-9]', '', token_base)

        def matches_token(name, item_id):
            if not name:
                return token_clean == str(item_id)
            name_lower = str(name).lower().strip()
            name_slug = slugify(name)
            name_hyphen = name_lower.replace('_', '-')
            name_base = re.sub(r'[-_]campaigns?$', '', name_slug)
            name_alphanumeric = re.sub(r'[^a-z0-9]', '', name_lower)
            name_base_alphanumeric = re.sub(r'[^a-z0-9]', '', name_base)

            # Direct matches
            if (
                token_clean == name_slug
                or token_clean == name_hyphen
                or token_clean.replace('-', '') == name_slug.replace('-', '')
                or token_clean == f"{name_slug}-{item_id}"
                or token_clean == str(item_id)
                or (token_alphanumeric and token_alphanumeric == name_alphanumeric)
            ):
                return True

            # Suffix variations (e.g. "raghu_campaigns" <-> "Raghu", "Raghu Campaign", "Raghu Campaigns")
            if token_base and name_base and (
                token_base == name_base
                or token_base == name_slug
                or token_clean == name_base
                or token_base_alphanumeric == name_base_alphanumeric
            ):
                return True

            # Word boundary matches (e.g. "raghu_campaigns" matches "Raghu Conference" or "Raghu")
            if len(token_base) >= 3:
                words = [w for w in re.split(r'[-_\s]+', name_lower) if w]
                if token_base in words or any(w.startswith(token_base) for w in words):
                    return True

            return False

        # Safely fetch AdvanceCampaign query set
        try:
            list(AdvanceCampaign.objects.only('id', 'share_token')[:1])
            all_adv = list(AdvanceCampaign.objects.all())
        except Exception:
            all_adv = list(AdvanceCampaign.objects.defer('share_token').all())

        all_camps = list(Campaign.objects.all())

        # 2. Try finding by matching slugified name / variations of AdvanceCampaign
        if not adv_campaign and not single_campaign:
            for ac in all_adv:
                if matches_token(ac.name, ac.id):
                    adv_campaign = ac
                    break

        # 3. Try finding by matching single Campaign blast slug / variations
        if not adv_campaign and not single_campaign:
            for camp in all_camps:
                if matches_token(camp.name, camp.id):
                    if camp.advance_campaign:
                        adv_campaign = camp.advance_campaign
                        direct_blast = camp
                    else:
                        single_campaign = camp
                    break

        # 4. Fallback: match deterministic uuid5
        if not adv_campaign and not single_campaign:
            try:
                for ac in all_adv:
                    if str(uuid.uuid5(uuid.NAMESPACE_DNS, f"advance-campaign-{ac.id}")) == token_str:
                        adv_campaign = ac
                        break
                if not adv_campaign:
                    for camp in all_camps:
                        if str(uuid.uuid5(uuid.NAMESPACE_DNS, f"campaign-{camp.id}")) == token_str:
                            if camp.advance_campaign:
                                adv_campaign = camp.advance_campaign
                                direct_blast = camp
                            else:
                                single_campaign = camp
                            break
            except Exception:
                pass

        if not adv_campaign and not single_campaign:
            raise Http404("Campaign not found")

        if adv_campaign:
            blasts_qs = adv_campaign.campaigns.all().order_by('-created_at')
            camp_id = adv_campaign.id
            camp_name = adv_campaign.name
            camp_created_at = adv_campaign.created_at.isoformat() if adv_campaign.created_at else None
        else:
            blasts_qs = Campaign.objects.filter(id=single_campaign.id)
            camp_id = single_campaign.id
            camp_name = single_campaign.name
            camp_created_at = single_campaign.created_at.isoformat() if single_campaign.created_at else None

        blasts_data = [{
            'id': b.id,
            'name': b.name,
            'status': b.status,
            'sent_at': b.sent_at.isoformat() if b.sent_at else None,
            'created_at': b.created_at.isoformat() if b.created_at else None,
        } for b in blasts_qs]

        blast_id = request.query_params.get('blast_id')
        selected_blast = None
        if blast_id:
            try:
                selected_blast = blasts_qs.get(id=int(blast_id))
            except (ValueError, Campaign.DoesNotExist):
                selected_blast = None
        elif direct_blast:
            selected_blast = direct_blast
        elif single_campaign:
            selected_blast = single_campaign
        
        if not selected_blast and blasts_qs.exists():
            selected_blast = blasts_qs.first()

        analytics_data = None
        if selected_blast:
            contacts = get_campaign_target_contacts(selected_blast)
            recipient_statuses = CampaignRecipientStatus.objects.filter(
                campaign=selected_blast, contact__in=contacts,
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
                            domain = urlparse(link).netloc.replace('www.', '')
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

            analytics_data = {
                "blast_id": selected_blast.id,
                "blast_name": selected_blast.name,
                "totals": {
                    "total_recipients": contacts.count(),
                    "total_delivered": counts['delivered'],
                    "total_opens": counts['opened'],
                    "total_clicks": counts['clicked'],
                },
                "data": rows
            }

        return Response({
            "campaign_id": camp_id,
            "campaign_name": camp_name,
            "created_at": camp_created_at,
            "blasts": blasts_data,
            "selected_blast_id": selected_blast.id if selected_blast else None,
            "analytics": analytics_data
        })

class PublicCampaignAnalyticsView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        campaign = None
        try:
            campaign = Campaign.objects.select_related('advance_campaign').filter(share_token=token).first()
        except Exception:
            campaign = None
        if not campaign:
            token_str = str(token).strip()
            try:
                camps = list(Campaign.objects.select_related('advance_campaign').all())
            except Exception:
                camps = list(Campaign.objects.defer('share_token').select_related('advance_campaign').all())
            for camp in camps:
                if str(uuid.uuid5(uuid.NAMESPACE_DNS, f"campaign-{camp.id}")) == token_str:
                    campaign = camp
                    break
        if not campaign:
            raise Http404("Campaign not found")
        contacts = get_campaign_target_contacts(campaign)
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
                        domain = urlparse(link).netloc.replace('www.', '')
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

        return Response({
            "campaign_name": campaign.name,
            "advance_campaign_name": campaign.advance_campaign.name if campaign.advance_campaign else None,
            "totals": {
                "total_recipients": contacts.count(),
                "total_delivered": counts['delivered'] or 0,
                "total_opens": counts['opened'] or 0,
                "total_clicks": counts['clicked'] or 0,
            },
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

        contacts = get_campaign_target_contacts(campaign)
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

        advance_token = None
        if campaign.advance_campaign_id:
            try:
                ac = campaign.advance_campaign
                advance_token = str(getattr(ac, 'share_token', '') or '') or None
            except Exception:
                advance_token = None
            if not advance_token:
                import uuid
                advance_token = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"advance-campaign-{campaign.advance_campaign_id}"))

        advance_slug = None
        if campaign.advance_campaign_id:
            try:
                from django.utils.text import slugify
                advance_slug = slugify(campaign.advance_campaign.name)
            except Exception:
                advance_slug = None

        return Response({
            'campaign': {
                'id': campaign.id,
                'name': campaign.name,
                'status': campaign.status,
                'share_token': campaign.share_token,
                'advance_campaign_share_token': advance_token,
                'advance_campaign_slug': advance_slug,
            },
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

        contacts = get_campaign_target_contacts(campaign)
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
            pass

        return Response({'status': 'ok'})

from rest_framework.permissions import IsAuthenticated
from .models import MasterLinkSettings

class MasterLinkSettingsView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings = MasterLinkSettings.get_settings()
        return Response({
            'token': str(settings.token),
            'is_active': settings.is_active,
            'has_password': bool(settings.password),
            'current_password': settings.password,
        })

    def post(self, request):
        settings = MasterLinkSettings.get_settings()
        is_active = request.data.get('is_active')
        if is_active is not None:
            settings.is_active = bool(is_active)
        # Handle password update — empty string means remove password
        if 'password' in request.data:
            settings.password = request.data.get('password', '').strip()
        settings.save()
        return Response({
            'token': str(settings.token),
            'is_active': settings.is_active,
            'has_password': bool(settings.password),
            'current_password': settings.password,
        })

class PublicMasterLinkCampaignsView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            settings = MasterLinkSettings.objects.get(token=token, is_active=True)
        except MasterLinkSettings.DoesNotExist:
            return Response({'detail': 'This link is disabled or invalid.'}, status=status.HTTP_404_NOT_FOUND)

        # If password is set, require it via query param or header
        if settings.password:
            import urllib.parse
            header_pwd = request.headers.get('X-Master-Password', '')
            param_pwd = request.query_params.get('password', '')
            unquoted_param = urllib.parse.unquote(param_pwd)
            expected = str(settings.password).strip()

            matches = any(
                str(p).strip() == expected
                for p in [header_pwd, param_pwd, unquoted_param]
                if p
            )
            if not matches:
                return Response({'detail': 'password_required', 'has_password': True}, status=status.HTTP_401_UNAUTHORIZED)

        from apps.campaigns.models import AdvanceCampaign

        # Query AdvanceCampaign safely even if share_token migration is pending
        try:
            list(AdvanceCampaign.objects.only('id', 'share_token')[:1])
            advance_campaigns = AdvanceCampaign.objects.prefetch_related('campaigns').order_by('-created_at')
        except Exception:
            advance_campaigns = AdvanceCampaign.objects.defer('share_token').prefetch_related('campaigns').order_by('-created_at')

        containers = []
        for ac in advance_campaigns:
            blasts = ac.campaigns.all().order_by('-created_at')
            ac_share_token = ''
            try:
                raw_token = getattr(ac, 'share_token', None)
                ac_share_token = str(raw_token) if raw_token else ''
            except Exception:
                pass
            if not ac_share_token:
                ac_share_token = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"advance-campaign-{ac.id}"))

            containers.append({
                'id': ac.id,
                'name': ac.name,
                'slug': slugify(ac.name),
                'share_token': ac_share_token,
                'created_at': ac.created_at.isoformat() if ac.created_at else None,
                'blasts': [{
                    'id': c.id,
                    'name': c.name,
                    'status': c.status,
                    'share_token': str(c.share_token) if getattr(c, 'share_token', None) else str(uuid.uuid5(uuid.NAMESPACE_DNS, f"campaign-{c.id}")),
                    'sent_at': c.sent_at.isoformat() if c.sent_at else None,
                    'created_at': c.created_at.isoformat() if c.created_at else None,
                } for c in blasts]
            })

        # Also include standalone campaigns (no advance_campaign parent)
        standalone = Campaign.objects.filter(
            advance_campaign__isnull=True
        ).order_by('-created_at')
        if standalone.exists():
            containers.append({
                'id': None,
                'name': 'Other Campaigns',
                'slug': 'other-campaigns',
                'share_token': '',
                'created_at': None,
                'blasts': [{
                    'id': c.id,
                    'name': c.name,
                    'status': c.status,
                    'share_token': str(c.share_token) if getattr(c, 'share_token', None) else str(uuid.uuid5(uuid.NAMESPACE_DNS, f"campaign-{c.id}")),
                    'sent_at': c.sent_at.isoformat() if c.sent_at else None,
                    'created_at': c.created_at.isoformat() if c.created_at else None,
                } for c in standalone]
            })

        return Response(containers)
