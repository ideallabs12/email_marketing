with open("backend/templates/ICON/icon_invite_01.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Colors
html = html.replace("#2B0F22", "#0B2942")
html = html.replace("#D61F69", "#1479B3")
html = html.replace("#D98FB6", "#7FC1E3")
html = html.replace("#EBD9E4", "#D9E6EE")
html = html.replace("#A8134F", "#0E6BA8")
html = html.replace("#3B3752", "#3A4652")
html = html.replace("#F3EAF0", "#EAF1F5")
html = html.replace("#17181c", "#14181c")
html = html.replace("#e7e7ea", "#e7eaea")
html = html.replace("#1f2025", "#1f2528")
html = html.replace("#2a2b30", "#2a3033")
html = html.replace("#33343a", "#2f3a40")


# 2. URLs & Titles
html = html.replace("https://pzalalbpxlwtcnmkaegb.supabase.co/storage/v1/object/public/wynxtaks_email_template/voicebanner/voicetalks_2.png", "https://pzalalbpxlwtcnmkaegb.supabase.co/storage/v1/object/public/wynxtaks_email_template/iconbanners/icon_banner_2.png")
html = html.replace("https://pzalalbpxlwtcnmkaegb.supabase.co/storage/v1/object/public/wynxtaks_email_template/voicebanner/voicebanner.png", "https://pzalalbpxlwtcnmkaegb.supabase.co/storage/v1/object/public/wynxtaks_email_template/iconbanners/icon_banner_2.png")
html = html.replace("https://calendly.com/voicetalks", "https://calendly.com/iconglobalc")
html = html.replace("<title>Speaker Opportunity VOICETalks</title>", "<title>ICON Global Conferences — Speaker Invitation</title>")

# 3. Hidden Preheader
preheader_old = """    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
        You're invited as a Global Speaker for the VOICE Global Summit on Women Empowerment and Social Transformation —
        Paris, March 08–10, 2027.
    </div>"""
preheader_new = """    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
        You're invited to speak at the 13th International Summit on Women's Leadership Excellence —
        Dubai, UAE, November 25–27, 2026.
    </div>"""
html = html.replace(preheader_old, preheader_new)

# 4. Top Bar
html = html.replace("VOICE Talks\n                                    </td>", "ICON Global Conferences\n                                    </td>")
html = html.replace("Global Conclaves &nbsp;•&nbsp; Speaker Hub", "Global Summits &nbsp;•&nbsp; Women Leadership")

# 5. Hero
html = html.replace("VOICE Global Summit on<br>Women Empowerment &amp;<br>Social\n                                        Transformation&nbsp;<span class=\"hero-highlight\"\n                                            style=\"color:#000000;\">2027</span>", "13th International Summit on<br>Women's Leadership Excellence&nbsp;<span\n                                            class=\"hero-highlight\" style=\"color:#000000;\">2026</span>")
html = html.replace("Powerful Ideas, Meaningful Impact", "")

# 6. Body Text
body_orig = """<strong>VOICE Talks 2027</strong> is delighted to invite you as a
                                        <strong>Global Speaker</strong> for the <strong>Speaker Hub</strong> — an
                                        international platform bringing together inspiring leaders, innovators,
                                        entrepreneurs, wellness experts, psychologists, coaches, executives, and
                                        changemakers from around the world to share powerful ideas and meaningful
                                        impact.
                                    </td>
                                </tr>
                                <tr>
                                    <td class="sans"
                                        style="color:#3A4652; font-size:14px; line-height:22px; padding-bottom:8px;">
                                        The conference will be conducted in <strong>Hybrid Mode</strong>, and we
                                        would be honored to have you share your story on our stage."""
body_new = """We're reaching out from <strong>ICON Global Conferences</strong> to invite you as a distinguished speaker at the <strong>13th International Summit on Women's Leadership Excellence</strong> — a gathering of global leaders and professionals shaping the future of leadership.
                                    </td>
                                </tr>
                                <tr>
                                    <td class="sans"
                                        style="color:#3A4652; font-size:14px; line-height:22px; padding-bottom:8px;">
                                        Your expertise and leadership stood out to us, and we believe your perspective would be genuinely valuable to the attendees joining us this year. We'd be honored to have you share your insights on our stage."""
html = html.replace(body_orig, body_new)

# 7. Event Details
html = html.replace("March 08–10, 2027", "November 25–27, 2026")
html = html.replace("Paris, France (Hybrid)", "Dubai, UAE")

# 8. Sign Off
sign_orig = """Thank you for considering our invitation. We would be honored to welcome you to
                                        the VOICE Talks stage in Paris.
                                        <br><br>
                                        Thanks &amp; Regards,<br>
                                        <strong style="color:#0B2942;">VOICE Talks</strong><br>
                                        +1 202 571 5721"""
sign_new = """We look forward to welcoming you and to the possibility of including your
                                        perspective in this summit.
                                        <br><br>
                                        Warm regards,<br>
                                        <strong style="color:#0B2942;">ICON Global Conferences</strong><br>
                                        contact@iconconferences.org &nbsp;|&nbsp; +1 (716) 217-1471"""
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

footer_new = """<td class="stack sans" style="color:#8FB4CC; font-size:12px; font-weight:bold;">
                                                    <a href="https://www.linkedin.com/company/icon-global-conferences/" target="_blank" style="color:#7FC1E3;">LinkedIn</a>
                                                    &nbsp;•&nbsp;
                                                    <a href="https://www.iconconferences.org" target="_blank" style="color:#7FC1E3;">Visit Us</a>
                                                </td>"""
html = html.replace(footer_orig, footer_new)

# 10. Copyright
html = html.replace("© 2027 VOICE Talks. All rights reserved.", "&copy; 2026 ICON Global Conferences. All rights reserved.")
html = html.replace("style=\"color:#7FC1E3;\">{{ email }}</a>.", "style=\"color:#7FC1E3;\">{{ email }}</a>.")
html = html.replace("style=\"color:#7FC1E3;\">Unsubscribe</a>", "style=\"color:#7FC1E3;\">Unsubscribe</a>")

with open("backend/templates/ICON/icon_invite_01.html", "w", encoding="utf-8") as f:
    f.write(html)
