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

/**
 * Save game attendance info to cookies
 * @param gameId - Game ID
 * @param name - Player name
 * @param days - Cookie expiration in days (default: 7)
 */
export function saveGameAttendanceCookie(
  gameId: number,
  name: string,
  days: number = 7
): void {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  const cookieValue = JSON.stringify({ gameId, name });
  document.cookie = `game_attendance_${gameId}=${encodeURIComponent(
    cookieValue
  )}; expires=${expirationDate.toUTCString()}; path=/`;
}

/**
 * Get game attendance info from cookies
 * @param gameId - Game ID
 * @returns Object with gameId and name, or null if not found
 */
export function getGameAttendanceCookie(gameId: number): {
  gameId: number;
  name: string;
} | null {
  if (typeof document === "undefined") return null;

  const cookieName = `game_attendance_${gameId}`;
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === cookieName && value) {
      try {
        const decoded = JSON.parse(decodeURIComponent(value));
        if (decoded.gameId === gameId && decoded.name) {
          return decoded;
        }
      } catch (e) {
        // Invalid cookie, ignore
      }
    }
  }

  return null;
}

/**
 * Check if user can remove attendee (either admin or the attendee themselves)
 * @param gameId - Game ID
 * @param attendeeName - Name of the attendee to check
 * @param isAdmin - Whether current user is admin
 * @returns true if user can remove this attendee
 */
export function canRemoveAttendee(
  gameId: number,
  attendeeName: string,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;

  const attendance = getGameAttendanceCookie(gameId);
  if (!attendance) return false;

  // User can remove themselves if their name matches
  return attendance.name.toLowerCase() === attendeeName.toLowerCase();
}
