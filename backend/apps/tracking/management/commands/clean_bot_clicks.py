from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.tracking.models import CampaignRecipientStatus, CampaignPerformance


class Command(BaseCommand):
    help = "Accurately classify bot scanner clicks (multi-link bursts/sweeps) vs genuine human clicks"

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

        # Check all records that have click activity (status is clicked, bot_scanned, or opened with clicks)
        qs = CampaignRecipientStatus.objects.filter(
            Q(clicked_at__isnull=False) | Q(status__in=['clicked', 'bot_scanned'])
        ).select_related('contact', 'campaign')

        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)

        self.stdout.write(f"Evaluating {qs.count()} click-related records for bot vs human classification...")

        reclassified_to_bot = 0
        restored_to_human = 0
        affected_campaign_ids = set()

        for recipient in qs:
            links = recipient.clicked_links if isinstance(recipient.clicked_links, list) else []
            link_count = len(links)
            meta = recipient.metadata if isinstance(recipient.metadata, dict) else {}

            target_status = recipient.status
            reasons = []

            # ── 1. DEFINITIVE BOT DETECTION RULES ──
            is_bot = False

            # Rule A: 3 or more distinct links clicked (e.g. YouTube + Calendly + Instagram + LinkedIn + Facebook + X)
            # Enterprise security filters crawl all links in MIME body. No human clicks 3+ links simultaneously.
            if link_count >= 3:
                is_bot = True
                reasons.append(f"{link_count} distinct links clicked (crawler sweep)")

            # Rule B: 2 distinct links clicked within 120s of delivery/send or rapid burst
            elif link_count == 2:
                if recipient.delivered_at and recipient.clicked_at:
                    diff = (recipient.clicked_at - recipient.delivered_at).total_seconds()
                    if 0 <= diff < 120:
                        is_bot = True
                        reasons.append(f"2 links clicked within {diff:.1f}s of delivery")
                    else:
                        is_bot = True
                        reasons.append("2 links clicked in sandbox scan")
                else:
                    is_bot = True
                    reasons.append("2 links clicked in multi-link burst")

            # Rule C: Single link clicked in < 5 seconds of delivery (impossible human reaction time)
            elif link_count == 1:
                if recipient.delivered_at and recipient.clicked_at:
                    diff = (recipient.clicked_at - recipient.delivered_at).total_seconds()
                    if 0 <= diff < 5:
                        is_bot = True
                        reasons.append(f"single link clicked {diff:.1f}s after delivery (immediate scanner)")
                    else:
                        is_bot = False
                else:
                    is_bot = False

            # Rule D: No links tracked but marked as bot_scanned without reason
            elif link_count == 0:
                is_bot = False

            # ── 2. DECIDE TARGET STATUS ──
            if is_bot:
                target_status = 'bot_scanned'
            else:
                # Real human click
                if link_count >= 1:
                    target_status = 'clicked'
                elif recipient.opened_at:
                    target_status = 'opened'
                elif recipient.delivered_at:
                    target_status = 'delivered'

            # ── 3. APPLY CHANGES IF MISCLASSIFIED ──
            if recipient.status != target_status:
                affected_campaign_ids.add(recipient.campaign_id)
                email = recipient.contact.email if recipient.contact else 'Unknown'

                if target_status == 'bot_scanned':
                    reclassified_to_bot += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f"  [RECLASSIFY -> BOT] Camp {recipient.campaign_id} | {email} | {', '.join(reasons)}"
                        )
                    )
                    if not dry_run:
                        recipient.status = 'bot_scanned'
                        if not isinstance(recipient.metadata, dict):
                            recipient.metadata = {}
                        recipient.metadata['bot_scan_detected'] = True
                        recipient.save(update_fields=['status', 'metadata'])

                elif target_status == 'clicked':
                    restored_to_human += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  [RESTORE -> CLICKED] Camp {recipient.campaign_id} | {email} | Genuine human single click ({links[0] if links else ''})"
                        )
                    )
                    if not dry_run:
                        recipient.status = 'clicked'
                        if isinstance(recipient.metadata, dict) and 'bot_scan_detected' in recipient.metadata:
                            del recipient.metadata['bot_scan_detected']
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
                f"\nFinished! Reclassified to Bot: {reclassified_to_bot} | Restored to Human: {restored_to_human}{mode_str}"
            )
        )
