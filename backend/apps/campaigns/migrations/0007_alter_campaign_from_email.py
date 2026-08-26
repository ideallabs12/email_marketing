# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('campaigns', '0006_alter_campaign_from_email'),
    ]

    operations = [
        migrations.AlterField(
            model_name='campaign',
            name='from_email',
            field=models.CharField(choices=[('Signature Talks <global@signaturetalks.org>', 'Signature Talks (global@signaturetalks.org)'), ('WYNxTALKS <info@wynxtalks.com>', 'WYNx Talks (info@wynxtalks.com)'), ('VOICETALKS <info@voicetalks.org>', 'Voice Talks (info@voicetalks.org)'), ('ICON Conferences <contact@iconconferences.org>', 'ICON Conferences (contact@iconconferences.org)')], default='Signature Talks <global@signaturetalks.org>', max_length=100),
        ),
    ]
