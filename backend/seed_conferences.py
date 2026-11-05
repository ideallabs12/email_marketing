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
        'conference_name': 'NEXT Premier League Conferences on the 2nd Women Power – Leadership Congress',
        'date': 'March 11–13, 2027',
        'venue': 'Paris, France',
        'calendly_link': 'https://calendly.com/nextpremierconferences/30min',
        'website_link': 'https://www.nextconferences.org/conference/wplc_paris',
        'linkedin_link': 'https://www.linkedin.com/company/next-premier-conferences/',
        'theme': 'Your Voice. Your Vision. Your Global Impact',
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

    # ── ICON ────────────────────────────────────────────────────────────
    {
        'company_name': 'ICON',
        'conference_name': 'International Conference on Leadership, Innovation, Future & Transformation (L.I.F.T)',
        'date': 'March 08–11, 2027',
        'venue': 'Paris, France',
        'calendly_link': 'https://calendly.com/iconglobalc',
        'website_link': 'https://www.iconconferences.org/conference/she-2027',
        'linkedin_link': 'https://www.linkedin.com/company/icon-global-conferences/',
        'theme': 'Building future-ready leaders through innovation, transformation, and global collaboration',
    },

    # ── IDiAS ───────────────────────────────────────────────────────────
    {
        'company_name': 'IDiAS',
        'conference_name': '13th International L.E.A.D Summit for Women: Leadership, Empowerment & Development',
        'date': 'November 25–27, 2026',
        'venue': 'Dubai, UAE',
        'calendly_link': 'https://calendly.com/idiasglobalconferences',
        'website_link': 'https://www.idias.org/events/13thlead-2026',
        'linkedin_link': 'https://www.linkedin.com/company/idias-global-conferences/',
        'theme': 'Transforming Women’s Power : Toward a Re-Vision of Women Leadership',
    },

    # ── WYN ─────────────────────────────────────────────────────────────
    {
        'company_name': 'WYN',
        'conference_name': 'NextGen Women Global Summit 2027',
        'date': 'March 08–11, 2027',
        'venue': 'Paris, France',
        'calendly_link': 'https://calendly.com/wynconferences',
        'website_link': 'https://www.wynconferences.com/conference/wyn_wgs',
        'linkedin_link': 'https://www.linkedin.com/company/wyn-global-conferences/',
        'theme': 'Inspiring the Next Generation of Women Leaders Worldwide',
    },

    # ── VOICETALKS ──────────────────────────────────────────────────────
    {
        'company_name': 'VOICETALKS',
        'conference_name': 'VOICE Global Summit on Women Empowerment and Social Transformation',
        'date': 'March 11–13, 2027',
        'venue': 'Paris, France',
        'calendly_link': 'https://calendly.com/voicetalks',
        'website_link': 'https://www.voicetalks.org/conference/voicewest',
        'linkedin_link': 'https://www.linkedin.com/company/voicetalks/',
        'theme': 'Women Empowerment and Social Transformation',
    },

    # ── WYNXTALKS ───────────────────────────────────────────────────────
    {
        'company_name': 'WYNXTALKS',
        'conference_name': "International Women's Day Conclave: A Global Movement for Women's Empowerment & Mental Wellbeing",
        'date': 'March 08-12, 2027',
        'venue': 'Paris, France',
        'calendly_link': 'https://calendly.com/wynxtalks/15min',
        'website_link': 'https://www.wynxtalks.org',
        'linkedin_link': 'https://www.linkedin.com/company/wynxtalks/',
        'theme': 'Empowering Voices, Breaking Barriers, Shaping the Future',
    },

    # ── SIGNATURE ───────────────────────────────────────────────────────
    {
        'company_name': 'SIGNATURE',
        'conference_name': 'USA Signature Global Leadership Summit 2027',
        'date': 'September 15–17, 2027',
        'venue': 'Albany, New York, USA',
        'calendly_link': 'https://calendly.com/usasignatureglobalconferences',
        'website_link': 'https://signaturetalks.org',
        'linkedin_link': 'https://www.linkedin.com/company/signature-global-conferences',
        'theme': 'Executive Excellence and Global Impact',
    },
]

def seed_conferences():
    print(f"Seeding {len(conferences_data)} conferences into Conference table...")
    
    # Remove old WYNXTALKS conferences that do not match the new conference
    deleted_count, _ = Conference.objects.filter(company_name='WYNXTALKS').exclude(
        conference_name="International Women's Day Conclave: A Global Movement for Women's Empowerment & Mental Wellbeing"
    ).delete()
    if deleted_count > 0:
        print(f"  [Removed] {deleted_count} outdated WYNXTALKS conference(s)")

    # Clean up any PROSUMMITS conferences that are not the current Paris summit
    deleted_prosummits, _ = Conference.objects.filter(company_name='PROSUMMITS').exclude(
        conference_name='Elite Women Leadership Summit 2027'
    ).delete()
    if deleted_prosummits > 0:
        print(f"  [Removed] {deleted_prosummits} outdated PROSUMMITS conference(s)")

    # Clean up any NEXT conferences that are not the new Paris congress
    deleted_next, _ = Conference.objects.filter(company_name='NEXT').exclude(
        conference_name='NEXT Premier League Conferences on the 2nd Women Power – Leadership Congress'
    ).delete()
    if deleted_next > 0:
        print(f"  [Removed] {deleted_next} outdated NEXT conference(s)")

    # Clean up any WYN conferences that are not the new Paris summit
    deleted_wyn, _ = Conference.objects.filter(company_name='WYN').exclude(
        conference_name='NextGen Women Global Summit 2027'
    ).delete()
    if deleted_wyn > 0:
        print(f"  [Removed] {deleted_wyn} outdated WYN conference(s)")

    # Clean up any VOICETALKS conferences that are not the new Paris summit
    deleted_voicetalks, _ = Conference.objects.filter(company_name='VOICETALKS').exclude(
        conference_name='VOICE Global Summit on Women Empowerment and Social Transformation'
    ).delete()
    if deleted_voicetalks > 0:
        print(f"  [Removed] {deleted_voicetalks} outdated VOICETALKS conference(s)")

    # Clean up any ICON conferences that are not the new Paris conference
    deleted_icon, _ = Conference.objects.filter(company_name='ICON').exclude(
        conference_name='International Conference on Leadership, Innovation, Future & Transformation (L.I.F.T)'
    ).delete()
    if deleted_icon > 0:
        print(f"  [Removed] {deleted_icon} outdated ICON conference(s)")

    # Clean up any IDiAS conferences that are not the new LEAD summit
    deleted_idias, _ = Conference.objects.filter(company_name='IDiAS').exclude(
        conference_name='13th International L.E.A.D Summit for Women: Leadership, Empowerment & Development'
    ).delete()
    if deleted_idias > 0:
        print(f"  [Removed] {deleted_idias} outdated IDiAS conference(s)")

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
