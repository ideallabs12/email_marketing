from apps.campaigns.models import Campaign
from django.utils import timezone
import zoneinfo

# Target timezone
ist = zoneinfo.ZoneInfo('Asia/Kolkata')

blasts = Campaign.objects.all()
for blast in blasts:
    template = blast.template
    cat_name = 'Blast'
    if template and template.name:
        name_lower = template.name.lower()
        if 'invite' in name_lower:
            cat_name = 'Invite'
        elif 'followup' in name_lower:
            cat_name = 'Followup'
        elif 'podcast' in name_lower:
            cat_name = 'Podcast'
            
    brand_name = 'UnknownBrand'
    if blast.podcast_sender:
        brand_name = blast.podcast_sender.name
    elif blast.from_email:
        brand_name = blast.from_email.split(' ')[0]

    # Convert UTC to IST
    local_time = blast.created_at.astimezone(ist)
    date_str = local_time.strftime("%b %d, %I:%M %p")

    new_name = f"{cat_name} - {brand_name} - {date_str}"
    
    # Update if it doesn't match
    if blast.name != new_name:
        print(f"Updating {blast.id}: '{blast.name}' -> '{new_name}'")
        blast.name = new_name
        blast.save(update_fields=['name'])

print("All blasts updated with CORRECT time successfully!")
