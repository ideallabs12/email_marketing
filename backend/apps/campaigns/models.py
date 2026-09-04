import uuid
from django.db import models
from apps.templates.models import EmailTemplate
from apps.contacts.models import ContactList

class AdvanceCampaign(models.Model):
    name = models.CharField(max_length=255)
    target_list = models.ForeignKey(ContactList, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    share_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

