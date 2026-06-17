import { supabase } from '../lib/supabase';

export { supabase };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function callEdgeFunction(path: string, options?: {
  method?: string;
  body?: unknown;
}): Promise<Response> {
  const url = `${SUPABASE_URL}/functions/v1/mastering-proxy${path}`;
  const fetchOptions: RequestInit = {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  };

  if (options?.body && (options.method === 'POST' || options.method === 'PUT')) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }
  return response;
}
