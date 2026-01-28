/**
 * Hardcover API Proxy
 *
 * This Edge Function proxies requests to the Hardcover API to avoid CORS issues
 * in web deployments.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const HARDCOVER_API_URL = 'https://hardcover.app/api/v1';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Get the Hardcover API token from environment variables
    const HARDCOVER_TOKEN = Deno.env.get('HARDCOVER_API_TOKEN');

    if (!HARDCOVER_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Hardcover API token not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Parse the request
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/graphql';
    const body = req.method === 'POST' ? await req.text() : null;

    // Forward the request to Hardcover API
    const hardcoverUrl = `${HARDCOVER_API_URL}${path}`;

    const response = await fetch(hardcoverUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HARDCOVER_TOKEN}`,
      },
      body: body,
    });

    // Get the response from Hardcover
    const data = await response.text();

    // Return the response with CORS headers
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Hardcover proxy error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to proxy request to Hardcover API',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
