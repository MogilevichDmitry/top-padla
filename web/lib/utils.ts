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

