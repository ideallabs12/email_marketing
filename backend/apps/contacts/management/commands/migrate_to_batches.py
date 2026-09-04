from django.core.management.base import BaseCommand
from apps.contacts.models import ContactList, ContactBatch
from django.db import transaction

class Command(BaseCommand):
    help = 'Migrates contacts into a batch for lists that have no batches'

    def handle(self, *args, **kwargs):
        lists = ContactList.objects.all()
        total_migrated = 0

        with transaction.atomic():
            for contact_list in lists:
                # Only convert lists which don't have any batches
                if not contact_list.batches.exists():
                    contacts_in_list = contact_list.contacts.all()
                    
                    if contacts_in_list.exists():
                        # Create one batch under that list
                        batch_name = "Batch 1"
                        batch = ContactBatch.objects.create(
                            name=batch_name,
                            contact_list=contact_list
                        )
                        self.stdout.write(self.style.SUCCESS(f'Created batch "{batch_name}" for list "{contact_list.name}"'))

                        # Move (add) all contacts in this list to that batch
                        count = 0
                        for contact in contacts_in_list:
                            contact.batches.add(batch)
                            count += 1
                        
                        self.stdout.write(f'  -> Added {count} contacts to batch "{batch_name}"')
                        total_migrated += count

        self.stdout.write(self.style.SUCCESS(f'Successfully migrated {total_migrated} contacts into batches.'))
