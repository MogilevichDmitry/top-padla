import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "admin_session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

export function createAdminToken(): string {
  // Simple HMAC-signed token for role=admin
  const payload = "role=admin";
  const hmac = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload};sig=${hmac}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sigPart] = token.split(";sig=");
  if (!payload || !sigPart) return false;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigPart));
}

export function setAdminCookie(res: NextResponse): void {
  const token = createAdminToken();
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearAdminCookie(res: NextResponse): void {
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  });
}

export function isAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (verifyAdminToken(token)) return true;
  // Optional header-based token for scripts
  const apiToken = req.headers.get("x-admin-token");
  if (
    apiToken &&
    process.env.ADMIN_API_TOKEN &&
    apiToken === process.env.ADMIN_API_TOKEN
  ) {
    return true;
  }
  return false;
}
