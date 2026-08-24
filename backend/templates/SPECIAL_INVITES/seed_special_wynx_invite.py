"""
Seed script: inserts the special WYNx Invite email template into the database.
Run inside the backend Docker container:
    docker compose exec backend python templates/SPECIAL_INVITES/seed_special_wynx_invite.py
"""
import os
import sys
import django
from pathlib import Path

# Add the 'backend' directory to sys.path so 'config.settings' can be found
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from pathlib import Path
from apps.templates.models import EmailTemplate

TEMPLATE_FILE = Path(__file__).resolve().parent / 'special_wynx_invite.html'

if not TEMPLATE_FILE.exists():
    print(f"ERROR: Template file not found at {TEMPLATE_FILE}")
    sys.exit(1)

html_content = TEMPLATE_FILE.read_text(encoding='utf-8')

TEMPLATE_NAME = "special_wynx_invite"
SUBJECT       = "Speaking opportunity — WYNx Talks"  # Update this subject if needed

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
