'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CampaignAnalyticsView from '../../../../../components/CampaignAnalyticsView';

export default function AdvanceCampaignSendAnalyticsPage({ params }: { params: Promise<{ id: string, sendId: string }> }) {
  const { id: advanceCampaignId, sendId: campaignId } = use(params);

  return (
    <div className="space-y-4">
      <Link href={`/advance-campaigns/${advanceCampaignId}`} className="inline-flex items-center gap-1 text-sm text-foreground/55 hover:text-foreground">
        <ArrowLeft size={16} /> Back to advanced campaign
      </Link>
      <CampaignAnalyticsView campaignId={campaignId} />
    </div>
  );
}
