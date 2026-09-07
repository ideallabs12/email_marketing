/**
 * Utility function to style clicked links with distinct colors.
 * Calendly -> Green
 * YouTube -> Red
 * LinkedIn -> Sky Blue
 * X / Twitter -> Dark Slate
 * Facebook -> Indigo
 * Instagram -> Pink
 * VoiceTalks / WynxTalks -> Purple
 * Other links -> Deterministic color from palette
 */
export function getLinkBadgeStyle(linkText: string): string {
  const normalized = linkText.toLowerCase().trim();

  // Calendly -> Green (as specifically requested)
  if (normalized.includes('calendly')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
  }
  // Video / YouTube -> Red
  if (normalized.includes('youtube') || normalized.includes('youtu.be')) {
    return 'bg-red-100 text-red-800 border-red-300 font-medium';
  }
  // LinkedIn -> Sky Blue
  if (normalized.includes('linkedin')) {
    return 'bg-sky-100 text-sky-800 border-sky-300 font-medium';
  }
  // X / Twitter -> Dark Slate
  if (normalized === 'x' || normalized.includes('twitter')) {
    return 'bg-slate-200 text-slate-800 border-slate-300 font-medium';
  }
  // Facebook -> Indigo
  if (normalized.includes('facebook') || normalized.includes('fb.')) {
    return 'bg-indigo-100 text-indigo-800 border-indigo-300 font-medium';
  }
  // Instagram -> Pink
  if (normalized.includes('instagram')) {
    return 'bg-pink-100 text-pink-800 border-pink-300 font-medium';
  }
  // VoiceTalks / WynxTalks -> Purple
  if (normalized.includes('voicetalks') || normalized.includes('wynxtalks')) {
    return 'bg-purple-100 text-purple-800 border-purple-300 font-medium';
  }

  // Distinct color palette for any other links
  const palette = [
    'bg-amber-100 text-amber-800 border-amber-300',
    'bg-teal-100 text-teal-800 border-teal-300',
    'bg-cyan-100 text-cyan-800 border-cyan-300',
    'bg-orange-100 text-orange-800 border-orange-300',
    'bg-rose-100 text-rose-800 border-rose-300',
    'bg-blue-100 text-blue-800 border-blue-300',
    'bg-lime-100 text-lime-800 border-lime-300',
  ];

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) & 0xffffffff;
  }
  const index = Math.abs(hash) % palette.length;
  return `${palette[index]} font-medium`;
}
