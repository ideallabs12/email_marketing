import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.templates.models import EmailTemplate

t = EmailTemplate.objects.get(id=2)
html = t.html_content

# 1. Remove CTA
import re
cta_pattern = re.compile(r'<!-- CTA -->.*?tap the button to open a pre-filled confirmation email\s*</td>\s*</tr>', re.DOTALL)
html = cta_pattern.sub('', html)

# 2. Update Quote Section
quote_pattern = re.compile(r'<!-- QUOTE BLOCK WITH CHARMINAR MOTIF AND FOOTER IMAGE -->.*?</tr>', re.DOTALL)

quote_new = '''        <!-- QUOTE BLOCK WITH BACKGROUND IMAGE -->
        <tr>
          <td class="fluid-pad" style="padding:36px 48px 8px 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F5F1; border-left:3px solid #D4AF6A; background-image:url('https://tohlagjzvjoqrutolcwf.supabase.co/storage/v1/object/public/email_marketing/mail_footer.png'); background-size:cover; background-position:center; background-blend-mode: multiply;">
              <tr>
                <td style="padding:24px 20px 24px 26px;" valign="middle">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="middle">
                        <div class="sans" style="color:#3B3752; font-size:14px; line-height:22px; font-style:italic;">
                          "Great leadership isn't about having all the answers — it's about creating space for others to lead."
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>'''

html = quote_pattern.sub(quote_new, html)

t.html_content = html
t.save()
print('Template updated successfully.')
