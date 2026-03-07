const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type SupabaseResponse<T = unknown> = {
  data: T | null;
  error: { message: string } | null;
};

const baseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function request<T = unknown>(
  path: string,
  init: RequestInit,
): Promise<SupabaseResponse<T>> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { data: null, error: { message: 'Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).' } };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: {
        ...baseHeaders,
        ...init.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return { data: null, error: { message: text || `Erro HTTP ${response.status}` } };
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Erro desconhecido' } };
  }
}

export const supabase = {
  from(table: string) {
    return {
      insert(payload: unknown) {
        return request(table, {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });
      },
      update(payload: unknown) {
        return {
          eq(column: string, value: string | number | boolean) {
            return request(`${table}?${column}=eq.${encodeURIComponent(String(value))}`, {
              method: 'PATCH',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify(payload),
            });
          },
        };
      },
    };
  },
};
