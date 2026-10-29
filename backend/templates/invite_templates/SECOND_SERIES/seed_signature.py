"""
Dedicated seed script to create/refresh the HTML content of the SECOND_SERIES - SIGNATURE template.

Run on server inside Docker:
    docker compose exec backend python templates/invite_templates/SECOND_SERIES/seed_signature.py

Run locally (from backend directory):
    python templates/invite_templates/SECOND_SERIES/seed_signature.py
"""
import os
import sys
import django
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.templates.models import EmailTemplate

TEMPLATE_FILE = Path(__file__).resolve().parent / 'signature.html'

if not TEMPLATE_FILE.exists():
    print(f"ERROR: Template file not found at {TEMPLATE_FILE}")
    sys.exit(1)

html_content = TEMPLATE_FILE.read_text(encoding='utf-8')
TEMPLATE_NAME = "SECOND_SERIES - SIGNATURE"
SUBJECT = "Speaker invitation: {{ conference_name }}"

details = {
    'conference_name': 'USA Signature Global Leadership Summit 2027',
    'conference_theme': 'Executive Excellence and Global Impact',
    'conference_website': 'https://signaturetalks.org',
    'website_url': 'https://signaturetalks.org',
    'linkedin_url': 'https://www.linkedin.com/company/signature-global-conferences',
    'scheduling_link': 'https://calendly.com/usasignatureglobalconferences',
}

variables = {
    'greeting': 'Dear Colleague,',
    'first_name': 'Speaker',
    'company_name': 'SIGNATURE',
    'conference_name': details.get('conference_name'),
    'conference_date': 'September 15–17, 2027',
    'conference_venue': 'Albany, New York, USA',
    'conference_theme': details.get('conference_theme'),
    'conference_website': details.get('conference_website'),
    'website_url': details.get('website_url'),
    'linkedin_url': details.get('linkedin_url'),
    'scheduling_link': details.get('scheduling_link'),
    'physical_address': 'Parklane West, Menands, Albany, New York 12204, US',
    'current_year': '2027',
    'unsubscribe_url': '#',
}

obj, created = EmailTemplate.objects.get_or_create(
    name=TEMPLATE_NAME,
    defaults={
        'subject': SUBJECT,
        'html_content': html_content,
        'body': '',
        'variables': variables,
    }
)

if created:
    print(f"[SUCCESS] Template created (id={obj.id}): '{obj.name}'")
else:
    obj.html_content = html_content
    obj.subject = SUBJECT
    if not obj.variables:
        obj.variables = variables
    obj.save()
    print(f"[SUCCESS] Template updated (id={obj.id}): '{obj.name}' -- html_content refreshed from signature.html!")

