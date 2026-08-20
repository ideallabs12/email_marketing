from django.db import models
from apps.templates.models import EmailTemplate
from apps.contacts.models import ContactList

class Campaign(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('sending', 'Sending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    )

    SENDER_CHOICES = (
        ('global@signaturetalks.org', 'Signature Talks (global@signaturetalks.org)'),
        ('contact@wynxtalks.com', 'WYNx Talks (contact@wynxtalks.com)'),
    )

    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255, blank=True, help_text="Overrides template subject if provided")
    from_email = models.CharField(max_length=100, choices=SENDER_CHOICES, default='global@signaturetalks.org')
    template = models.ForeignKey(EmailTemplate, on_delete=models.PROTECT)
    target_list = models.ForeignKey(ContactList, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

