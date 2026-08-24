"""
Seed script: inserts the Inbox Landing Test email template into the database.
Run inside the backend Docker container:
    docker compose exec backend python templates/SGC/seed_SGC_INVITE_01.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from pathlib import Path
from apps.templates.models import EmailTemplate

TEMPLATE_FILE = Path(__file__).resolve().parent / 'SGC_INVITE_01.html'

if not TEMPLATE_FILE.exists():
    print(f"ERROR: Template file not found at {TEMPLATE_FILE}")
    sys.exit(1)

html_content = TEMPLATE_FILE.read_text(encoding='utf-8')

TEMPLATE_NAME = "inbox_landing_test"
SUBJECT       = "Speaking opportunity — WYNx Talks"  # Update this subject if needed

obj, created = EmailTemplate.objects.get_or_create(
    name=TEMPLATE_NAME,
    defaults={
        'subject':      SUBJECT,
        'html_content': html_content,
        'body':         '',
        'variables':    {
            'first_name': 'Test User',
            'last_name':  '',
        },
    },
)

if created:
    print(f"Template created successfully (id={obj.id}): '{obj.name}'")
else:
    # Update html_content in case the file changed
    obj.html_content = html_content
    obj.subject      = SUBJECT
    obj.save()
    print(f"Template already existed (id={obj.id}) -- html_content refreshed.")
