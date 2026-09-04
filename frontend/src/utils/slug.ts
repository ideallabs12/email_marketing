export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCampaignUrl(campaign: { name?: string | null; slug?: string | null; share_token?: string | null; id?: number | string | null }): string {
  const identifier = campaign.slug || (campaign.name ? slugify(campaign.name) : '') || campaign.share_token || (campaign.id ? String(campaign.id) : '');
  return `/public/campaign/${identifier}`;
}
