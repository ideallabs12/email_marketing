import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.contacts.models import ContactBatch, Contact, ContactList

def main():
    print("=" * 60)
    print("Targeted Batch & Contacts Deletion Script")
    print("=" * 60)

    # Search for the two batches by tracking_id (#20WT and #1BRL) or name + list
    batches = ContactBatch.objects.filter(tracking_id__in=['20WT', '1BRL'])
    
    if batches.count() < 2:
        # Fallback to name and list name matching
        batches = ContactBatch.objects.filter(
            name__icontains='C_STAR_1'
        ).filter(
            contact_list__name__iregex=r'(WYNXTALKS_TEAM_DATA|prosummits_team_data)'
        )

    if not batches.exists():
        print("❌ No matching batches found! Please check batch tags or list names.")
        return

    print(f"Found {batches.count()} batch(es):")
    for b in batches:
        c_count = b.contacts.count()
        print(f"  • Batch: '{b.name}' [#{b.tracking_id}] | List: '{b.contact_list.name}' | Contacts: {c_count}")

    contacts_qs = Contact.objects.filter(batches__in=batches).distinct()
    total_contacts = contacts_qs.count()
    print(f"\nTotal distinct contacts identified for deletion: {total_contacts}")

    if total_contacts == 0 and batches.count() == 0:
        print("Nothing to delete.")
        return

    # Delete the contacts
    deleted_contacts_count, _ = contacts_qs.delete()
    print(f"✅ Successfully deleted {deleted_contacts_count} contact record(s).")

    # Delete the batches
    deleted_batches_count, _ = batches.delete()
    print(f"✅ Successfully deleted {deleted_batches_count} batch(es).")

    print("\nOperation completed successfully.")
    print("=" * 60)

if __name__ == '__main__':
    main()
