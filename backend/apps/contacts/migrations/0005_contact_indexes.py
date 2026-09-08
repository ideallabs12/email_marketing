# Generated for performance optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contacts', '0004_contactbatch_contact_batches'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contact',
            name='first_name',
            field=models.CharField(blank=True, db_index=True, max_length=255),
        ),
        migrations.AlterField(
            model_name='contact',
            name='last_name',
            field=models.CharField(blank=True, db_index=True, max_length=255),
        ),
        migrations.AlterField(
            model_name='contact',
            name='is_subscribed',
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AlterField(
            model_name='contact',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, db_index=True),
        ),
        migrations.AddIndex(
            model_name='contact',
            index=models.Index(fields=['first_name', 'last_name'], name='contacts_co_first_n_08bb97_idx'),
        ),
        migrations.AddIndex(
            model_name='contact',
            index=models.Index(fields=['-created_at'], name='contacts_co_created_466471_idx'),
        ),
    ]
