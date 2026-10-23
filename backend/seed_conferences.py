"""
Seed script: Populates sample conferences for each company into the Conference table.
Run inside the backend Docker container:
    docker compose exec backend python seed_conferences.py
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.campaigns.models import Conference

conferences_data = [
    # ── NEXT ────────────────────────────────────────────────────────────
    {
        'company_name': 'NEXT',
        'conference_name': 'NEXT Premier League Conference First',
        'date': 'March 8–11, 2027',
        'venue': 'Paris, France',
        'calendly_link': 'https://calendly.com/nextpremierconferences/30min',
        'website_link': 'https://www.nextconferences.org',
        'linkedin_link': 'https://www.linkedin.com/company/next-premier-conferences/',
        'theme': 'Inspiring Global Innovation & Leadership',
    },
    {
        'company_name': 'NEXT',
        'conference_name': 'NEXT Premier League Conference Second',
        'date': 'March 8–9, 2027',
        'venue': 'New York, USA',
        'calendly_link': 'https://calendly.com/nextpremierconferences/30min',
        'website_link': 'https://www.nextconferences.org',
        'linkedin_link': 'https://www.linkedin.com/company/next-premier-conferences/',
        'theme': 'Empowering Voices, Inspiring Leadership, Driving Change',
    },

    # ── PROSUMMITS ──────────────────────────────────────────────────────
    {
        'company_name': 'PROSUMMITS',
        'conference_name': 'Elite Women Leadership Summit 2027',
        'date': 'March 8–11, 2027',
        'venue': 'Paris, France',
        'calendly_link': 'https://calendly.com/prosummitsvirtual',
        'website_link': 'https://prosummits.org/events/ewl-summit-2027',
        'linkedin_link': 'https://www.linkedin.com/company/prosummits/',
        'theme': 'Leading with Vision. Inspiring Global Influence',
    },
    {
        'company_name': 'PROSUMMITS',
        'conference_name': 'NextGen Women of Influence Summit 2027',
        'date': 'March 8–9, 2027',
        'venue': 'New York, USA',
        'calendly_link': 'https://calendly.com/prosummitsvirtual',
        'website_link': 'https://prosummits.org/events/ngwi-summit-2027',
        'linkedin_link': 'https://www.linkedin.com/company/prosummits/',
        'theme': 'Empowering Voices, Inspiring Leadership, Driving Change',
    },

    # ── ICON ────────────────────────────────────────────────────────────
    {
        'company_name': 'ICON',
        'conference_name': "13th International Summit on Women's Leadership Excellence 2026",
        'date': 'November 25–27, 2026',
        'venue': 'Dubai, UAE',
        'calendly_link': 'https://calendly.com/iconglobalc',
        'website_link': 'https://www.iconconferences.org',
        'linkedin_link': 'https://www.linkedin.com/company/icon-global-conferences/',
        'theme': 'Rise: Next Level Strategies for Success',
    },

    # ── IDiAS ───────────────────────────────────────────────────────────
    {
        'company_name': 'IDiAS',
        'conference_name': 'Global Healthcare & Leadership Congress 2027',
        'date': 'April 14–16, 2027',
        'venue': 'London, UK',
        'calendly_link': 'https://calendly.com/idiasglobalconferences',
        'website_link': 'https://www.idias.org',
        'linkedin_link': 'https://www.linkedin.com/company/idias-global-conferences/',
        'theme': 'Transforming Healthcare, Elevating Leaders',
    },

    # ── WYN ─────────────────────────────────────────────────────────────
    {
        'company_name': 'WYN',
        'conference_name': 'World Summit on Women in Science & Technology 2027',
        'date': 'May 18–20, 2027',
        'venue': 'Singapore',
        'calendly_link': 'https://calendly.com/wynconferences',
        'website_link': 'https://www.wynconferences.com',
        'linkedin_link': 'https://www.linkedin.com/company/wyn-global-conferences/',
        'theme': 'Shaping the Future Through Research & Innovation',
    },

    # ── VOICETALKS ──────────────────────────────────────────────────────
    {
        'company_name': 'VOICETALKS',
        'conference_name': 'VoiceTalks Global Thought Leadership Forum 2027',
        'date': 'June 10–12, 2027',
        'venue': 'Amsterdam, Netherlands',
        'calendly_link': 'https://calendly.com/voicetalks',
        'website_link': 'https://www.voicetalks.org',
        'linkedin_link': 'https://www.linkedin.com/company/voicetalks/',
        'theme': 'Amplifying Voices That Change The World',
    },

    # ── WYNXTALKS ───────────────────────────────────────────────────────
    {
        'company_name': 'WYNXTALKS',
        'conference_name': 'WynxTalks International Leadership Summit 2027',
        'date': 'July 14–16, 2027',
        'venue': 'Berlin, Germany',
        'calendly_link': 'https://calendly.com/wynxtalks',
        'website_link': 'https://www.wynxtalks.org',
        'linkedin_link': 'https://www.linkedin.com/company/wynxtalks/',
        'theme': 'Empowering Global Voices & Creative Leadership',
    },

    # ── SIGNATURE ───────────────────────────────────────────────────────
    {
        'company_name': 'SIGNATURE',
        'conference_name': 'USA Signature Global Leadership Summit 2027',
        'date': 'September 15–17, 2027',
        'venue': 'Albany, New York, USA',
        'calendly_link': 'https://calendly.com/usasignatureglobalconferences',
        'website_link': '',
        'linkedin_link': '',
        'theme': 'Executive Excellence and Global Impact',
    },
]

def seed_conferences():
    print(f"Seeding {len(conferences_data)} conferences into Conference table...")
    for item in conferences_data:
        obj, created = Conference.objects.update_or_create(
            company_name=item['company_name'],
            conference_name=item['conference_name'],
            defaults={
                'date': item['date'],
                'venue': item['venue'],
                'calendly_link': item['calendly_link'],
                'website_link': item['website_link'],
                'linkedin_link': item['linkedin_link'],
                'theme': item['theme'],
            }
        )
        status_text = "Created" if created else "Updated"
        print(f"  [{status_text}] {obj.company_name} -> {obj.conference_name}")
    print("Done! Conferences seeded successfully.")

if __name__ == '__main__':
    seed_conferences()
