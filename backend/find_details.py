import os
import re

base_paths = [
    'templates/invite_templates',
    'templates/followup_templates'
]

def extract_details(content):
    title = re.search(r'<td[^>]*class="[^"]*hero-title[^"]*"[^>]*>(.*?)</td>', content, re.DOTALL)
    title_text = ''
    if title:
        title_text = re.sub(r'<[^>]+>', ' ', title.group(1)).strip()
        title_text = re.sub(r'\s+', ' ', title_text)
    
    date_match = re.search(r'<strong>Date</strong><br>(.*?)(?:<|\\n)', content, re.IGNORECASE)
    venue_match = re.search(r'<strong>Venue</strong><br>(.*?)(?:<|\\n)', content, re.IGNORECASE)
    
    date_text = date_match.group(1).strip() if date_match else ''
    venue_text = venue_match.group(1).strip() if venue_match else ''
    
    return title_text, date_text, venue_text

for base in base_paths:
    print(f"\\n--- {base} ---")
    if not os.path.exists(base):
        continue
    for root, dirs, files in os.walk(base):
        for file in files:
            if file.endswith('.html'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                title, date, venue = extract_details(content)
                print(f"{file} -> TITLE: {title} | DATE: {date} | VENUE: {venue}")
