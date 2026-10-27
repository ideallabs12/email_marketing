"""
Update script:
1. Removes any outdated WYNXTALKS conference(s) from the Conference table.
2. Adds / updates the new WYNXTALKS conference:
   - Name: International Women's Day Conclave: A Global Movement for Women's Empowerment & Mental Wellbeing
   - Dates: March 08-12, 2027
   - Venue: Paris, France
   - Theme: Empowering Voices, Breaking Barriers, Shaping the Future
3. Updates the template variables for 'SECOND_SERIES - WYNXTALKS' in EmailTemplate.

Run inside backend container:
    docker compose exec backend python update_wynxtalks_conference.py
Or locally if connected to database:
    python update_wynxtalks_conference.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.campaigns.models import Conference
from apps.templates.models import EmailTemplate

NEW_CONF = {
    'company_name': 'WYNXTALKS',
    'conference_name': "International Women's Day Conclave: A Global Movement for Women's Empowerment & Mental Wellbeing",
    'date': 'March 08-12, 2027',
    'venue': 'Paris, France',
    'calendly_link': 'https://calendly.com/wynxtalks/15min',
    'website_link': 'https://www.wynxtalks.org',
    'linkedin_link': 'https://www.linkedin.com/company/wynxtalks/',
    'theme': 'Empowering Voices, Breaking Barriers, Shaping the Future',
}

def run():
    print("--- 1. Cleaning up existing WYNXTALKS conferences ---")
    deleted_count, _ = Conference.objects.filter(company_name='WYNXTALKS').exclude(
        conference_name=NEW_CONF['conference_name']
    ).delete()
    print(f"Removed {deleted_count} outdated WYNXTALKS conference(s).")

    print("\n--- 2. Creating / Updating New WYNXTALKS conference ---")
    conf, created = Conference.objects.update_or_create(
        company_name=NEW_CONF['company_name'],
        conference_name=NEW_CONF['conference_name'],
        defaults={
            'date': NEW_CONF['date'],
            'venue': NEW_CONF['venue'],
            'calendly_link': NEW_CONF['calendly_link'],
            'website_link': NEW_CONF['website_link'],
            'linkedin_link': NEW_CONF['linkedin_link'],
            'theme': NEW_CONF['theme'],
        }
    )
    status = "Created" if created else "Updated"
    print(f"[{status}] Conference ID={conf.id}: {conf.conference_name}")

    print("\n--- 3. Updating SECOND_SERIES - WYNXTALKS Template Variables ---")
    tpl = EmailTemplate.objects.filter(name='SECOND_SERIES - WYNXTALKS').first()
    if tpl:
        tpl.variables.update({
            'company_name': 'WYNXTALKS',
            'conference_name': NEW_CONF['conference_name'],
            'conference_date': NEW_CONF['date'],
            'conference_venue': NEW_CONF['venue'],
            'conference_theme': NEW_CONF['theme'],
            'conference_website': NEW_CONF['website_link'],
            'website_url': NEW_CONF['website_link'],
            'linkedin_url': NEW_CONF['linkedin_link'],
            'scheduling_link': NEW_CONF['calendly_link'],
        })
        tpl.save(update_fields=['variables'])
        print(f"Updated template variables for '{tpl.name}'.")
    else:
        print("Note: 'SECOND_SERIES - WYNXTALKS' template not found in DB (run seed_second_series_templates.py to create it).")

    print("\nDone! WYNXTALKS conference is ready in the database.")

if __name__ == '__main__':
    run()
