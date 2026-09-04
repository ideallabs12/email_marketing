import os
import subprocess
import sys
from pathlib import Path
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Loads all email templates by running all seed_*.py scripts in the backend directory'

    def handle(self, *args, **options):
        # backend/apps/templates/management/commands/load_templates.py -> backend/
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
        self.stdout.write(f"Scanning for seed scripts in {backend_dir}...")
        
        seed_scripts = list(backend_dir.rglob('seed_*.py'))
        
        if not seed_scripts:
            self.stdout.write(self.style.WARNING("No seed scripts found."))
            return
            
        success_count = 0
        error_count = 0
            
        for script_path in seed_scripts:
            # We skip venv or other virtual environments just in case
            if 'venv' in script_path.parts or '.venv' in script_path.parts or '.git' in script_path.parts:
                continue
                
            self.stdout.write(f"Running {script_path.name}...")
            
            try:
                # Run the script using the current python executable
                result = subprocess.run(
                    [sys.executable, str(script_path)],
                    capture_output=True,
                    text=True,
                    check=True
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully loaded {script_path.name}"))
                if result.stdout:
                    self.stdout.write(result.stdout)
                success_count += 1
            except subprocess.CalledProcessError as e:
                self.stdout.write(self.style.ERROR(f"Error running {script_path.name}:"))
                self.stdout.write(e.stdout)
                self.stdout.write(self.style.ERROR(e.stderr))
                error_count += 1
                
        self.stdout.write(self.style.SUCCESS(f"\nFinished loading templates. {success_count} succeeded, {error_count} failed."))
