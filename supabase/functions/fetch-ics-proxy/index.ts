import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Edge Function: fetch-ics-proxy
 *
 * Fetches external ICS calendar content, bypassing CORS restrictions.
 * This is more reliable than public CORS proxies.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Only allow http/https
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return new Response(
        JSON.stringify({ error: "Only HTTP/HTTPS URLs are allowed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Add cache buster to prevent caching
    const separator = url.includes("?") ? "&" : "?";
    const urlWithCacheBuster = `${url}${separator}_cb=${Date.now()}`;

    console.log(`[fetch-ics-proxy] Fetching: ${parsedUrl.hostname}`);

    // Fetch the ICS content
    const response = await fetch(urlWithCacheBuster, {
      headers: {
        "Accept": "text/calendar, text/plain, */*",
        "User-Agent": "AgirAgil-Calendar/1.0",
      },
    });

    if (!response.ok) {
      console.error(`[fetch-ics-proxy] HTTP error: ${response.status}`);
      return new Response(
        JSON.stringify({
          error: `Failed to fetch calendar: HTTP ${response.status}`,
          status: response.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const content = await response.text();

    // Validate ICS content
    if (!content.includes("BEGIN:VCALENDAR") && !content.includes("BEGIN:VEVENT")) {
      console.error("[fetch-ics-proxy] Invalid ICS content");
      return new Response(
        JSON.stringify({ error: "URL does not return valid ICS content" }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[fetch-ics-proxy] Success: ${content.length} bytes`);

    return new Response(
      JSON.stringify({ content }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[fetch-ics-proxy] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
