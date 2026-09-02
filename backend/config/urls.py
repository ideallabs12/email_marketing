"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token

from apps.contacts.views import ContactViewSet, ContactListViewSet, IgnoredContactViewSet
from apps.templates.views import EmailTemplateViewSet
from apps.campaigns.views import CampaignViewSet, SenderListView
from apps.tracking.views import CampaignPerformanceViewSet, CampaignAnalyticsViewSet, BrevoWebhookView, BouncedEmailViewSet, PublicCampaignAnalyticsView, MasterLinkSettingsView, PublicMasterLinkCampaignsView

router = DefaultRouter()
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'contact-lists', ContactListViewSet, basename='contactlist')
router.register(r'ignored-contacts', IgnoredContactViewSet, basename='ignoredcontact')
router.register(r'templates', EmailTemplateViewSet, basename='emailtemplate')
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'tracking', CampaignPerformanceViewSet, basename='campaignperformance')
router.register(r'campaign-analytics', CampaignAnalyticsViewSet, basename='campaignanalytics')
router.register(r'bounces', BouncedEmailViewSet, basename='bouncedemail')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(router.urls)),
    path('api/v1/auth/token/', obtain_auth_token, name='api_token_auth'),
    path('api/v1/senders/', SenderListView.as_view(), name='sender-list'),
    path('api/v1/webhooks/brevo/', BrevoWebhookView.as_view(), name='brevo-webhook'),
    path('api/v1/webhooks/brevo', BrevoWebhookView.as_view(), name='brevo-webhook-no-slash'),
    path('api/v1/public-analytics/<uuid:token>/', PublicCampaignAnalyticsView.as_view(), name='public-analytics'),
    path('api/v1/master-link/settings/', MasterLinkSettingsView.as_view(), name='master-link-settings'),
    path('api/v1/public/master-link/<uuid:token>/campaigns/', PublicMasterLinkCampaignsView.as_view(), name='public-master-link-campaigns'),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
]
