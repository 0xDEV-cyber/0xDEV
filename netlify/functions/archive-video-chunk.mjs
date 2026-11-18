const MAX_CHUNK_BYTES = 3 * 1024 * 1024; // 3 MB raw -> ~4 MB base64 (safely under Netlify 6 MB limit)

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    ...extra,
  };
}

function isAllowedArchiveUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'archive.org' || host.endsWith('.archive.org');
  } catch {
    return false;
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ error: 'Method not allowed. Use GET.' }),
    };
  }

  const params = event.queryStringParameters || {};
  const targetUrl = typeof params.url === 'string' ? params.url.trim() : '';
  const mode = typeof params.mode === 'string' ? params.mode : 'chunk';

  if (!targetUrl || !isAllowedArchiveUrl(targetUrl)) {
    return {
      statusCode: 400,
      headers: corsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ error: 'Invalid or non-Internet Archive HTTPS video URL.' }),
    };
  }

  if (mode === 'head') {
    try {
      const probeRes = await fetch(targetUrl, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
      });

      if (!probeRes.ok && probeRes.status !== 206) {
        return {
          statusCode: probeRes.status,
          headers: corsHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ error: `Archive server returned HTTP ${probeRes.status}` }),
        };
      }

      const contentRange = probeRes.headers.get('content-range') || '';
      const rangeMatch = contentRange.match(/bytes\s+\d+-\d+\/(\d+)/i);
      const totalBytes = rangeMatch
        ? Number(rangeMatch[1])
        : Number(probeRes.headers.get('content-length') || 0);
      const contentType = probeRes.headers.get('content-type') || 'video/mp4';

      return {
        statusCode: 200,
        headers: corsHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ok: true,
          totalBytes: Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : null,
          contentType,
          supportsRange: probeRes.status === 206 || Boolean(rangeMatch),
        }),
      };
    } catch (err) {
      return {
        statusCode: 502,
        headers: corsHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          error: err instanceof Error ? err.message : 'Unable to reach Internet Archive.',
        }),
      };
    }
  }

  const start = Number(params.start);
  const rawEnd = Number(params.end);
  if (!Number.isInteger(start) || start < 0 || !Number.isInteger(rawEnd) || rawEnd < start) {
    return {
      statusCode: 400,
      headers: corsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ error: 'Invalid byte range parameters (start/end).' }),
    };
  }

  const end = Math.min(rawEnd, start + MAX_CHUNK_BYTES - 1);

  try {
    const chunkRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Range: `bytes=${start}-${end}`,
      },
    });

    if (!chunkRes.ok && chunkRes.status !== 206) {
      return {
        statusCode: chunkRes.status,
        headers: corsHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          error: `Upstream Internet Archive returned HTTP ${chunkRes.status}`,
        }),
      };
    }

    const arrayBuffer = await chunkRes.arrayBuffer();
    const contentType = chunkRes.headers.get('content-type') || 'video/mp4';
    const contentRange = chunkRes.headers.get('content-range') || '';

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: corsHeaders({
        'Content-Type': contentType,
        'X-Archive-Content-Range': contentRange,
      }),
      body: Buffer.from(arrayBuffer).toString('base64'),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        error: err instanceof Error ? err.message : 'Chunk download failed from Internet Archive.',
      }),
    };
  }
}
