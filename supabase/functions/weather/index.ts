import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const WEATHERAPI_KEY = Deno.env.get('WEATHERAPI_KEY');
    if (!WEATHERAPI_KEY) {
      throw new Error('WEATHERAPI_KEY is not configured');
    }

    const { lat, lon } = await req.json();
    if (!lat || !lon) {
      throw new Error('lat and lon are required');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    let response;
    try {
      response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${lat},${lon}&lang=pt`,
        { signal: controller.signal }
      );
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof DOMException && e.name === 'AbortError') {
        return new Response(JSON.stringify({ error: 'Weather API timeout' }), {
          status: 408,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw e;
    }
    clearTimeout(timeout);

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Weather API unavailable' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    const result = {
      city: data.location?.name || '',
      region: data.location?.region || '',
      temp_c: data.current?.temp_c ?? null,
      condition: data.current?.condition?.text || '',
      icon: data.current?.condition?.icon || '',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Weather function error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
