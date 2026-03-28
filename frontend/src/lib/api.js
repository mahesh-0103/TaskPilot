import { supabase } from './supabase';
import { CONFIG } from '../config';

/**
 * PRODUCTION-GRADE API WRAPPER
 * 
 * 1. Automatically injects user_id, email, and Google provider_token.
 * 2. Ensures fresh session via getSession() caller.
 * 3. Handles auto-retry on 401/token expiration.
 * 
 * @param {string} endpoint - Relative API path (e.g. '/extract-tasks')
 * @param {object} body - Request payload (will be augmented)
 */
export async function apiRequest(endpoint, body = {}) {
  const url = `${CONFIG.BACKEND_URL}${endpoint}`;
  
  // 1. Get latest session (auto-refreshes if needed)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error("SESSION_LOAD_FAILURE: No active session found.");
    throw new Error('AUTH_REQUIRED');
  }

  const { user, provider_token } = session;

  // 2. Augment body with necessary tokens/IDs
  const payload = {
    ...body,
    token: provider_token,
    user_id: user.id,
    email: user.email
  };

  console.log(`[API_REQ] ${endpoint}`, { user_id: user.id, has_token: !!provider_token });
  if (provider_token) console.log("TOKEN:", provider_token.slice(0, 10) + "...");

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider_token}`
      },
      body: JSON.stringify(payload)
    });

    // 3. Auto-Retry Logic on 401
    if (response.status === 401) {
      console.warn("UNAUTHORIZED: Attempting token refresh and retry...");
      
      // Force refresh session
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
      
      if (refreshedSession) {
        const retryPayload = {
          ...body,
          token: refreshedSession.provider_token,
          user_id: refreshedSession.user.id,
          email: refreshedSession.user.email
        };

        return await fetch(url, {
          method: 'POST',
          headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${refreshedSession.provider_token}`
          },
          body: JSON.stringify(retryPayload)
        });
      }
    }

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'API_RESPONSE_ERROR');
    }

    return await response.json();
  } catch (err) {
    console.error("API_FATAL_ERROR:", err.message);
    throw err;
  }
}
