from django.core.management.base import BaseCommand
from apps.campaigns.models import AdvanceCampaign, Campaign
from apps.contacts.models import ContactList, ContactBatch, Lead

class Command(BaseCommand):
    help = "Backfill tracking IDs for existing campaigns, lists, batches, and leads."

    def handle(self, *args, **kwargs):
        self.stdout.write("Generating IDs for Advance Campaigns...")
        for obj in AdvanceCampaign.objects.filter(tracking_id__isnull=True):
            obj.save()
        
        self.stdout.write("Generating IDs for Campaigns (Blasts)...")
        for obj in Campaign.objects.filter(tracking_id__isnull=True):
            obj.save()
            
        self.stdout.write("Generating IDs for Contact Lists...")
        for obj in ContactList.objects.filter(tracking_id__isnull=True):
            obj.save()
            
        self.stdout.write("Generating IDs for Contact Batches...")
        for obj in ContactBatch.objects.filter(tracking_id__isnull=True):
            obj.save()

        self.stdout.write("Linking Leads to their latest matching Campaign...")
        # Match Lead's campaign_name to the most recent Campaign's name
        leads_updated = 0
        for lead in Lead.objects.filter(source_tracking_id__isnull=True).exclude(campaign_name=""):
            # Find the most recently created campaign with this name
            campaign = Campaign.objects.filter(name=lead.campaign_name).order_by("-created_at").first()
            if campaign and campaign.tracking_id:
                lead.source_tracking_id = campaign.tracking_id
                lead.save(update_fields=["source_tracking_id"])
                leads_updated += 1
                
        self.stdout.write(self.style.SUCCESS(f"Backfill complete! Updated {leads_updated} leads."))
