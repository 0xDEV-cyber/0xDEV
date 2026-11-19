/**
 * Netlify Function: External Movie Feed Aggregator & RSS/MRSS/PeerTube/Archive Parser
 * Server-side fetcher with no browser CORS limitations. Supports:
 * - Internet Archive RSS / Advanced Search / Collection / Uploader feeds
 * - Standard RSS 2.0 / Media RSS (<enclosure>, <media:content>) / Atom feeds
 * - PeerTube public JSON API (/api/v1/videos)
 */

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(payload),
  };
}

function decodeXmlEntities(str) {
  return String(str || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTagValue(block, tagName) {
  const escaped = tagName.replace(':', '\\:');
  const regex = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i');
  const match = block.match(regex);
  return match ? decodeXmlEntities(match[1]) : '';
}

function extractAttrValue(tagStr, attrName) {
  const regex = new RegExp(`${attrName}=["']([^"']+)["']`, 'i');
  const match = tagStr.match(regex);
  return match ? match[1].replace(/&amp;/gi, '&').trim() : '';
}

function isSafeHttpsUrl(raw) {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

function parseRssOrAtomItems(xmlText, sourceLabel, sourceUrl) {
  const results = [];
  const itemBlocks = xmlText.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];

  for (const block of itemBlocks.slice(0, 20)) {
    const title = extractTagValue(block, 'title');
    if (!title || title.length < 2) continue;

    // Look for direct MP4/WebM links in <enclosure>, <media:content>, or <link rel="enclosure">
    const enclosureTags =
      block.match(/<(?:enclosure|media:content|link)\b[^>]*>/gi) || [];
    let videoUrl = '';
    let fileSizeBytes = 0;

    for (const tag of enclosureTags) {
      const url = extractAttrValue(tag, 'url') || extractAttrValue(tag, 'href');
      const type = extractAttrValue(tag, 'type').toLowerCase();
      const lengthAttr = extractAttrValue(tag, 'length') || extractAttrValue(tag, 'fileSize');

      if (!url || !isSafeHttpsUrl(url)) continue;
      const lowerUrl = url.toLowerCase();
      if (
        lowerUrl.includes('.mp4') ||
        lowerUrl.includes('.webm') ||
        type.includes('video/mp4') ||
        type.includes('video/webm')
      ) {
        videoUrl = url;
        const parsedBytes = Number(lengthAttr);
        if (Number.isFinite(parsedBytes) && parsedBytes > 0) {
          fileSizeBytes = parsedBytes;
        }
        break;
      }
    }

    if (!videoUrl) continue;

    let posterUrl = '';
    const mediaThumbTags = block.match(/<(?:media:thumbnail|itunes:image|enclosure)\b[^>]*>/gi) || [];
    for (const tag of mediaThumbTags) {
      const candidate = extractAttrValue(tag, 'url') || extractAttrValue(tag, 'href');
      if (
        candidate &&
        isSafeHttpsUrl(candidate) &&
        /\.(jpg|jpeg|png|webp)(\?|$)/i.test(candidate)
      ) {
        posterUrl = candidate;
        break;
      }
    }

    const description =
      extractTagValue(block, 'media:description') ||
      extractTagValue(block, 'description') ||
      extractTagValue(block, 'summary') ||
      extractTagValue(block, 'content') ||
      `${title} discovered automatically from ${sourceLabel}.`;

    const pubDate =
      extractTagValue(block, 'pubDate') ||
      extractTagValue(block, 'published') ||
      extractTagValue(block, 'updated');
    const yearMatch = `${title} ${pubDate}`.match(/\b(202[0-9]|201[0-9]|19[0-9]{2})\b/);

    results.push({
      externalId: extractTagValue(block, 'guid') || extractTagValue(block, 'id') || videoUrl,
      title: title.slice(0, 140),
      synopsis: description.slice(0, 780),
      releaseYear: yearMatch?.[1] || '2026',
      posterUrl: posterUrl || '',
      videoUrl,
      fileSizeBytes,
      durationSeconds: 0,
      sourceLabel,
      sourceUrl,
    });
  }

  return results;
}

async function fetchSingleFeedSource(source) {
  const url = typeof source?.url === 'string' ? source.url.trim() : '';
  const label = typeof source?.label === 'string' && source.label.trim()
    ? source.label.trim()
    : 'External Feed';

  if (!isSafeHttpsUrl(url)) {
    return { label, url, items: [], error: 'Feed URL must start with https://' };
  }

  // Normalize PeerTube site root URLs to their public API endpoint
  let targetUrl = url;
  if (source.kind === 'peertube' && !url.includes('/api/v1/videos')) {
    targetUrl = `${url.replace(/\/+$/, '')}/api/v1/videos?sort=-publishedAt&count=12&isLive=false&nsfw=false`;
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        Accept: 'application/json, application/rss+xml, application/xml, text/xml;q=0.9',
        'User-Agent': '0xDEV-MovieFeedSync/1.0 (+https://0x4dev.netlify.app)',
      },
      signal: AbortSignal.timeout(7500),
    });

    if (!res.ok) {
      return { label, url, items: [], error: `HTTP ${res.status}` };
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const rawBody = await res.text();

    if (contentType.includes('json') || rawBody.trim().startsWith('{') || rawBody.trim().startsWith('[')) {
      const parsed = JSON.parse(rawBody);
      const list = Array.isArray(parsed?.data)
        ? parsed.data
        : Array.isArray(parsed?.items)
          ? parsed.items
          : Array.isArray(parsed)
            ? parsed
            : [];

      const origin = new URL(targetUrl).origin;
      const items = [];

      for (const entry of list.slice(0, 15)) {
        const title = String(entry.name || entry.title || '').trim();
        if (!title) continue;

        let videoUrl = '';
        let fileSizeBytes = 0;

        if (Array.isArray(entry.files) && entry.files.length > 0) {
          const mp4File =
            entry.files.find((f) => String(f.fileDownloadUrl || f.fileUrl || '').toLowerCase().includes('.mp4')) ||
            entry.files[0];
          videoUrl = String(mp4File?.fileDownloadUrl || mp4File?.fileUrl || '');
          fileSizeBytes = Number(mp4File?.size || 0);
        } else if (typeof entry.videoUrl === 'string' || typeof entry.downloadUrl === 'string') {
          videoUrl = String(entry.downloadUrl || entry.videoUrl || '');
        }

        if (!videoUrl || !isSafeHttpsUrl(videoUrl)) continue;

        const thumbRaw = entry.thumbnailPath || entry.previewPath || entry.posterUrl || entry.coverArtUrl || '';
        const posterUrl = thumbRaw.startsWith('http')
          ? thumbRaw
          : thumbRaw.startsWith('/')
            ? `${origin}${thumbRaw}`
            : '';

        const dateStr = String(entry.publishedAt || entry.createdAt || entry.releaseYear || '');
        const yearMatch = `${title} ${dateStr}`.match(/\b(202[0-9]|201[0-9]|19[0-9]{2})\b/);

        items.push({
          externalId: String(entry.uuid || entry.id || videoUrl),
          title: title.slice(0, 140),
          synopsis: decodeXmlEntities(entry.description || entry.synopsis || `${title} from ${label}.`).slice(0, 780),
          releaseYear: yearMatch?.[1] || '2026',
          posterUrl: isSafeHttpsUrl(posterUrl) ? posterUrl : '',
          videoUrl,
          fileSizeBytes: Number.isFinite(fileSizeBytes) ? fileSizeBytes : 0,
          durationSeconds: Number(entry.duration || 0),
          sourceLabel: label,
          sourceUrl: url,
        });
      }

      return { label, url, items };
    }

    // Parse RSS / MRSS / Atom XML
    const items = parseRssOrAtomItems(rawBody, label, url);
    return { label, url, items };
  } catch (err) {
    return {
      label,
      url,
      items: [],
      error: err instanceof Error ? err.message : 'Unable to reach external feed.',
    };
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed. Use POST.' });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON request body.' });
  }

  const sources = Array.isArray(body.sources) ? body.sources.slice(0, 8) : [];
  if (sources.length === 0) {
    return jsonResponse(200, { ok: true, results: [] });
  }

  const settled = await Promise.all(sources.map((src) => fetchSingleFeedSource(src)));
  return jsonResponse(200, {
    ok: true,
    checkedAt: Date.now(),
    results: settled,
  });
}
