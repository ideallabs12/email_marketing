"""
Dedicated seed script to refresh the HTML content of the SECOND_SERIES - WYN template.

Run on server inside Docker:
    docker compose exec backend python templates/invite_templates/SECOND_SERIES/seed_wyn.py

Run locally (from backend directory):
    python templates/invite_templates/SECOND_SERIES/seed_wyn.py
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

TEMPLATE_FILE = Path(__file__).resolve().parent / 'wyn.html'

if not TEMPLATE_FILE.exists():
    print(f"ERROR: Template file not found at {TEMPLATE_FILE}")
    sys.exit(1)

html_content = TEMPLATE_FILE.read_text(encoding='utf-8')
TEMPLATE_NAME = "SECOND_SERIES - WYN"
SUBJECT = "Speaker invitation: {{ conference_name }}"

details = {
    'conference_name': 'WYN Global Conference 2027',
    'conference_theme': 'Leading with Vision. Inspiring Global Influence',
    'conference_website': 'https://wynconferences.com',
    'website_url': 'https://wynconferences.com',
    'linkedin_url': 'https://www.linkedin.com/company/wyn-conferences/',
    'scheduling_link': 'https://calendly.com/wynconferences',
}

variables = {
    'greeting': 'Dear Colleague,',
    'first_name': 'Speaker',
    'company_name': 'WYN',
    'conference_name': details.get('conference_name'),
    'conference_date': 'March 8–11, 2027',
    'conference_venue': 'Paris, France',
    'conference_theme': details.get('conference_theme'),
    'conference_website': details.get('conference_website'),
    'website_url': details.get('website_url'),
    'linkedin_url': details.get('linkedin_url'),
    'scheduling_link': details.get('scheduling_link'),
    'physical_address': 'BLVD Heights, Dubai Opera District, Dubai, United Arab Emirates',
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
    # Keep existing variables if already customized, or update if empty
    if not obj.variables:
        obj.variables = variables
    obj.save()
    print(f"[SUCCESS] Template updated (id={obj.id}): '{obj.name}' -- html_content refreshed from wyn.html!")
