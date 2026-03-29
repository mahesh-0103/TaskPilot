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
export async function apiRequest(endpoint, body = {}, method = 'POST') {
  const url = `${CONFIG.BACKEND_URL}${endpoint}`;
  
  // 1. Get latest session (auto-refreshes if needed)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    console.error("SESSION_LOAD_FAILURE: No active session found.");
    throw new Error('AUTH_REQUIRED');
  }
 
  const { user, provider_token } = session;

  // Restore cached token if Supabase didn't return one (common after page refresh)
  const cachedToken = localStorage.getItem('tp_provider_token');
  const effectiveToken = provider_token || cachedToken || null;
 
  // 2. Augment body with session context (token is optional for non-calendar ops)
  const payload = {
    ...body,
    token: effectiveToken,
    user_id: user.id,
    email: user.email
  };
 
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(effectiveToken && { 'Authorization': `Bearer ${effectiveToken}` })
      }
    };
 
    if (method !== 'GET' && method !== 'HEAD') {
      options.body = JSON.stringify(payload);
    }
 
    const response = await fetch(url, options);
 
    // 3. Auto-Retry Logic on 401
    if (response.status === 401) {
      console.warn("UNAUTHORIZED: Attempting token refresh and retry...");
      
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
      
      if (refreshedSession) {
        const retryPayload = {
          ...body,
          token: refreshedSession.provider_token,
          user_id: refreshedSession.user.id,
          email: refreshedSession.user.email
        };

        const retryOptions = {
          method: method,
          headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${refreshedSession.provider_token}`
          }
        };
        if (method !== 'GET') retryOptions.body = JSON.stringify(retryPayload);

        const retryResponse = await fetch(url, retryOptions);
        return await retryResponse.json();
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
