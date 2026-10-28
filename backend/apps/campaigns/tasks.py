from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone
from django.utils.html import strip_tags
import logging
import re

logger = logging.getLogger(__name__)


def render_template(template_str, context):
    result = template_str
    for key, value in context.items():
        # Replace normal {{ key }} and {{ key|default:"..." }} with the actual value
        pattern1 = re.compile(r'{{\s*' + re.escape(key) + r'\s*}}', re.IGNORECASE)
        pattern2 = re.compile(r'{{\s*' + re.escape(key) + r'\s*\|\s*default:\s*(?:"[^"]*"|\'[^\']*\')\s*}}', re.IGNORECASE)
        result = pattern1.sub(str(value), result)
        result = pattern2.sub(str(value), result)

    # For any variables NOT in context but with a default, replace with the default value
    def default_replacer(match):
        return match.group(1)
    result = re.sub(r'{{\s*[\w_]+\s*\|\s*default:\s*"([^"]+)"\s*}}', default_replacer, result)
    result = re.sub(r"{{\s*[\w_]+\s*\|\s*default:\s*'([^']+)'\s*}}", default_replacer, result)

    # If an unsubscribe url was provided in context, dynamically replace any hardcoded Unsubscribe links pointing to #
    unsub_url = context.get('unsubscribe_url') or context.get('unsubscribe_link') or context.get('Unsubscribe Link')
    if unsub_url:
        result = re.sub(
            r'<a\s+([^>]*?)href=[\'"]#[\'"]([^>]*?)>\s*Unsubscribe\s*</a>',
            rf'<a \1href="{unsub_url}"\2>Unsubscribe</a>',
            result,
            flags=re.IGNORECASE
        )

    # Strip any remaining unreplaced simple single-word tags
    result = re.sub(r'{{\s*[\w_]+\s*}}', '', result)

    # Strip any remaining unreplaced multi-word tags
    result = re.sub(r'{{\s*[^}]+\s*}}', '', result)

    return result


COMPANY_PALETTES = {
    'NEXT': {
        'gradient_start': '#05070F',
        'gradient_mid': '#0A1A3A',
        'gradient_end': '#1E2A78',
        'company_tag_color': '#67E8F9',
        'subtitle_color': '#E0F2FE',
        'accent_color': '#22D3EE',
        'button_text_color': '#04202B',
    },
    'PROSUMMITS': {
        'gradient_start': '#060B16',
        'gradient_mid': '#0F1A33',
        'gradient_end': '#1B2A52',
        'company_tag_color': '#FBBF24',
        'subtitle_color': '#E2E8F0',
        'accent_color': '#F59E0B',
        'button_text_color': '#1A1005',
    },
    'ICON': {
        'gradient_start': '#0B3A66',
        'gradient_mid': '#1F6FB5',
        'gradient_end': '#3B8FD0',
        'company_tag_color': '#BAE6FD',
        'subtitle_color': '#F0F9FF',
        'accent_color': '#7DD3FC',
        'button_text_color': '#082F49',
    },
    'WYNXTALKS': {
        'gradient_start': '#12080F',
        'gradient_mid': '#3A1030',
        'gradient_end': '#7A1F5C',
        'company_tag_color': '#F9A8D4',
        'subtitle_color': '#E5E7EB',
        'accent_color': '#F472B6',
        'button_text_color': '#2A0A1E',
    },
    'WYN': {
        'gradient_start': '#0F2E6B',
        'gradient_mid': '#1B6FB0',
        'gradient_end': '#2E9BD6',
        'company_tag_color': '#A5F3FC',
        'subtitle_color': '#FFFFFF',
        'accent_color': '#2BB5C8',
        'button_text_color': '#062033',
    },
    'IDIAS': {
        'gradient_start': '#7C2D12',
        'gradient_mid': '#C2410C',
        'gradient_end': '#EA580C',
        'company_tag_color': '#FED7AA',
        'subtitle_color': '#FFF7ED',
        'accent_color': '#F97316',
        'button_text_color': '#1F0A02',
    },
    'VOICETALKS': {
        'gradient_start': '#050509',
        'gradient_mid': '#2A1048',
        'gradient_end': '#5B21B6',
        'company_tag_color': '#E879F9',
        'subtitle_color': '#E5E7EB',
        'accent_color': '#C026D3',
        'button_text_color': '#FFFFFF',
    },
    'SIGNATURE': {
        'gradient_start': '#0A0E1A',
        'gradient_mid': '#1A243B',
        'gradient_end': '#2A3A5E',
        'company_tag_color': '#93C5FD',
        'subtitle_color': '#E2E8F0',
        'accent_color': '#3B82F6',
        'button_text_color': '#FFFFFF',
    },
}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_campaign_emails(self, campaign_id: int):
    """Send a campaign and retain a per-recipient delivery record."""
    from .models import Campaign
    from apps.tracking.models import CampaignPerformance, CampaignRecipientStatus

    try:
        campaign = Campaign.objects.select_related('template', 'target_list', 'podcast_sender', 'conference').get(id=campaign_id)
    except Campaign.DoesNotExist:
        logger.error("Campaign %s not found.", campaign_id)
        return

    if campaign.status != 'sending':
        logger.warning("Campaign %s is not in sending state. Skipping.", campaign_id)
        return

    from apps.contacts.models import UnsubscribedContact
    suppressed_emails = set(UnsubscribedContact.objects.values_list('email', flat=True))

    contacts = campaign.target_list.contacts.filter(is_subscribed=True)
    if campaign.target_batches.exists():
        contacts = contacts.filter(batches__in=campaign.target_batches.all()).distinct()

    # ── SHIELD 1: PRE-FLIGHT GLOBAL SUPPRESSION FILTER ──
    contacts = contacts.exclude(email__in=suppressed_emails)
        
    if not contacts.exists():
        logger.info("Campaign %s: no subscribed contacts found for the given targets.", campaign_id)
        campaign.status = 'failed'
        campaign.save()
        return

    subject_template = campaign.subject or campaign.template.subject
    layout_template = campaign.template.html_content
    if '{{ body }}' in layout_template:
        layout_template = layout_template.replace('{{ body }}', campaign.template.body)
    else:
        layout_template += campaign.template.body

    sent_count = 0
    failed_count = 0
    for contact in contacts:
        try:
            context = {}
            if isinstance(campaign.template.variables, dict):
                context.update(campaign.template.variables)
            
            c_f_name = contact.first_name.strip() if contact.first_name else ''
            c_l_name = contact.last_name.strip() if contact.last_name else ''
            
            if c_f_name and c_l_name:
                full_name = f"{c_f_name} {c_l_name}"
                greeting = f"Dear {full_name},"
            elif c_f_name:
                full_name = c_f_name
                greeting = f"Dear {full_name},"
            elif c_l_name:
                full_name = c_l_name
                greeting = f"Dear {full_name},"
            else:
                full_name = "Speaker"
                greeting = "Hi there,"

            context.update({
                'greeting': greeting,
                'first_name': c_f_name or 'Speaker',
                'last_name': c_l_name,
                'full_name': full_name,
                'email': contact.email,
                'subject': subject_template,
            })
            
            sender = campaign.podcast_sender
            if not sender:
                from apps.campaigns.models import PodcastSender
                email_lower = campaign.from_email.lower()
                mapping = {
                    'signature': 'SIGNATURE',
                    'wynxtalks': 'WYNXTALKS',
                    'voicetalks': 'VOICETALKS',
                    'icon': 'ICON',
                    'idias': 'IDiAS',
                    'next': 'NEXT',
                    'wyn': 'WYN',
                    'prosummits': 'PROSUMMITS'
                }
                for key, val in mapping.items():
                    if key in email_lower:
                        sender = PodcastSender.objects.filter(name__iexact=val).first()
                        break

            if sender:
                context.update({
                    'brand_name': sender.name,
                    'website_url': sender.website_url,
                    'linkedin_url': sender.linkedin_url,
                    'scheduling_link': 'https://calendly.com/drppodcasts/30min',
                    'physical_address': sender.physical_address,
                    'current_year': str(timezone.now().year),
                })

            # Inject Conference fields if selected
            if campaign.conference:
                conf = campaign.conference
                context.update({
                    'company_name': conf.company_name,
                    'conference_name': conf.conference_name,
                    'conference_date': conf.date,
                    'conference_venue': conf.venue,
                    'conference_theme': conf.theme or '',
                    'conference_website': conf.website_link or '',
                    'scheduling_link': conf.calendly_link or context.get('scheduling_link', ''),
                    'linkedin_url': conf.linkedin_link or context.get('linkedin_url', ''),
                    'website_url': conf.website_link or context.get('website_url', ''),
                })
                conf_co = conf.company_name.upper().replace(' ', '').replace('-', '')
                for key, palette in COMPANY_PALETTES.items():
                    if key in conf_co:
                        context.update(palette)
                        break

            # If conference not set, derive company_name from sender/from_email
            if not campaign.conference:
                from_str = (campaign.from_email or '').upper().replace(' ', '').replace('-', '')
                for key in COMPANY_PALETTES.keys():
                    if key in from_str:
                        context['company_name'] = key
                        break

            # Brand color palette fallback if not yet resolved
            if 'accent_color' not in context or not context.get('accent_color'):
                brand_str = (context.get('company_name') or campaign.from_email or '').upper().replace(' ', '').replace('-', '')
                for key, palette in COMPANY_PALETTES.items():
                    if key in brand_str:
                        context.update(palette)
                        break

            if 'current_year' not in context:
                context['current_year'] = str(timezone.now().year)

            from django.core import signing

            base_url = 'https://outreach.idealab-vizag.com'

            token_body = signing.dumps({
                'email': contact.email.strip().lower(),
                'campaign_id': campaign.id,
                'channel': 'body_link',
            }, salt='outreach-unsubscribe')
            body_unsubscribe_url = f"{base_url}/api/v1/public/unsubscribe/?token={token_body}"

            token_header = signing.dumps({
                'email': contact.email.strip().lower(),
                'campaign_id': campaign.id,
                'channel': 'header_button',
            }, salt='outreach-unsubscribe')
            header_unsubscribe_url = f"{base_url}/api/v1/public/unsubscribe/?token={token_header}"

            context.update({
                'unsubscribe_url': body_unsubscribe_url,
                'unsubscribe_link': body_unsubscribe_url,
                'Unsubscribe Link': body_unsubscribe_url,
                'Unsubscribe_Link': body_unsubscribe_url,
            })

            html_content = render_template(layout_template, context)
            clean_html_for_text = re.sub(r'<(style|script)[^>]*>[\s\S]*?</\1>', '', html_content, flags=re.IGNORECASE)
            text_content = re.sub(r'\n{3,}', '\n\n', strip_tags(clean_html_for_text)).strip()

            from_email = campaign.from_email

            rendered_subject = render_template(subject_template, context)
            rendered_subject = "".join(rendered_subject.splitlines())

            email = EmailMultiAlternatives(
                subject=rendered_subject,
                body=text_content,
                from_email=from_email,
                to=[contact.email],
                headers={
                    'X-Mailin-Tag': f'campaign-{campaign.id}',
                    'List-Unsubscribe': f'<{header_unsubscribe_url}>',
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            )
            email.attach_alternative(html_content, 'text/html')
            email.send(fail_silently=False)

            sent_at = timezone.now()
            CampaignRecipientStatus.objects.update_or_create(
                campaign=campaign,
                contact=contact,
                defaults={
                    'status': 'sent', 'sent_at': sent_at, 'last_event_at': sent_at,
                    'error_message': '',
                },
            )
            sent_count += 1
            logger.info("Sent to %s", contact.email)
        except Exception as error:
            failed_at = timezone.now()
            CampaignRecipientStatus.objects.update_or_create(
                campaign=campaign,
                contact=contact,
                defaults={
                    'status': 'failed', 'failed_at': failed_at, 'last_event_at': failed_at,
                    'error_message': str(error),
                },
            )
            failed_count += 1
            logger.error("Failed to send to %s: %s", contact.email, error)

    campaign.status = 'sent'
    campaign.sent_at = timezone.now()
    campaign.save()

    performance, _ = CampaignPerformance.objects.get_or_create(campaign=campaign)
    performance.total_sent = sent_count
    performance.total_failed = failed_count
    performance.save()

    logger.info("Campaign '%s' complete. Sent: %s, Failed: %s", campaign.name, sent_count, failed_count)
    return {'sent': sent_count, 'failed': failed_count}
