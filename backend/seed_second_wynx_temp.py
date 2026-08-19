"""
Seed script: inserts the second WYNx Talks Speaker Invitation email template into the database.
Run inside the backend Docker container:
    docker compose exec backend python seed_second_wynx_temp.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from pathlib import Path
from apps.templates.models import EmailTemplate

TEMPLATE_FILE = Path(__file__).resolve().parent / 'second_wynx_temp.html'

if not TEMPLATE_FILE.exists():
    print(f"ERROR: Template file not found at {TEMPLATE_FILE}")
    sys.exit(1)

html_content = TEMPLATE_FILE.read_text(encoding='utf-8')

TEMPLATE_NAME = "second_wynx_temp"
SUBJECT       = "Speaking opportunity — Arab Women Hi-Rise Conclave 2026"

obj, created = EmailTemplate.objects.get_or_create(
    name=TEMPLATE_NAME,
    defaults={
        'subject':      SUBJECT,
        'html_content': html_content,
        'body':         '',
        'variables':    {
            'first_name': 'Speaker',
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
