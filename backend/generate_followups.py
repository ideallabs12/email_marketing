import re
import os
from pathlib import Path

def generate_followup(company, source_html_name, followup_html_name, calendly_link, conf_name, conf_date, conf_venue, conf_link, bg_color, theme_color, text_color):
    base_dir = Path("templates")
    source_path = base_dir / "invite_templates" / company / source_html_name
    dest_path = base_dir / "followup_templates" / company / followup_html_name
    
    if not source_path.exists():
        print(f"Source not found: {source_path}")
        return

    content = source_path.read_text(encoding='utf-8')

    # Replace "Speaker Invitation" with "Follow-up Invitation"
    content = content.replace("Speaker Invitation", "Follow-up Invitation")
    
    # We will replace the block from <!-- GREETING + INTRO --> to <!-- SIGN OFF -->
    start_marker = "<!-- GREETING + INTRO -->"
    end_marker = "<!-- SIGN OFF -->"
    
    if start_marker not in content or end_marker not in content:
        print(f"Markers not found in {company}")
        return
        
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    calendly_html = f"""
                    <!-- CTA LINE -->
                    <tr>
                        <td class="fluid-pad" style="padding:20px 48px 6px 48px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="sans"
                                        style="color:{text_color}; font-size:14px; line-height:22px; padding-bottom:14px;">
                                        📞 To connect with our team, you may book a convenient time via Calendly:
                                    </td>
                                </tr>
                                <tr>
                                     <td align="left">
                                         <table role="presentation" cellpadding="0" cellspacing="0" class="accept-btn">
                                             <tr>
                                                 <td align="center" bgcolor="{theme_color}" style="border-radius:2px;">
                                                     <a href="{calendly_link}" target="_blank"
                                                         class="sans"
                                                         style="display:inline-block; padding:12px 28px; color:#FFFFFF; font-size:13px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">
                                                         Schedule a Call
                                                     </a>
                                                 </td>
                                             </tr>
                                         </table>
                                     </td>
                                 </tr>
                            </table>
                        </td>
                    </tr>
""" if calendly_link else ""

    new_block = f"""<!-- GREETING + INTRO -->
                    <tr>
                        <td class="fluid-pad" style="padding:24px 48px 6px 48px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="sans"
                                        style="color:{bg_color}; font-size:16px; font-weight:bold; padding-bottom:12px;">
                                        Hi {{{{ first_name }}}},
                                    </td>
                                </tr>
                                <tr>
                                    <td class="sans"
                                        style="color:{text_color}; font-size:14px; line-height:22px; padding-bottom:12px;">
                                        I hope you’re doing well.
                                    </td>
                                </tr>
                                <tr>
                                    <td class="sans"
                                        style="color:{text_color}; font-size:14px; line-height:22px; padding-bottom:12px;">
                                        I’m following up on our invitation to you to participate as a Speaker at our upcoming conference. We are currently finalizing our speaker lineup, and we would truly value the opportunity to have you join us.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CONTENT -->
                    <tr>
                        <td class="fluid-pad" style="padding:16px 48px 6px 48px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="sans"
                                        style="color:{text_color}; font-size:14px; line-height:22px; padding-bottom:16px;">
                                        <strong>{conf_name}</strong><br>
                                        📅 {conf_date}<br>
                                        📍 {conf_venue}<br>
                                        🌐 Conference Details: <a href="{conf_link}" style="color:{theme_color};">{conf_link}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="sans"
                                        style="color:{text_color}; font-size:14px; line-height:22px; padding-bottom:12px;">
                                        If you are interested in joining us as a speaker, kindly let us know your interest and availability so we can proceed with the next steps.<br><br>
                                        We would be delighted to have your voice and expertise represented on our global platform.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
{calendly_html}
                    """
    
    new_content = content[:start_idx] + new_block + content[end_idx:]
    
    # Also fix the hidden text at the top
    # <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    hidden_text_regex = re.compile(r'(<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">)(.*?)(</div>)', re.DOTALL)
    new_content = hidden_text_regex.sub(rf'\1\n        We’re following up on our invitation for you to participate as a Global Speaker at {conf_name}.\n    \3', new_content)
    
    dest_path.write_text(new_content, encoding='utf-8')
    print(f"Created {dest_path}")
    
    # Create the seed script
    seed_name = f"seed_{followup_html_name.replace('.html', '.py')}"
    seed_path = base_dir / "followup_templates" / company / seed_name
    
    template_name = followup_html_name.replace('.html', '').upper()
    subject = f"Following up: Speaker Opportunity — {conf_name}"
    
    seed_content = f'''"""
Seed script: inserts the {company} Follow-up email template into the database.
"""
import os
import sys
import django
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent.parent.parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from pathlib import Path
from apps.templates.models import EmailTemplate

TEMPLATE_FILE = Path(__file__).resolve().parent / '{followup_html_name}'

if not TEMPLATE_FILE.exists():
    print(f"ERROR: Template file not found at {{TEMPLATE_FILE}}")
    sys.exit(1)

html_content = TEMPLATE_FILE.read_text(encoding='utf-8')

TEMPLATE_NAME = "{template_name}"
SUBJECT       = "{subject}"

obj, created = EmailTemplate.objects.get_or_create(
    name=TEMPLATE_NAME,
    defaults={{
        'subject':      SUBJECT,
        'html_content': html_content,
        'body':         '',
        'variables':    {{
            'first_name': 'Speaker',
            'last_name':  '',
        }},
    }},
)

if created:
    print(f"Template created successfully (id={{obj.id}}): '{{obj.name}}'")
else:
    obj.html_content = html_content
    obj.subject      = SUBJECT
    obj.save()
    print(f"Template already existed (id={{obj.id}}) -- html_content refreshed.")
'''
    seed_path.write_text(seed_content, encoding='utf-8')
    print(f"Created {seed_path}")

# ICON
generate_followup(
    company="ICON", 
    source_html_name="icon_second_invite.html", 
    followup_html_name="icon_followup_01.html", 
    calendly_link="https://calendly.com/iconglobalc", 
    conf_name="ICON Global Conferences", 
    conf_date="Dates TBA", 
    conf_venue="TBA", 
    conf_link="https://www.iconglobalconferences.com", 
    bg_color="#0A1D37", 
    theme_color="#F9A826", 
    text_color="#333333"
)

# IDIAS
generate_followup(
    company="IDIAS", 
    source_html_name="idias_invite_1.html", 
    followup_html_name="idias_followup_01.html", 
    calendly_link="https://calendly.com/idiasglobalconferences", 
    conf_name="IDIAS Global Conferences", 
    conf_date="Dates TBA", 
    conf_venue="TBA", 
    conf_link="https://idiasglobal.com", 
    bg_color="#1F4E5B", 
    theme_color="#E07A5F", 
    text_color="#3D405B"
)

# NEXT
generate_followup(
    company="NEXT", 
    source_html_name="next_invite_1.html", 
    followup_html_name="next_followup_01.html", 
    calendly_link="https://calendly.com/nextpremierconferences/30min", 
    conf_name="NEXT Premier Conferences", 
    conf_date="Dates TBA", 
    conf_venue="TBA", 
    conf_link="https://nextpremier.org", 
    bg_color="#2B2D42", 
    theme_color="#EF233C", 
    text_color="#2B2D42"
)

# SGC
generate_followup(
    company="SGC", 
    source_html_name="SGC_INVITE_01.html", 
    followup_html_name="sgc_followup_01.html", 
    calendly_link="", 
    conf_name="Women in Tech Leadership Summit 2027", 
    conf_date="March 08–09, 2027", 
    conf_venue="Hyderabad, India", 
    conf_link="https://signaturetalks.org", 
    bg_color="#1E1544", 
    theme_color="#D4AF6A", 
    text_color="#3B3752"
)
