from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
import csv
import io
from .models import Contact, ContactList, IgnoredContact, ContactBatch
from .serializers import ContactSerializer, ContactListSerializer, IgnoredContactSerializer, ContactBatchSerializer
from django.db.models import ProtectedError, Count, Q

class ContactListViewSet(viewsets.ModelViewSet):
    serializer_class = ContactListSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return ContactList.objects.annotate(
            contacts_count=Count('contacts', distinct=True)
        ).order_by('-created_at')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_default:
            return Response({'error': 'Cannot delete the default master list.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({'error': 'Cannot delete this list because it is currently linked to one or more campaigns.'}, status=status.HTTP_400_BAD_REQUEST)

class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['email', 'first_name', 'last_name', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Contact.objects.prefetch_related('lists', 'batches')

        # Filter by list if provided
        list_param = self.request.query_params.get('lists') or self.request.query_params.get('list_id')
        if list_param and list_param != 'all':
            try:
                qs = qs.filter(lists__id=int(list_param))
            except (ValueError, TypeError):
                pass

        # Filter by batch if provided
        batch_param = self.request.query_params.get('batches') or self.request.query_params.get('batch_id')
        if batch_param and batch_param != 'all':
            try:
                qs = qs.filter(batches__id=int(batch_param))
            except (ValueError, TypeError):
                pass

        # Fast server-side search across email, first_name, last_name, or multi-word tokens
        search = self.request.query_params.get('search', '').strip()
        if search:
            tokens = search.split()
            search_query = Q()
            for token in tokens:
                search_query &= (
                    Q(email__icontains=token) |
                    Q(first_name__icontains=token) |
                    Q(last_name__icontains=token)
                )
            qs = qs.filter(search_query)

        return qs.order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        total_contacts = Contact.objects.count()
        subscribed_contacts = Contact.objects.filter(is_subscribed=True).count()
        return Response({
            'total_contacts': total_contacts,
            'subscribed_contacts': subscribed_contacts,
        })

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
        batch_name = request.data.get('batch_name', '').strip()

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
            batch = None
            if list_id:
                try:
                    target_list = ContactList.objects.get(id=list_id)
                    if batch_name:
                        batch, _ = ContactBatch.objects.get_or_create(
                            name=batch_name,
                            contact_list=target_list
                        )
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
                first_name = row_data.get('first_name', '').strip()
                last_name = row_data.get('last_name', '').strip()

                if not email or '@' not in email:
                    skipped_count += 1
                    reason = 'Missing or invalid email format'
                    skipped_emails.append(f"Row {row_idx}: {email or '(empty)'}")
                    IgnoredContact.objects.create(
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        reason=f"Row {row_idx}: {reason}"
                    )
                    continue
                
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
                if batch:
                    contact.batches.add(batch)
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

class IgnoredContactViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = IgnoredContact.objects.all().order_by('-imported_at')
    serializer_class = IgnoredContactSerializer

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        from django.http import HttpResponse
        
        queryset = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="ignored_contacts.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['first_name', 'last_name', 'email', 'reason', 'imported_at'])
        
        for contact in queryset:
            writer.writerow([
                contact.first_name,
                contact.last_name,
                contact.email,
                contact.reason,
                contact.imported_at.strftime('%Y-%m-%d %H:%M:%S') if contact.imported_at else ''
            ])
            
        return response

    @action(detail=False, methods=['delete'], url_path='clear-all')
    def clear_all(self, request):
        count, _ = IgnoredContact.objects.all().delete()
        return Response({'message': f'Successfully cleared {count} ignored contacts.'}, status=status.HTTP_200_OK)

class ContactBatchViewSet(viewsets.ModelViewSet):
    serializer_class = ContactBatchSerializer

    def get_queryset(self):
        qs = ContactBatch.objects.annotate(
            contacts_count=Count('contacts', distinct=True)
        ).order_by('-created_at')
        list_id = self.request.query_params.get('contact_list')
        if list_id:
            qs = qs.filter(contact_list_id=list_id)
        return qs
