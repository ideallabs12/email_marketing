from django.core.management.base import BaseCommand
from apps.contacts.models import ContactList, ContactBatch
from django.db import transaction

class Command(BaseCommand):
    help = 'Migrates orphaned contacts (no batch in their list) into first_batch'

    def handle(self, *args, **kwargs):
        lists = ContactList.objects.all()
        total_migrated = 0

        with transaction.atomic():
            for contact_list in lists:
                # Find all contacts in this list
                all_contacts_in_list = contact_list.contacts.all()
                
                # Get the IDs of all batches belonging to THIS list
                list_batch_ids = contact_list.batches.values_list('id', flat=True)
                
                # Find contacts in this list that do NOT belong to any of these batches
                orphaned_contacts = all_contacts_in_list.exclude(batches__id__in=list_batch_ids)
                
                count = orphaned_contacts.count()
                
                if count > 0:
                    # Create or get "first_batch" under that list
                    batch_name = "first_batch"
                    batch, created = ContactBatch.objects.get_or_create(
                        name=batch_name,
                        contact_list=contact_list
                    )
                    
                    if created:
                        self.stdout.write(self.style.SUCCESS(f'Created batch "{batch_name}" for list "{contact_list.name}"'))
                    
                    # Move (add) all orphaned contacts to that batch
                    for contact in orphaned_contacts:
                        contact.batches.add(batch)
                    
                    self.stdout.write(f'  -> Added {count} orphaned contacts to batch "{batch_name}" in list "{contact_list.name}"')
                    total_migrated += count

        self.stdout.write(self.style.SUCCESS(f'Successfully migrated {total_migrated} orphaned contacts into batches.'))
