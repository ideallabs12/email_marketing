import random
import string
from django.db import models

def generate_tracking_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

class ContactList(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    tracking_id = models.CharField(max_length=10, blank=True, null=True, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            while True:
                new_id = generate_tracking_id()
                if not ContactList.objects.filter(tracking_id=new_id).exists():
                    self.tracking_id = new_id
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class ContactBatch(models.Model):
    name = models.CharField(max_length=255)
    contact_list = models.ForeignKey(ContactList, related_name='batches', on_delete=models.CASCADE)
    tracking_id = models.CharField(max_length=10, blank=True, null=True, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            while True:
                new_id = generate_tracking_id()
                if not ContactBatch.objects.filter(tracking_id=new_id).exists():
                    self.tracking_id = new_id
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.contact_list.name})"

class Contact(models.Model):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=255, blank=True, db_index=True)
    last_name = models.CharField(max_length=255, blank=True, db_index=True)
    is_subscribed = models.BooleanField(default=True, db_index=True)
    lists = models.ManyToManyField(ContactList, related_name='contacts', blank=True)
    batches = models.ManyToManyField(ContactBatch, related_name='contacts', blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['first_name', 'last_name']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.email

class IgnoredContact(models.Model):
    email = models.CharField(max_length=255, blank=True)
    first_name = models.CharField(max_length=255, blank=True)
    last_name = models.CharField(max_length=255, blank=True)
    reason = models.TextField()
    imported_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email or 'No Email'} - {self.reason}"


class MutualContact(models.Model):
    """Tracks contacts that were skipped during import because they already exist in another list."""
    email = models.EmailField(max_length=255)
    first_name = models.CharField(max_length=255, blank=True)
    last_name = models.CharField(max_length=255, blank=True)
    who_is_importing = models.CharField(max_length=255, blank=True)
    target_list_name = models.CharField(max_length=255, blank=True)
    already_exists_in = models.CharField(max_length=255)
    reason = models.TextField(default="Mutual: already exists in another list")
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-imported_at']

    def __str__(self):
        return f"{self.email} (in {self.already_exists_in})"

class Lead(models.Model):
    CALL_STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('Completed', 'Completed'),
        ('Rescheduled', 'Rescheduled'),
        ('No Show', 'No Show'),
        ('Cancelled', 'Cancelled'),
        ('Missed', 'Missed'),
        ('Not Responding', 'Not Responding'),
    ]

    speaker_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField()
    campaign_name = models.CharField(max_length=255, blank=True)
    batch_name = models.CharField(max_length=255, blank=True)
    whose_speaker = models.CharField(max_length=255, blank=True)
    call_booked_on = models.DateTimeField(null=True, blank=True)
    call_status = models.CharField(max_length=50, choices=CALL_STATUS_CHOICES, blank=True, null=True)
    source_tracking_id = models.CharField(max_length=10, blank=True, null=True, db_index=True)
    followup = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.speaker_name} ({self.email})"



