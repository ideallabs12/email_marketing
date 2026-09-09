from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.tracking.models import CampaignRecipientStatus, CampaignPerformance
from apps.campaigns.models import Campaign


class Command(BaseCommand):
    help = "Retroactively identify corporate bot scanner clicks and reclassify them to 'bot_scanned'"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate the cleanup without saving changes to the database',
        )
        parser.add_argument(
            '--campaign-id',
            type=int,
            help='Limit the cleanup to a specific campaign ID',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        campaign_id = options.get('campaign_id')

        qs = CampaignRecipientStatus.objects.filter(status='clicked')
        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)

        self.stdout.write(f"Scanning {qs.count()} 'clicked' records for bot scanner activity...")

        bot_count = 0
        affected_campaign_ids = set()

        for recipient in qs:
            is_bot = False
            reasons = []

            # Rule 1: Clicked within 15 seconds of delivery
            if recipient.clicked_at and recipient.delivered_at:
                diff = (recipient.clicked_at - recipient.delivered_at).total_seconds()
                if 0 <= diff < 15:
                    is_bot = True
                    reasons.append(f"clicked {diff:.1f}s after delivery")

            # Rule 2: Clicked within 20 seconds of send
            if not is_bot and recipient.clicked_at and recipient.sent_at:
                diff = (recipient.clicked_at - recipient.sent_at).total_seconds()
                if 0 <= diff < 20:
                    is_bot = True
                    reasons.append(f"clicked {diff:.1f}s after send")

            # Rule 3: Multiple links clicked (>=2 links) without prior human opening
            links = recipient.clicked_links if isinstance(recipient.clicked_links, list) else []
            if not is_bot and len(links) >= 2:
                if not recipient.opened_at or recipient.clicked_at <= recipient.opened_at:
                    is_bot = True
                    reasons.append(f"{len(links)} links clicked simultaneously without human open")

            # Rule 4: Already flagged in metadata
            meta = recipient.metadata if isinstance(recipient.metadata, dict) else {}
            if not is_bot and meta.get('bot_scan_detected'):
                is_bot = True
                reasons.append("bot_scan_detected flag in metadata")

            if is_bot:
                bot_count += 1
                affected_campaign_ids.add(recipient.campaign_id)
                reason_str = ", ".join(reasons)
                self.stdout.write(
                    f"  [BOT] Campaign {recipient.campaign_id} | {recipient.contact.email} ({reason_str})"
                )

                if not dry_run:
                    recipient.status = 'bot_scanned'
                    if not isinstance(recipient.metadata, dict):
                        recipient.metadata = {}
                    recipient.metadata['bot_scan_detected'] = True
                    recipient.save(update_fields=['status', 'metadata'])

        if not dry_run and affected_campaign_ids:
            self.stdout.write("Recalculating campaign click totals...")
            for camp_id in affected_campaign_ids:
                actual_clicks = CampaignRecipientStatus.objects.filter(
                    campaign_id=camp_id, status='clicked'
                ).count()
                CampaignPerformance.objects.filter(campaign_id=camp_id).update(
                    total_clicks=actual_clicks
                )
            self.stdout.write(f"Updated performance metrics for {len(affected_campaign_ids)} campaigns.")

        mode_str = " (DRY RUN - no changes saved)" if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"Completed! Reclassified {bot_count} bot clicks across {len(affected_campaign_ids)} campaigns.{mode_str}"
            )
        )
