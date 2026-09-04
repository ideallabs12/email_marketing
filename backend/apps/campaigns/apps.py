from django.apps import AppConfig


class CampaignsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.campaigns'

    def ready(self):
        import sys
        if any(cmd in sys.argv for cmd in ['collectstatic', 'makemigrations', 'dumpdata']):
            return
        try:
            from django.core.management import call_command
            call_command('migrate', interactive=False)
        except Exception as e:
            print(f"[Auto-migrate] Notice: {e}")



