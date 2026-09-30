import os
import sys
import django

def main():
    # Setup Django environment
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

    from apps.contacts.models import ContactList

    list_name = 'jilani_data'
    if len(sys.argv) > 1:
        list_name = sys.argv[1]

    try:
        contact_list = ContactList.objects.get(name=list_name)
    except ContactList.DoesNotExist:
        print(f"[-] Contact list '{list_name}' not found.")
        return

    contacts = contact_list.contacts.all()
    count = contacts.count()
    
    if count == 0:
        print(f"[*] No contacts found inside '{list_name}'.")
        return

    print(f"[*] Found {count} contacts in '{list_name}'.")
    print("[*] Deleting contacts...")
    
    # This will delete the actual Contact objects that are linked to this list
    deleted_count, _ = contacts.delete()
    
    print(f"[+] Successfully deleted {deleted_count} contacts.")

if __name__ == '__main__':
    main()
