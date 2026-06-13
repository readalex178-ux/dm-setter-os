-- Lock down sensitive OAuth token columns on connected_accounts.
-- The client only ever reads non-token columns and only updates is_active;
-- edge functions use the service_role key which bypasses these grants.

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.connected_accounts FROM authenticated;

-- Column-scoped SELECT: everything EXCEPT access_token, refresh_token, page_access_token
GRANT SELECT (
  id, platform, platform_user_id, platform_username, display_name,
  token_expires_at, page_id, is_active, last_synced_at, created_at, updated_at, user_id
) ON public.connected_accounts TO authenticated;

-- Client only toggles is_active (disconnect)
GRANT UPDATE (is_active) ON public.connected_accounts TO authenticated;

-- service_role keeps full access for edge functions
GRANT ALL ON public.connected_accounts TO service_role;