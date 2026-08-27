import re

with open("backend/templates/NEXT/next_invite_1.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. URLs & Titles
html = html.replace("https://pzalalbpxlwtcnmkaegb.supabase.co/storage/v1/object/public/wynxtaks_email_template/voicebanner/voicetalks_2.png", "https://pzalalbpxlwtcnmkaegb.supabase.co/storage/v1/object/public/wynxtaks_email_template/nextbanners/nextbanner.png")
html = html.replace("https://pzalalbpxlwtcnmkaegb.supabase.co/storage/v1/object/public/wynxtaks_email_template/voicebanner/voicebanner.png", "https://pzalalbpxlwtcnmkaegb.supabase.co/storage/v1/object/public/wynxtaks_email_template/nextbanners/nextbanner.png")
html = html.replace("https://calendly.com/voicetalks", "https://calendly.com/nextpremierconferences/30min")
html = html.replace("<title>Speaker Opportunity VOICETalks</title>", "<title>Speaker Invitation NEXT Premier League Conferences</title>")

# 2. Hidden Preheader
preheader_old = """    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
        You're invited as a Global Speaker for the VOICE Global Summit on Women Empowerment and Social Transformation —
        Paris, March 08–10, 2027.
    </div>"""
preheader_new = """    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
        You're invited as a Speaker at the Women Sustainability & Leadership Congress — Paris, France, March 08–10, 2027.
    </div>"""
html = html.replace(preheader_old, preheader_new)

# 3. Top Bar
html = html.replace("VOICE Talks\n                                    </td>", "NEXT Premier League Conferences\n                                    </td>")
html = html.replace("Global Conclaves &nbsp;•&nbsp; Speaker Hub", "Global Congress &nbsp;•&nbsp; Women Leadership")

# 4. Hero
html = html.replace("VOICE Global Summit on<br>Women Empowerment &amp;<br>Social\n                                        Transformation&nbsp;<span class=\"hero-highlight\"\n                                            style=\"color:#000000;\">2027</span>", "Women Sustainability<br>&amp; Leadership Congress&nbsp;<span\n                                            class=\"hero-highlight\" style=\"color:#000000;\">2027</span>")
html = html.replace("Powerful Ideas, Meaningful Impact", "NEXT PLC &nbsp;|&nbsp; Paris, France")

# 5. Body Text
body_orig = """<strong>VOICE Talks 2027</strong> is delighted to invite you as a
                                        <strong>Global Speaker</strong> for the <strong>Speaker Hub</strong> — an
                                        international platform bringing together inspiring leaders, innovators,
                                        entrepreneurs, wellness experts, psychologists, coaches, executives, and
                                        changemakers from around the world to share powerful ideas and meaningful
                                        impact."""
body_new = """<strong>NEXT Premier League Conferences</strong> is delighted to invite you as a
                                        <strong>Global Speaker</strong> for the <strong>Women Sustainability & Leadership Congress</strong> — an
                                        international platform bringing together inspiring leaders, innovators,
                                        entrepreneurs, wellness experts, psychologists, coaches, executives, and
                                        changemakers from around the world to share powerful ideas and meaningful
                                        impact."""
html = html.replace(body_orig, body_new)

# 6. Event Details
# The VoiceTalks template already says: March 08–10, 2027 and Paris, France (Hybrid).
# I'll change the venue slightly to match NEXT exactly.
html = html.replace("Paris, France (Hybrid)", "Paris, France")

# 7. Quote Block
# In next_invite_1.html, the quote was: "Women Leading the Future of Sustainable Development"
html = html.replace("\"Great leadership isn't about having all the answers — it's about creating space for others to lead.\"", "\"Women Leading the Future of Sustainable Development\"")

# 8. Sign Off
sign_orig = """Thank you for considering our invitation. We would be honored to welcome you to
                                        the VOICE Talks stage in Paris.
                                        <br><br>
                                        Thanks &amp; Regards,<br>
                                        <strong style="color:#2B0F22;">VOICE Talks</strong><br>
                                        +1 202 571 5721"""
sign_new = """Thank you for considering our invitation. We would be honored to welcome you to
                                        the NEXT Premier League Conferences stage in Paris.
                                        <br><br>
                                        Thanks &amp; Regards,<br>
                                        <strong style="color:#2B0F22;">NEXT Premier League Conferences</strong><br>
                                        info@nextconferences.org"""
html = html.replace(sign_orig, sign_new)

# 9. Footer Social Icons
footer_orig = """<td style="padding: 0 10px;">
                                                    <a href="https://www.youtube.com/@VoiceTalksConferences"
                                                        target="_blank">
                                                        <img src="https://img.icons8.com/ios-filled/50/ffffff/youtube-play.png"
                                                            alt="YouTube" width="24" height="24"
                                                            style="display:block; border:0;">
                                                    </a>
                                                </td>
                                                <td style="padding: 0 10px;">
                                                    <a href="https://x.com/Voice__Talks" target="_blank">
                                                        <img src="https://img.icons8.com/ios-filled/50/ffffff/twitterx.png"
                                                            alt="X" width="24" height="24"
                                                            style="display:block; border:0;">
                                                    </a>
                                                </td>
                                                <td style="padding: 0 10px;">
                                                    <a href="https://www.instagram.com/voice_talks/" target="_blank">
                                                        <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png"
                                                            alt="Instagram" width="24" height="24"
                                                            style="display:block; border:0;">
                                                    </a>
                                                </td>
                                                <td style="padding: 0 10px;">
                                                    <a href="https://www.linkedin.com/company/voicetalks"
                                                        target="_blank">
                                                        <img src="https://img.icons8.com/ios-filled/50/ffffff/linkedin.png"
                                                            alt="LinkedIn" width="24" height="24"
                                                            style="display:block; border:0;">
                                                    </a>
                                                </td>
                                                <td style="padding: 0 10px;">
                                                    <a href="https://www.facebook.com/profile.php?id=61574704715462"
                                                        target="_blank">
                                                        <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png"
                                                            alt="Facebook" width="24" height="24"
                                                            style="display:block; border:0;">
                                                    </a>
                                                </td>
                                                <td style="padding: 0 10px;">
                                                    <a href="https://www.voicetalks.org/conference/west-2027"
                                                        target="_blank">
                                                        <img src="https://img.icons8.com/ios-filled/50/ffffff/domain.png"
                                                            alt="Website" width="24" height="24"
                                                            style="display:block; border:0;">
                                                    </a>
                                                </td>"""

footer_new = """<td class="stack sans" style="color:#D98FB6; font-size:12px; font-weight:bold;">
                                                    <a href="https://www.linkedin.com/company/next-premier-conferences/" target="_blank" style="color:#F3EFE6;">LinkedIn</a>
                                                    &nbsp;•&nbsp;
                                                    <a href="https://www.nextconferences.org/conference/nplc_wplc" target="_blank" style="color:#F3EFE6;">Visit Us</a>
                                                </td>"""
html = html.replace(footer_orig, footer_new)

# 10. Copyright
html = html.replace("© 2027 VOICE Talks. All rights reserved.", "&copy; 2027 NEXT Premier League Conferences. All rights reserved.")

with open("backend/templates/NEXT/next_invite_1.html", "w", encoding="utf-8") as f:
    f.write(html)
