/**
 * Convert player name to URL-friendly slug
 * Example: "Andrei" -> "andrei", "Alex Ilya" -> "alex-ilya"
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, ""); // Remove special characters
}

/**
 * Convert slug back to name (for display)
 * Note: This is approximate - we'll need to match against actual player names
 */
export function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Get badge classes (text, background, border) for win rate display
 * @param winRate - Win rate percentage (0-100)
 * @returns String with all badge classes
 */
export function getWinRateBadgeClasses(winRate: number): string {
  if (winRate >= 60)
    return "text-green-900 bg-green-50 border border-green-200";
  if (winRate >= 50)
    return "text-green-700 bg-green-50 border border-green-200";
  if (winRate >= 40)
    return "text-orange-800 bg-orange-50 border border-orange-200";
  return "text-red-800 bg-red-50 border border-red-200";
}
