from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tracking', '0004_campaignrecipientstatus_clicked_links_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='masterlinksettings',
            name='password',
            field=models.CharField(blank=True, default='', max_length=128),
        ),
    ]
