"""
Seed script: inserts the Universal Conference Speaker Invitation email template into the database.
Run inside the backend Docker container:
    docker compose exec backend python templates/invite_templates/seed_universal_conference_invite.py
"""
import os
import sys
import django
from pathlib import Path

# Add the 'backend' directory to sys.path so 'config.settings' can be found
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.templates.models import EmailTemplate

TEMPLATE_FILE = Path(__file__).resolve().parent / 'universal_conference_invite.html'

if not TEMPLATE_FILE.exists():
    print(f"ERROR: Template file not found at {TEMPLATE_FILE}")
    sys.exit(1)

html_content = TEMPLATE_FILE.read_text(encoding='utf-8')

TEMPLATE_NAME = "UNIVERSAL_CONFERENCE_INVITE"
SUBJECT       = "Distinguished Speaker Invitation — {{ conference_name|default:'International Leadership Summit' }}"

default_variables = {
    'greeting': 'Dear Colleague,',
    'first_name': 'Speaker',
    'email': 'speaker@example.com',
    'company_name': 'PROSUMMITS',
    'conference_name': 'Elite Women Leadership Summit 2027',
    'conference_date': 'March 8–11, 2027',
    'conference_venue': 'Paris, France',
    'conference_theme': 'Leading with Vision. Inspiring Global Influence',
    'conference_website': 'https://prosummits.org/events/ewl-summit-2027',
    'scheduling_link': 'https://calendly.com/prosummitsvirtual',
    'sender_name': 'Venkatesh',
    'gradient_start': '#060B16',
    'gradient_mid': '#0F1A33',
    'gradient_end': '#1B2A52',
    'company_tag_color': '#FBBF24',
    'subtitle_color': '#E2E8F0',
    'accent_color': '#F59E0B',
    'button_text_color': '#1A1005',
    'linkedin_url': 'https://www.linkedin.com/company/prosummits/',
    'website_url': 'https://prosummits.org',
    'physical_address': 'BLVD Heights, Dubai Opera District, Dubai, United Arab Emirates',
    'current_year': '2027',
    'unsubscribe_url': '#',
}

obj, created = EmailTemplate.objects.update_or_create(
    name=TEMPLATE_NAME,
    defaults={
        'subject': SUBJECT,
        'html_content': html_content,
        'body': '',
        'variables': default_variables,
    },
)

if created:
    print(f"Template created successfully (id={obj.id}): '{obj.name}'")
else:
    print(f"Template updated successfully (id={obj.id}): '{obj.name}'")
