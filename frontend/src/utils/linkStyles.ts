/**
 * Utility function to format and style clicked links with distinct colors.
 * Calendly -> Green
 * Unsubscribe -> Soft Amber/Orange
 * Other links -> Gray
 */
export function formatLinkName(linkText: string): string {
  const normalized = linkText.toLowerCase().trim();
  if (normalized === 'outreach' || normalized.includes('unsubscribe')) {
    return 'unsubscribe';
  }
  return linkText;
}

export function getLinkBadgeStyle(linkText: string): string {
  const normalized = linkText.toLowerCase().trim();

  // Calendly -> Green
  if (normalized.includes('calendly')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
  }

  // Unsubscribe / Outreach Unsubscribe Link -> Amber
  if (normalized.includes('unsubscribe') || normalized === 'outreach') {
    return 'bg-amber-100 text-amber-800 border-amber-300 font-medium';
  }

  // All other links -> Gray
  return 'bg-gray-100 text-gray-800 border-gray-300 font-medium';
}

