/**
 * Utility function to style clicked links with distinct colors.
 * Calendly -> Green
 * Other links -> Gray
 */
export function getLinkBadgeStyle(linkText: string): string {
  const normalized = linkText.toLowerCase().trim();

  // Calendly -> Green
  if (normalized.includes('calendly')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
  }

  // All other links -> Gray
  return 'bg-gray-100 text-gray-800 border-gray-300 font-medium';
}
