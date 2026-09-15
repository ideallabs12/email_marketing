"""
Seed script: inserts the Universal Podcast Invitation email template into the database.
Run inside the backend Docker container:
    docker compose exec backend python templates/PODCAST_templates/seed_universal_podcast_invite.py
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

TEMPLATE_FILE = Path(__file__).resolve().parent / 'UNIVERSAL_PODCAST_temp' / 'universal_podcast_invite.html'

if not TEMPLATE_FILE.exists():
    print(f"ERROR: Template file not found at {TEMPLATE_FILE}")
    sys.exit(1)

html_content = TEMPLATE_FILE.read_text(encoding='utf-8')

TEMPLATE_NAME = "UNIVERSAL_PODCAST_INVITE_01"
SUBJECT       = "A Personal Invitation — The Dr. P Podcast"

obj, created = EmailTemplate.objects.get_or_create(
    name=TEMPLATE_NAME,
    defaults={
        'subject':      SUBJECT,
        'html_content': html_content,
        'body':         '',
        'variables':    {
            'first_name': 'Speaker',
            'email':      'speaker@example.com',
            'brand_name': 'Company Name',
            'scheduling_link': 'https://calendly.com/',
            'linkedin_url': 'https://linkedin.com/',
            'website_url': 'https://website.com/',
            'physical_address': '123 Main St',
            'current_year': '2026'
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
