/**
 * Startup environment validation.
 * Warns loudly (console) when required public env vars are missing so
 * misconfigured deployments are caught early instead of failing silently.
 */
const REQUIRED_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
] as const;

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => {
    const val = import.meta.env[key as keyof ImportMetaEnv];
    return !val || String(val).trim() === "";
  });

  if (missing.length > 0) {
    const msg =
      `[env] Missing required environment variables: ${missing.join(", ")}. ` +
      `Copy .env.example to .env and fill these in. The app may not connect to the backend.`;
    console.error(msg);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[env] Running in DEV with missing variables — backend calls will likely fail.");
    }
  }

  return missing.length === 0;
}
