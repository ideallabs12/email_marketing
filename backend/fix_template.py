import os
import django
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from apps.templates.models import EmailTemplate

original_html = """<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>WTLS 2027 — Speaker Invitation</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td { font-family: Georgia, 'Times New Roman', serif; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; background-color:#EEECF3; }
  table { border-collapse:collapse; }
  img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { text-decoration:none; }
  .sans { font-family: Arial, Helvetica, sans-serif; }

  @media only screen and (max-width:600px) {
    .email-container { width:100% !important; }
    .fluid-pad { padding-left:24px !important; padding-right:24px !important; }
    .stack { display:block !important; width:100% !important; }
    .col-card { display:block !important; width:100% !important; padding:0 0 16px 0 !important; }
    .hero-title { font-size:26px !important; line-height:32px !important; }
    .accept-btn { width:100% !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#EEECF3;">

<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
  You're invited to speak at the Women in Tech Leadership Summit 2027 — Hyderabad, March 08–09.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EEECF3;">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#FFFFFF; box-shadow:0 4px 28px rgba(29,20,79,0.10);">

        <!-- LOGO / TOP BAR -->
        <tr>
          <td style="background-color:#1E1544; padding:26px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td class="sans" style="color:#F3EFE6; font-size:14px; font-weight:bold; letter-spacing:2px; text-transform:uppercase;">
                  <!-- Replace with <img src="YOUR_LOGO_URL" width="140" alt="Signature Global Conferences" style="display:block;"> if a logo is supplied -->
                  Signature Global Conferences
                </td>
                <td align="right" class="sans" style="color:#B79C5D; font-size:11px; letter-spacing:1px;">
                  Global Conferences &nbsp;•&nbsp; Executive Leadership
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- HERO -->
        <tr>
          <!-- ADDED BACKGROUND IMAGE FOR EMAIL HEADER SECTION -->
          <td class="fluid-pad" background="https://tohlagjzvjoqrutolcwf.supabase.co/storage/v1/object/public/email_marketing/mail_header.png" style="background:url('https://tohlagjzvjoqrutolcwf.supabase.co/storage/v1/object/public/email_marketing/mail_header.png') no-repeat center center; background-size:cover; padding:52px 40px 46px 40px;">
            <!--[if gte mso 9]>
            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:220px;">
              <v:fill type="tile" src="https://tohlagjzvjoqrutolcwf.supabase.co/storage/v1/object/public/email_marketing/mail_header.png" />
              <v:textbox inset="0,0,0,0">
            <![endif]-->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:4px; background-color:#D4AF6A; line-height:1px; font-size:0;">&nbsp;</td>
                      <td style="width:10px;">&nbsp;</td>
                      <td class="sans" style="color:#D4AF6A; font-size:12px; letter-spacing:3px; text-transform:uppercase; font-weight:bold;">
                        Speaker Invitation
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td class="hero-title" style="color:#FFFFFF; font-size:33px; line-height:41px; font-weight:normal; padding-top:16px;">
                  Women in Tech Leadership<br>Summit&nbsp;<span style="color:#D4AF6A;">2027</span>
                </td>
              </tr>
              <tr>
                <td style="padding-top:8px;">
                  <div style="width:56px; height:2px; background-color:#D4AF6A; line-height:2px; font-size:0;">&nbsp;</div>
                </td>
              </tr>
              <tr>
                <td class="sans" style="color:#C8BEE0; font-size:13px; letter-spacing:1px; padding-top:14px;">
                  Inspiring the Next Generation of Technology Leaders
                </td>
              </tr>
            </table>
            <!--[if gte mso 9]>
              </v:textbox>
            </v:rect>
            <![endif]-->
          </td>
        </tr>

        <!-- GOLD RULE -->
        <tr>
          <td style="background-color:#D4AF6A; height:3px; line-height:3px; font-size:0;">&nbsp;</td>
        </tr>

        <!-- GREETING + INTRO -->
        <tr>
          <td class="fluid-pad" style="padding:44px 48px 6px 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td class="sans" style="color:#1E1544; font-size:17px; font-weight:bold; padding-bottom:20px;">
                  Dear {{ first_name }},
                </td>
              </tr>
              <tr>
                <td class="sans" style="color:#3B3752; font-size:15px; line-height:26px; padding-bottom:18px;">
                  We're reaching out from <strong>Signature Global Conferences</strong> to invite you as a distinguished speaker at the <strong>Women in Tech Leadership Summit 2027</strong> — a gathering of leaders, builders, and innovators shaping the future of technology.
                </td>
              </tr>
              <tr>
                <td class="sans" style="color:#3B3752; font-size:15px; line-height:26px; padding-bottom:8px;">
                  Your expertise and leadership stood out to us, and we believe your perspective would be genuinely valuable to the attendees joining us this year. We'd be honored to have you share your insights on our stage.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- TWO COLUMN CARDS -->
        <tr>
          <td class="fluid-pad" style="padding:26px 48px 6px 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- EVENT DETAILS -->
                <td class="stack col-card" width="48%" valign="top" style="border:1px solid #E7E2D6;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:22px 22px 18px 22px;">
                        <div class="sans" style="color:#9A7A3E; font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:bold; padding-bottom:14px;">
                          Event Details
                        </div>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td class="sans" style="color:#1E1544; font-size:13px; line-height:24px; padding-bottom:4px;">
                              <strong>Date</strong><br>March 08–09, 2027
                            </td>
                          </tr>
                          <tr>
                            <td class="sans" style="color:#1E1544; font-size:13px; line-height:24px; padding-top:10px;">
                              <strong>Venue</strong><br>Hyderabad, India
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>

                <td class="stack" width="4%" style="font-size:0; line-height:0;">&nbsp;</td>

                <!-- WHY SPEAK -->
                <td class="stack col-card" width="48%" valign="top" style="border:1px solid #E7E2D6;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:22px 22px 18px 22px;">
                        <div class="sans" style="color:#9A7A3E; font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:bold; padding-bottom:14px;">
                          Why Speak at WTLS
                        </div>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td class="sans" style="color:#3B3752; font-size:13px; line-height:20px; padding-bottom:9px;">
                              <span style="color:#D4AF6A;">&#10003;</span>&nbsp; Share your expertise with a global audience
                            </td>
                          </tr>
                          <tr>
                            <td class="sans" style="color:#3B3752; font-size:13px; line-height:20px; padding-bottom:9px;">
                              <span style="color:#D4AF6A;">&#10003;</span>&nbsp; Connect with industry leaders and innovators
                            </td>
                          </tr>
                          <tr>
                            <td class="sans" style="color:#3B3752; font-size:13px; line-height:20px;">
                              <span style="color:#D4AF6A;">&#10003;</span>&nbsp; Inspire the next generation in tech
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA REMOVED (Replaced during processing) -->
        
        <!-- QUOTE BLOCK WITH BACKGROUND IMAGE -->
        <tr>
          <td class="fluid-pad" style="padding:36px 48px 8px 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1E1544; border-left:3px solid #D4AF6A; background-image:url('https://tohlagjzvjoqrutolcwf.supabase.co/storage/v1/object/public/email_marketing/mail_footer.png'); background-size:cover; background-position:right center; background-repeat:no-repeat;">
              <tr>
                <td style="padding:24px 20px 24px 26px;" valign="middle">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td valign="middle">
                        <div class="sans" style="color:#FFFFFF; font-size:14px; line-height:22px; font-style:italic; font-weight:normal;">
                          "Great leadership isn't about having all the answers — it's about creating space for others to lead."
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- SIGN OFF -->
        <tr>
          <td class="fluid-pad" style="padding:36px 48px 40px 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td class="sans" style="color:#3B3752; font-size:14px; line-height:24px;">
                  Thank you for considering our invitation. We would be honored to welcome you to the Women in Tech Leadership Summit 2027.
                  <br><br>
                  Warm regards,<br>
                  <strong style="color:#1E1544;">Signature Global Conferences Team</strong>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOLLOW / CONTACT BAR -->
        <tr>
          <td style="background-color:#F7F5F1; padding:24px 48px; border-top:1px solid #EFEBE1;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td class="stack sans" style="color:#1E1544; font-size:11px; letter-spacing:1px; text-transform:uppercase; font-weight:bold; padding-bottom:6px;">
                  Follow Us
                </td>
                <td class="stack" align="right" style="padding-bottom:6px;">&nbsp;</td>
              </tr>
              <tr>
                <td class="stack sans" style="font-size:12px; padding-top:2px;">
                  <a href="https://www.linkedin.com/company/signature-global-conferences" target="_blank" style="color:#1E1544; font-weight:bold;">LinkedIn</a>
                  <span style="color:#D4AF6A;">&nbsp;•&nbsp;</span>
                  <a href="https://www.signatureglobalconferences.com" target="_blank" style="color:#1E1544; font-weight:bold;">Website</a>
                </td>
                <td class="stack" align="right" style="font-size:12px; padding-top:2px;">
                  <span class="sans" style="color:#5C5878;">events@signatureglobalconferences.com</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="background-color:#1E1544; padding:22px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" class="sans" style="color:#8B87A0; font-size:11px; line-height:18px;">
                  © 2027 Signature Global Conferences. All rights reserved.<br>
                  This email was sent to <a href="#" style="color:#B7B2CC;">{{ email }}</a>.
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
"""

t = EmailTemplate.objects.get(id=2)
t.html_content = original_html
t.save()
print('Template structure fully restored and updated successfully.')
