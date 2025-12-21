import { randomUUID } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

const DEVICE_ID_COOKIE = "device_id";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Check if device ID cookie exists
  if (!request.cookies.has(DEVICE_ID_COOKIE)) {
    // Generate new device ID
    const deviceId = randomUUID();

    // Set cookie with proper security settings
    response.cookies.set({
      name: DEVICE_ID_COOKIE,
      value: deviceId,
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

// Only run middleware on API routes and vote pages
export const config = {
  matcher: ["/api/:path*", "/vote/:path*"],
};
