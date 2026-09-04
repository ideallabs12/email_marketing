'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CampaignAnalyticsView from '../../../../components/CampaignAnalyticsView';

export default function CampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params);

  return (
    <div className="space-y-4">
      <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm text-foreground/55 hover:text-foreground">
        <ArrowLeft size={16} /> Back to campaigns
      </Link>
      <CampaignAnalyticsView campaignId={campaignId} />
    </div>
  );
}
