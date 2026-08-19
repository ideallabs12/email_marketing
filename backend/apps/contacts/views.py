from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
import csv
import io
from .models import Contact, ContactList
from .serializers import ContactSerializer, ContactListSerializer
from django.db.models import ProtectedError

class ContactListViewSet(viewsets.ModelViewSet):
    queryset = ContactList.objects.all().order_by('-created_at')
    serializer_class = ContactListSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_default:
            return Response({'error': 'Cannot delete the default master list.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({'error': 'Cannot delete this list because it is currently linked to one or more campaigns.'}, status=status.HTTP_400_BAD_REQUEST)

class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all().order_by('-created_at')
    serializer_class = ContactSerializer

    def perform_create(self, serializer):
        contact = serializer.save()
        default_list, _ = ContactList.objects.get_or_create(
            is_default=True,
            defaults={'name': 'All Contacts', 'description': 'Master list containing all contacts'}
        )
        contact.lists.add(default_list)

    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        file_obj = request.FILES.get('file')
        list_id = request.data.get('list_id')

        if not file_obj:
            return Response({'error': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            file_data = file_obj.read().decode('utf-8')
            csv_file = io.StringIO(file_data)
            reader = csv.reader(csv_file)
            
            headers = next(reader, None)
            if not headers:
                return Response({'error': 'CSV file is empty.'}, status=status.HTTP_400_BAD_REQUEST)

            headers = [h.strip().lower() for h in headers]
            required_headers = {'first_name', 'last_name', 'email'}
            
            if not required_headers.issubset(set(headers)):
                return Response({
                    'error': f"Invalid CSV format. Missing required columns. Found: {', '.join(headers)}. Expected at least: first_name, last_name, email"
                }, status=status.HTTP_400_BAD_REQUEST)

            target_list = None
            if list_id:
                try:
                    target_list = ContactList.objects.get(id=list_id)
                except ContactList.DoesNotExist:
                    return Response({'error': f"Target list with ID {list_id} not found."}, status=status.HTTP_400_BAD_REQUEST)

            default_list, _ = ContactList.objects.get_or_create(
                is_default=True,
                defaults={'name': 'All Contacts', 'description': 'Master list containing all contacts'}
            )

            success_count = 0
            skipped_count = 0
            skipped_emails = []

            for row_idx, row in enumerate(reader, start=2):
                if not row:
                    continue
                row_data = dict(zip(headers, row))
                
                email = row_data.get('email', '').strip()
                if not email or '@' not in email:
                    skipped_count += 1
                    skipped_emails.append(f"Row {row_idx}: {email or '(empty)'}")
                    continue

                first_name = row_data.get('first_name', '').strip()
                last_name = row_data.get('last_name', '').strip()
                
                is_subscribed_str = row_data.get('is_subscribed', 'true').strip().lower()
                is_subscribed = is_subscribed_str in ['true', '1', 'yes', 'y']

                contact, created = Contact.objects.update_or_create(
                    email=email,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'is_subscribed': is_subscribed
                    }
                )

                if target_list:
                    contact.lists.add(target_list)
                contact.lists.add(default_list)

                success_count += 1

            return Response({
                'message': f"Import completed. {success_count} contacts imported/updated, {skipped_count} skipped.",
                'success_count': success_count,
                'skipped_count': skipped_count,
                'skipped_details': skipped_emails
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': f"Failed to parse CSV: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


