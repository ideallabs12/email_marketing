from django.core.management.base import BaseCommand
from apps.tracking.models import CampaignRecipientStatus, CampaignPerformance


class Command(BaseCommand):
    help = "Revert all bot_scanned statuses back to standard clicked status and restore click counts"

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate without saving changes to the database',
        )
        parser.add_argument(
            '--campaign-id',
            type=int,
            help='Limit to a specific campaign ID',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        campaign_id = options.get('campaign_id')

        qs = CampaignRecipientStatus.objects.filter(status='bot_scanned').select_related('contact', 'campaign')
        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)

        count = qs.count()
        self.stdout.write(f"Found {count} bot_scanned records to revert back to clicked...")

        affected_campaign_ids = set()
        for recipient in qs:
            affected_campaign_ids.add(recipient.campaign_id)
            email = recipient.contact.email if recipient.contact else 'Unknown'
            self.stdout.write(
                self.style.SUCCESS(f"  [REVERT TO CLICKED] Camp {recipient.campaign_id} | {email}")
            )
            if not dry_run:
                recipient.status = 'clicked'
                if isinstance(recipient.metadata, dict):
                    recipient.metadata.pop('bot_scan_detected', None)
                    recipient.metadata.pop('human_reengaged', None)
                recipient.save(update_fields=['status', 'metadata'])

        if not dry_run and affected_campaign_ids:
            self.stdout.write("Recalculating campaign performance totals...")
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
                f"\nFinished! Reverted {count} records back to clicked.{mode_str}"
            )
        )

