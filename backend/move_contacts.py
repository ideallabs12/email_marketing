import os
import django
import sys

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.contacts.models import ContactList, ContactBatch, Contact

def move_contacts():
    list_1_name = "sravanthi_sep1st_batch1_invite01"
    list_2_name = "sravanthi_data"
    batch_name = "batch_2"

    try:
        list_1 = ContactList.objects.get(name=list_1_name)
        print(f"Found Target List 1: {list_1.name}")
    except ContactList.DoesNotExist:
        print(f"Error: Target list '{list_1_name}' not found.")
        return

    try:
        list_2 = ContactList.objects.get(name=list_2_name)
        print(f"Found Source List 2: {list_2.name} with {list_2.contacts.count()} contacts")
    except ContactList.DoesNotExist:
        print(f"Error: Source list '{list_2_name}' not found.")
        return

    # Create batch_2 for list 1
    batch_2, created = ContactBatch.objects.get_or_create(
        name=batch_name, 
        contact_list=list_1
    )
    if created:
        print(f"Created new batch '{batch_name}' for list '{list_1.name}'")
    else:
        print(f"Found existing batch '{batch_name}' for list '{list_1.name}'")

    # Get contacts from list 2
    contacts_to_move = list_2.contacts.all()
    count = contacts_to_move.count()

    if count == 0:
        print(f"No contacts found in '{list_2_name}' to move.")
        return

    print(f"Moving {count} contacts...")

    # Iterate and update relationships
    moved_count = 0
    for contact in contacts_to_move:
        # Add to new list and batch
        contact.lists.add(list_1)
        contact.batches.add(batch_2)
        
        # Remove from old list
        contact.lists.remove(list_2)
        
        moved_count += 1
        if moved_count % 50 == 0:
            print(f"Processed {moved_count}/{count} contacts...")

    print(f"Successfully moved {moved_count} contacts.")
    print(f"'{list_1.name}' now has {list_1.contacts.count()} contacts.")
    print(f"'{batch_2.name}' now has {batch_2.contacts.count()} contacts.")
    print(f"'{list_2.name}' now has {list_2.contacts.count()} contacts.")

if __name__ == '__main__':
    move_contacts()
