# Generated manually
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('campaigns', '0003_alter_campaign_from_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='campaign',
            name='share_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
