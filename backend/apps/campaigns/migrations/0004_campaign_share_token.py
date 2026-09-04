# Generated manually
import uuid
from django.db import migrations, models


def gen_uuid(apps, schema_editor):
    MyModel = apps.get_model('campaigns', 'Campaign')
    for row in MyModel.objects.all():
        row.share_token = uuid.uuid4()
        row.save(update_fields=['share_token'])

class Migration(migrations.Migration):

    dependencies = [
        ('campaigns', '0003_alter_campaign_from_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='campaign',
            name='share_token',
            field=models.UUIDField(default=uuid.uuid4, null=True),
        ),
        migrations.RunPython(gen_uuid, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name='campaign',
            name='share_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
