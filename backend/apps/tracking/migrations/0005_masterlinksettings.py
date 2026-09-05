import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tracking', '0004_campaignrecipientstatus_clicked_links_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='MasterLinkSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('is_active', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
