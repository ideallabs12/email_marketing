import os
import re

base_paths = [
    'templates/invite_templates',
    'templates/followup_templates'
]

def extract_details(content):
    title = re.search(r'<td[^>]*class="[^"]*hero-title[^"]*"[^>]*>(.*?)</td>', content, re.DOTALL)
    title_text = ''
    raw_title = ''
    if title:
        raw_title = title.group(1)
        title_text = re.sub(r'<[^>]+>', ' ', raw_title).strip()
        title_text = re.sub(r'\s+', ' ', title_text)
    
    date_match = re.search(r'<strong>Date</strong><br>\s*(.*?)\s*(?:<|\r?\n)', content, re.IGNORECASE)
    venue_match = re.search(r'<strong>Venue</strong><br>\s*(.*?)\s*(?:<|\r?\n)', content, re.IGNORECASE)
    
    date_text = date_match.group(1).strip() if date_match else ''
    venue_text = venue_match.group(1).strip() if venue_match else ''
    
    # Try to find emoji dates if normal dates aren't found (for followups)
    if not date_text:
        emoji_date = re.search(r'📅\s*(.*?)\s*(?:<|\r?\n)', content, re.IGNORECASE)
        if emoji_date:
            date_text = emoji_date.group(1).strip()
    if not venue_text:
        emoji_venue = re.search(r'📍\s*(.*?)\s*(?:<|\r?\n)', content, re.IGNORECASE)
        if emoji_venue:
            venue_text = emoji_venue.group(1).strip()
            
    return raw_title, title_text, date_text, venue_text

for base in base_paths:
    if not os.path.exists(base):
        continue
    for root, dirs, files in os.walk(base):
        for file in files:
            if file.endswith('.html'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                raw_title, title, date, venue = extract_details(content)
                new_content = content
                
                # We need to replace only specific occurrences where these strings live, 
                # but to be safe and thorough, we can replace the actual raw values in the HTML
                
                if raw_title and not ('{{ event_name' in raw_title):
                    default_title = title.replace('"', '&quot;')
                    replacement_title = f'{{{{ event_name|default:"{default_title}" }}}}'
                    new_content = new_content.replace(raw_title, f"\\n                                        {replacement_title}\\n                                    ")
                
                if date and not ('{{ event_date' in date):
                    default_date = date.replace('"', '&quot;')
                    replacement_date = f'{{{{ event_date|default:"{default_date}" }}}}'
                    new_content = new_content.replace(date, replacement_date)
                
                if venue and not ('{{ event_venue' in venue):
                    default_venue = venue.replace('"', '&quot;')
                    replacement_venue = f'{{{{ event_venue|default:"{default_venue}" }}}}'
                    new_content = new_content.replace(venue, replacement_venue)
                
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {file} | DATE: {date} | VENUE: {venue}")
