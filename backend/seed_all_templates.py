import os
import sys
import glob
import subprocess
from pathlib import Path

def main():
    backend_dir = Path(__file__).resolve().parent
    templates_dir = backend_dir / 'templates'

    if not templates_dir.exists():
        print(f"ERROR: Templates directory not found at {templates_dir}")
        sys.exit(1)

    # Find all python files starting with 'seed_' in the templates directory recursively
    search_pattern = str(templates_dir / '**' / 'seed_*.py')
    seed_scripts = glob.glob(search_pattern, recursive=True)

    if not seed_scripts:
        print("No seed scripts found.")
        sys.exit(0)

    print(f"Found {len(seed_scripts)} seed scripts. Executing...")
    
    success_count = 0
    failure_count = 0

    for script_path in seed_scripts:
        print(f"\n[{success_count + failure_count + 1}/{len(seed_scripts)}] Running: {Path(script_path).name}")
        print("-" * 50)
        
        try:
            # Run the script using the current python executable
            result = subprocess.run([sys.executable, script_path], check=True)
            success_count += 1
        except subprocess.CalledProcessError as e:
            print(f"ERROR: Failed to run {script_path}")
            failure_count += 1
            
    print("\n" + "=" * 50)
    print("Seeding Complete!")
    print(f"Success: {success_count} | Failed: {failure_count}")
    print("=" * 50)

if __name__ == '__main__':
    main()
