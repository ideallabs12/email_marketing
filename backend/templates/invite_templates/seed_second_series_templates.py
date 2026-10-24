"""
Seed script: Inserts all SECOND_SERIES templates into the EmailTemplate table.
Run inside the backend container:
    docker compose exec backend python templates/invite_templates/seed_second_series_templates.py
"""
import os
import sys
import django
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.templates.models import EmailTemplate

INVITE_DIR = Path(__file__).resolve().parent
SERIES_DIR = INVITE_DIR / 'SECOND_SERIES'
UNIVERSAL_FILE = INVITE_DIR / 'universal_conference_invite.html'

def seed():
    # 1. Seed or update the Universal Conference Invite template
    if UNIVERSAL_FILE.exists():
        html_universal = UNIVERSAL_FILE.read_text(encoding='utf-8')
        EmailTemplate.objects.update_or_create(
            name='SECOND_SERIES - Universal Conference Invite',
            defaults={
                'subject': "Speaker invitation: {{ conference_name }}",
                'html_content': html_universal,
                'body': '',
                'variables': {
                    'greeting': 'Dear Colleague,',
                    'first_name': 'Speaker',
                    'email': 'speaker@example.com',
                    'company_name': 'Global Leadership Summits',
                    'conference_name': 'International Leadership Summit 2027',
                    'conference_date': 'March 8–11, 2027',
                    'conference_venue': 'Paris, France',
                    'conference_theme': 'Leading with Vision. Inspiring Global Influence',
                    'conference_website': 'https://prosummits.org/events/ewl-summit-2027',
                    'scheduling_link': 'https://calendly.com',
                    'physical_address': 'BLVD Heights, Dubai Opera District, Dubai, United Arab Emirates',
                    'current_year': '2027',
                    'unsubscribe_url': '#',
                }
            }
        )
        print("  [Seeded] SECOND_SERIES - Universal Conference Invite")

    # 2. Seed individual company templates
    company_files = {
        'NEXT': 'next.html',
        'PROSUMMITS': 'prosummits.html',
        'ICON': 'icon.html',
        'IDiAS': 'idias.html',
        'WYN': 'wyn.html',
        'WYNXTALKS': 'wynxtalks.html',
        'VOICETALKS': 'voicetalks.html',
    }

    # Company-specific details for realistic previews and links
    company_details = {
        'NEXT': {
            'conference_name': 'NEXT Leadership Summit 2027',
            'conference_theme': 'Leading with Vision. Inspiring Global Influence',
            'conference_website': 'https://nextpremierconferences.com',
            'website_url': 'https://nextpremierconferences.com',
            'linkedin_url': 'https://www.linkedin.com/company/next-premier-conferences/',
            'scheduling_link': 'https://calendly.com/nextpremierconferences/30min',
        },
        'PROSUMMITS': {
            'conference_name': 'PROSUMMITS Global Forum 2027',
            'conference_theme': 'Leading with Vision. Inspiring Global Influence',
            'conference_website': 'https://prosummits.org',
            'website_url': 'https://prosummits.org',
            'linkedin_url': 'https://www.linkedin.com/company/prosummits/',
            'scheduling_link': 'https://calendly.com/prosummits',
        },
        'ICON': {
            'conference_name': 'ICON Global Summit 2027',
            'conference_theme': 'Leading with Vision. Inspiring Global Influence',
            'conference_website': 'https://iconglobalconferences.com',
            'website_url': 'https://iconglobalconferences.com',
            'linkedin_url': 'https://www.linkedin.com/company/icon-global-conferences/',
            'scheduling_link': 'https://calendly.com/iconglobalc',
        },
        'IDiAS': {
            'conference_name': 'IDiAS Global Leadership Summit 2027',
            'conference_theme': 'Leading with Vision. Inspiring Global Influence',
            'conference_website': 'https://idiasglobalconferences.com',
            'website_url': 'https://idiasglobalconferences.com',
            'linkedin_url': 'https://www.linkedin.com/company/idias-global-conferences/',
            'scheduling_link': 'https://calendly.com/idiasglobalconferences',
        },
        'WYN': {
            'conference_name': 'WYN Global Conference 2027',
            'conference_theme': 'Leading with Vision. Inspiring Global Influence',
            'conference_website': 'https://wynconferences.com',
            'website_url': 'https://wynconferences.com',
            'linkedin_url': 'https://www.linkedin.com/company/wyn-conferences/',
            'scheduling_link': 'https://calendly.com/wynconferences',
        },
        'WYNXTALKS': {
            'conference_name': 'WYNxTalks Global Summit 2027',
            'conference_theme': 'Leading with Vision. Inspiring Global Influence',
            'conference_website': 'https://www.wynxtalks.com',
            'website_url': 'https://www.wynxtalks.com',
            'linkedin_url': 'https://www.linkedin.com/company/wynxtalks/',
            'scheduling_link': 'https://calendly.com/wynxtalks/15min',
        },
        'VOICETALKS': {
            'conference_name': 'VOICETALKS Global Summit 2027',
            'conference_theme': 'Leading with Vision. Inspiring Global Influence',
            'conference_website': 'https://voicetalks.org',
            'website_url': 'https://voicetalks.org',
            'linkedin_url': 'https://www.linkedin.com/company/voicetalks',
            'scheduling_link': 'https://calendly.com/voicetalks',
        },
    }

    for company, file_name in company_files.items():
        file_path = SERIES_DIR / file_name
        if not file_path.exists():
            print(f"  [Skipped] File not found: {file_path}")
            continue

        html = file_path.read_text(encoding='utf-8')
        name = f"SECOND_SERIES - {company}"
        details = company_details.get(company, {})

        EmailTemplate.objects.update_or_create(
            name=name,
            defaults={
                'subject': "Speaker invitation: {{ conference_name }}",
                'html_content': html,
                'body': '',
                'variables': {
                    'greeting': 'Dear Colleague,',
                    'first_name': 'Speaker',
                    'company_name': company,
                    'conference_name': details.get('conference_name', f'{company} Leadership Summit 2027'),
                    'conference_date': 'March 8–11, 2027',
                    'conference_venue': 'Paris, France',
                    'conference_theme': details.get('conference_theme', 'Leading with Vision. Inspiring Global Influence'),
                    'conference_website': details.get('conference_website', 'https://wynconferences.com'),
                    'website_url': details.get('website_url', 'https://wynconferences.com'),
                    'linkedin_url': details.get('linkedin_url', 'https://www.linkedin.com/company/wyn-conferences/'),
                    'scheduling_link': details.get('scheduling_link', 'https://calendly.com'),
                    'physical_address': 'BLVD Heights, Dubai Opera District, Dubai, United Arab Emirates',
                    'current_year': '2027',
                    'unsubscribe_url': '#',
                }
            }
        )
        print(f"  [Seeded] {name}")

    print("\nAll SECOND_SERIES templates successfully seeded into database!")

if __name__ == '__main__':
    seed()
