import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.campaigns.models import PodcastSender

brands = [
    {
        'name': 'IDiAS',
        'website_url': 'https://www.idias.org',
        'linkedin_url': 'https://www.linkedin.com/company/idias-global-conferences/',
        'scheduling_link': 'https://calendly.com/idiasglobalconferences',
        'physical_address': 'BLVD Heights, Dubai Opera District, Dubai, United Arab Emirates'
    },
    {
        'name': 'SIGNATURE',
        'website_url': '',
        'linkedin_url': '',
        'scheduling_link': 'https://calendly.com/usasignatureglobalconferences',
        'physical_address': 'Parklane West, Menands, Albany, New York 12204, US'
    },
    {
        'name': 'ICON',
        'website_url': 'https://www.iconconferences.org',
        'linkedin_url': 'https://www.linkedin.com/company/icon-global-conferences/',
        'scheduling_link': 'https://calendly.com/iconglobalc',
        'physical_address': 'BLVD Heights, Dubai Opera District, Dubai, United Arab Emirates'
    },
    {
        'name': 'NEXT',
        'website_url': 'https://www.nextconferences.org',
        'linkedin_url': 'https://www.linkedin.com/company/next-premier-conferences/posts/?feedView=all',
        'scheduling_link': 'https://calendly.com/nextpremierconferences/30min',
        'physical_address': 'Albany, USA'
    },
    {
        'name': 'VOICETALKS',
        'website_url': 'https://www.voicetalks.org',
        'linkedin_url': 'https://www.linkedin.com/company/voicetalks/',
        'scheduling_link': 'https://calendly.com/voicetalks',
        'physical_address': 'Albany, USA'
    },
    {
        'name': 'WYNXTALKS',
        'website_url': 'https://www.wynxtalks.com',
        'linkedin_url': 'https://www.linkedin.com/company/wynxtalks/',
        'scheduling_link': 'https://calendly.com/wynxtalks/15min',
        'physical_address': 'BLVD Heights, Dubai Opera District, Dubai, United Arab Emirates'
    },
    {
        'name': 'WYN',
        'website_url': 'https://www.wynconferences.com',
        'linkedin_url': 'https://www.linkedin.com/company/wyn-global-conferences/posts/?feedView=all',
        'scheduling_link': 'https://calendly.com/wynconferences',
        'physical_address': '7522 Campbell Rd, Suite 113 #431, Dallas, Texas 75248, US'
    }
]

def seed_senders():
    print("Seeding PodcastSenders...")
    for brand_data in brands:
        sender, created = PodcastSender.objects.update_or_create(
            name=brand_data['name'],
            defaults={
                'website_url': brand_data['website_url'],
                'linkedin_url': brand_data['linkedin_url'],
                'scheduling_link': brand_data['scheduling_link'],
                'physical_address': brand_data['physical_address']
            }
        )
        if created:
            print(f"Created: {sender.name}")
        else:
            print(f"Updated: {sender.name}")
    print("Done!")

if __name__ == '__main__':
    seed_senders()
