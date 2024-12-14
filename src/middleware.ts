import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_COOKIE = "device_id";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Check if device ID cookie exists
  if (!request.cookies.has(DEVICE_ID_COOKIE)) {
    // Generate new device ID
    const deviceId = uuidv4();

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
