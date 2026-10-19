import { auth, CLIENT_IP_HEADER } from "@/server/auth/auth";
import { getClientIp } from "@/server/http/rate-limit";

export const runtime = "nodejs";

/**
 * Pass the request to better-auth with the trusted client IP stamped into
 * CLIENT_IP_HEADER (overwriting anything the client sent). better-auth uses
 * it for its rate limiter and for session.ip_address.
 */
function withTrustedIp(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set(CLIENT_IP_HEADER, getClientIp(request));
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return new Request(request.url, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // Required by undici when streaming a request body.
    ...(hasBody ? { duplex: "half" } : {}),
    signal: request.signal,
  } as RequestInit);
}

export async function GET(request: Request) {
  return auth.handler(withTrustedIp(request));
}

export async function POST(request: Request) {
  return auth.handler(withTrustedIp(request));
}
