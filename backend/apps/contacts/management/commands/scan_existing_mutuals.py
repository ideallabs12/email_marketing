from django.core.management.base import BaseCommand
from apps.contacts.models import Contact, MutualContact


class Command(BaseCommand):
    help = "Scan existing contacts that belong to multiple lists, log them into MutualContact table, and optionally enforce 1-list-only"

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Enforce 1-contact-1-list: keep contact in earliest list and remove from secondary lists',
        )
        parser.add_argument(
            '--clear-first',
            action='store_true',
            help='Clear existing MutualContact table entries before scanning',
        )

    def handle(self, *args, **options):
        fix = options.get('fix', False)
        clear_first = options.get('clear_first', False)

        if clear_first:
            cleared_count, _ = MutualContact.objects.all().delete()
            self.stdout.write(f"Cleared {cleared_count} existing mutual records.")

        contacts_with_multiple_lists = []
        for contact in Contact.objects.prefetch_related('lists', 'batches').all():
            non_default = list(contact.lists.filter(is_default=False).order_by('id'))
            if len(non_default) > 1:
                contacts_with_multiple_lists.append((contact, non_default))

        total_found = len(contacts_with_multiple_lists)
        self.stdout.write(f"Found {total_found} contacts belonging to more than one list.")

        logged_count = 0
        fixed_count = 0

        for contact, non_default_lists in contacts_with_multiple_lists:
            primary_list = non_default_lists[0]
            duplicate_lists = non_default_lists[1:]

            for dup_list in duplicate_lists:
                # Check if this exact overlap was already logged
                exists = MutualContact.objects.filter(
                    email__iexact=contact.email,
                    target_list_name=dup_list.name,
                    already_exists_in=primary_list.name
                ).exists()

                if not exists:
                    MutualContact.objects.create(
                        first_name=contact.first_name,
                        last_name=contact.last_name,
                        email=contact.email,
                        who_is_importing='Historical Import',
                        target_list_name=dup_list.name,
                        already_exists_in=primary_list.name,
                        reason=f"Existing mutual: originally in '{primary_list.name}', duplicate in '{dup_list.name}'"
                    )
                    logged_count += 1

                self.stdout.write(
                    self.style.WARNING(
                        f"  [MUTUAL] {contact.email} | Original: '{primary_list.name}' | Duplicate: '{dup_list.name}'"
                    )
                )

                if fix:
                    contact.lists.remove(dup_list)
                    # Also detach any batches belonging to the duplicate list
                    dup_batches = contact.batches.filter(contact_list=dup_list)
                    if dup_batches.exists():
                        contact.batches.remove(*dup_batches)
                    fixed_count += 1

        self.stdout.write(self.style.SUCCESS(f"\nScan complete! Logged {logged_count} mutual entries."))
        if fix:
            self.stdout.write(self.style.SUCCESS(f"Enforced 1-list rule: removed {fixed_count} secondary list assignments."))
        else:
            self.stdout.write(self.style.NOTICE("Run with --fix to remove contacts from secondary lists and enforce 1 list per contact."))
