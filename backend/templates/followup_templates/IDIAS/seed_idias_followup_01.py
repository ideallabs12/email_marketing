"""
Seed script: inserts the IDIAS Follow-up email template into the database.
"""
import os
import sys
import django
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent.parent.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from pathlib import Path
from apps.templates.models import EmailTemplate

TEMPLATE_FILE = Path(__file__).resolve().parent / 'idias_followup_01.html'

if not TEMPLATE_FILE.exists():
    print(f"ERROR: Template file not found at {TEMPLATE_FILE}")
    sys.exit(1)

html_content = TEMPLATE_FILE.read_text(encoding='utf-8')

TEMPLATE_NAME = "IDIAS_FOLLOWUP_01"
SUBJECT       = "Following up: Speaker Opportunity — IDIAS Global Conferences"

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
    obj.html_content = html_content
    obj.subject      = SUBJECT
    obj.save()
    print(f"Template already existed (id={obj.id}) -- html_content refreshed.")
