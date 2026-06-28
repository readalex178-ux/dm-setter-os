// Shared CORS helper: restricts Access-Control-Allow-Origin to known origins
// (the web app, the Chrome extension, and local dev) instead of a blanket "*".
const ALLOWED_ORIGINS = [
  "https://dm-wingman-pro.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

export function buildCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed =
    !!origin &&
    (ALLOWED_ORIGINS.includes(origin) || origin.startsWith("chrome-extension://"));

  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin as string) : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}
