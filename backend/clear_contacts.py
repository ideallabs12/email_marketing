import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['DB_HOST'] = '127.0.0.1'
django.setup()

from apps.contacts.models import ContactList

try:
    cl = ContactList.objects.get(name='jilani_data')
    count = cl.contacts.count()
    print(f'Deleting {count} contacts from list jilani_data...')
    cl.contacts.all().delete()
    print('Done.')
except ContactList.DoesNotExist:
    print('ContactList jilani_data not found.')
