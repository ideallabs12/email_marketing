// Core types for the application will go here
export interface User {
  id: number;
  username: string;
  email: string;
}

export interface ContactList {
  id: number;
  name: string;
  description: string;
  is_default?: boolean;
  contacts_count?: number;
  tracking_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactBatch {
  id: number;
  name: string;
  contact_list: number;
  contacts_count?: number;
  tracking_id?: string;
  created_at: string;
}


export interface Contact {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_subscribed: boolean;
  lists: number[];
  batches: number[];
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  html_content: string;
  variables?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  template: number;
  target_list: number;
  target_batches?: number[];
  advance_campaign?: number | null;
  conference?: number | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  from_email: string;
  scheduled_at: string | null;
  sent_at: string | null;
  share_token?: string;
  tracking_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Conference {
  id: number;
  company_name: string;
  conference_name: string;
  date: string;
  venue: string;
  calendly_link?: string;
  website_link?: string;
  linkedin_link?: string;
  theme?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdvanceCampaign {
  id: number;
  name: string;
  target_list: number;
  share_token?: string;
  tracking_id?: string;
  campaigns?: Campaign[];
  created_at: string;
  updated_at: string;
}

export interface CampaignPerformance {
  id: number;
  campaign: number;
  total_sent: number;
  total_opens: number;
  total_clicks: number;
  total_bounces: number;
  total_delivered: number;
  total_failed: number;
  updated_at: string;
}

export interface CalendarCampaignPerformance {
  total_sent: number;
  total_opens: number;
  total_clicks: number;
  total_bounces: number;
  total_delivered: number;
  total_failed: number;
  total_unsubscribed?: number;
  open_rate: number;
  click_rate: number;
}

export interface CalendarCampaign {
  id: number;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  from_email: string;
  sent_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at?: string;
  primary_date: string;
  primary_time?: string;
  run_date_type?: 'sent' | 'scheduled' | 'created';
  tracking_id?: string;
  share_token?: string | null;
  is_advanced?: boolean;
  advance_campaign_id?: number | null;
  advance_campaign_name?: string | null;
  template_id?: number | null;
  template_name?: string | null;
  template_html?: string;
  template_body?: string;
  target_list_id?: number | null;
  target_list_name?: string | null;
  target_batches_name?: string | null;
  target_display?: string;
  company?: string;
  whose_campaign?: string;
  data_batch?: string;
  performance?: CalendarCampaignPerformance | null;
}

export type CampaignRecipientFilter = 'all' | 'delivered' | 'failed' | 'opened' | 'clicked' | 'sent' | 'pending' | 'unsubscribed' | 'complaint' | 'deferred' | 'hard_bounce' | 'soft_bounce' | 'invalid_email' | 'blocked' | 'error';

export interface CampaignRecipientStatus {
  id: number | null;
  contact_id: number;
  email: string;
  first_name: string;
  last_name: string;
  status: Exclude<CampaignRecipientFilter, 'all'>;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  last_event_at: string | null;
  error_message: string;
  clicked_links: string[];
  metadata: Record<string, string>;
}

export interface CampaignAnalytics {
  campaign: Pick<Campaign, 'id' | 'name' | 'status' | 'share_token' | 'tracking_id'>;
  summary: {
    total_recipients: number;
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    pending: number;
    unsubscribed: number;
    complaints: number;
    deferred: number;
    hard_bounces: number;
    soft_bounces: number;
    invalid: number;
    blocked: number;
    errors: number;
  };
  filter: CampaignRecipientFilter;
  recipients: CampaignRecipientStatus[];
}

export interface UnsubscribedContact {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  reason: string;
  source: 'body_link' | 'header_button' | 'manual' | 'webhook' | 'complaint';
  source_display?: string;
  campaign_name?: string;
  campaign_id?: number | null;
  user_agent?: string;
  ip_address?: string | null;
  unsubscribed_at: string;
}

export interface UnsubscribedSummary {
  total: number;
  body_link: number;
  header_button: number;
  manual: number;
  webhook: number;
  complaint: number;
}
