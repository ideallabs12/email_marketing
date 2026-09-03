from django.core.management.base import BaseCommand
from apps.contacts.models import ContactList, ContactBatch, Contact
from django.db import transaction

class Command(BaseCommand):
    help = 'Migrates all existing contacts into a default batch named after their contact list'

    def handle(self, *args, **kwargs):
        lists = ContactList.objects.filter(is_default=False)
        total_migrated = 0

        with transaction.atomic():
            for contact_list in lists:
                # Create a batch named after the list (or 'first_batch' if list name is empty)
                batch_name = contact_list.name or 'first_batch'
                batch, created = ContactBatch.objects.get_or_create(
                    name=batch_name,
                    contact_list=contact_list
                )

                if created:
                    self.stdout.write(self.style.SUCCESS(f'Created batch "{batch_name}" for list "{contact_list.name}"'))

                # Find all contacts in this list that are not yet in this batch
                contacts_in_list = Contact.objects.filter(lists=contact_list)
                contacts_to_update = []
                for contact in contacts_in_list:
                    contacts_to_update.append(contact)

                if contacts_to_update:
                    for contact in contacts_to_update:
                        contact.batches.add(batch)
                    
                    self.stdout.write(f'  -> Added {len(contacts_to_update)} contacts to batch "{batch_name}"')
                    total_migrated += len(contacts_to_update)

        self.stdout.write(self.style.SUCCESS(f'Successfully migrated {total_migrated} contacts into batches.'))
