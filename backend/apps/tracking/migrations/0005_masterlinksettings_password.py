from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tracking', '0005_masterlinksettings'),
    ]

    operations = [
        migrations.AddField(
            model_name='masterlinksettings',
            name='password',
            field=models.CharField(blank=True, default='', max_length=128),
        ),
    ]
