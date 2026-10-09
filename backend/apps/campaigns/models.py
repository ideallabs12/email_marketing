import uuid
import random
import string
from django.db import models
from apps.templates.models import EmailTemplate
from apps.contacts.models import ContactList

def generate_tracking_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

class PodcastSender(models.Model):
    name = models.CharField(max_length=255, unique=True)
    website_url = models.URLField(max_length=255, blank=True)
    linkedin_url = models.URLField(max_length=255, blank=True)
    scheduling_link = models.URLField(max_length=255, blank=True)
    physical_address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class AdvanceCampaign(models.Model):
    name = models.CharField(max_length=255)
    target_list = models.ForeignKey(ContactList, on_delete=models.PROTECT)
    share_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    tracking_id = models.CharField(max_length=10, blank=True, null=True, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            while True:
                new_id = generate_tracking_id()
                if not AdvanceCampaign.objects.filter(tracking_id=new_id).exists():
                    self.tracking_id = new_id
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Campaign(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('sending', 'Sending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    )

    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255, blank=True, help_text="Overrides template subject if provided")
    from_email = models.CharField(max_length=100, default='Signature Talks <global@signaturetalks.org>')
    template = models.ForeignKey(EmailTemplate, on_delete=models.PROTECT)
    target_list = models.ForeignKey(ContactList, on_delete=models.PROTECT)
    target_batches = models.ManyToManyField('contacts.ContactBatch', blank=True, help_text="If selected, only send to these batches. Otherwise send to entire list.")
    advance_campaign = models.ForeignKey(AdvanceCampaign, on_delete=models.CASCADE, related_name='campaigns', null=True, blank=True)
    podcast_sender = models.ForeignKey(PodcastSender, on_delete=models.SET_NULL, null=True, blank=True, help_text="Sender details injected into Universal Podcast Template")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    share_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    tracking_id = models.CharField(max_length=10, blank=True, null=True, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            while True:
                new_id = generate_tracking_id()
                if not Campaign.objects.filter(tracking_id=new_id).exists():
                    self.tracking_id = new_id
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

