from django.db import migrations


class Migration(migrations.Migration):
    """
    Merge migration to resolve conflict between:
    - 0005_masterlinksettings (generated on server)
    - 0005_masterlinksettings_password (created locally)
    Both add the password field to MasterLinkSettings.
    """

    dependencies = [
        ('tracking', '0005_masterlinksettings'),
        ('tracking', '0005_masterlinksettings_password'),
    ]

    operations = [
    ]
