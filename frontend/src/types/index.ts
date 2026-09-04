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
  created_at: string;
  updated_at: string;
}

export interface ContactBatch {
  id: number;
  name: string;
  contact_list: number;
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
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  from_email: string;
  scheduled_at: string | null;
  sent_at: string | null;
  share_token?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvanceCampaign {
  id: number;
  name: string;
  target_list: number;
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
  campaign: Pick<Campaign, 'id' | 'name' | 'status' | 'share_token'>;
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
