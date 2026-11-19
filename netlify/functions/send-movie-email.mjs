import fs from 'node:fs';
import path from 'node:path';

const PRIMARY_ADMIN_EMAIL = 'arigyewisdom7@gmail.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFirebaseApiKey() {
  if (process.env.FIREBASE_WEB_API_KEY) {
    return process.env.FIREBASE_WEB_API_KEY;
  }
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.apiKey === 'string' && parsed.apiKey) {
      return parsed.apiKey;
    }
  } catch {
    // Config unavailable in bundled context unless FIREBASE_WEB_API_KEY is set
  }
  return '';
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(payload),
  };
}

async function verifyAdminIdToken(idToken) {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) {
    throw new Error('Firebase Web API key is unavailable for admin verification.');
  }

  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(5000),
    }
  );

  if (!lookupRes.ok) {
    throw new Error('Invalid or expired Firebase authentication token.');
  }

  const data = await lookupRes.json();
  const user = Array.isArray(data.users) ? data.users[0] : null;
  if (!user) {
    throw new Error('Authenticated user record not found.');
  }

  const email = typeof user.email === 'string' ? user.email.toLowerCase() : '';
  const emailVerified = Boolean(user.emailVerified);
  if (email !== PRIMARY_ADMIN_EMAIL || !emailVerified) {
    return { authorized: false, email };
  }

  return { authorized: true, email };
}

async function sendViaBrevo({ apiKey, senderEmail, recipient, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: '0xDEV Movies',
        email: senderEmail,
      },
      to: [{ email: recipient.email, name: recipient.name || 'Subscriber' }],
      subject,
      htmlContent: html || `<p>${text}</p>`,
      textContent: text,
    }),
    signal: AbortSignal.timeout(6000),
  });
  return res;
}

async function sendViaResend({ apiKey, fromAddress, recipient, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [recipient.email],
      subject,
      html,
      text,
    }),
    signal: AbortSignal.timeout(6000),
  });
  return res;
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed. Use POST.' });
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return jsonResponse(401, { ok: false, error: 'Missing Authorization Bearer token.' });
  }

  let authResult;
  try {
    authResult = await verifyAdminIdToken(token);
  } catch (err) {
    return jsonResponse(401, {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to verify admin credentials.',
    });
  }

  if (!authResult.authorized) {
    return jsonResponse(403, {
      ok: false,
      error: 'Only the verified primary studio administrator can dispatch movie release emails.',
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON request body.' });
  }

  const movie = body.movie || {};
  const rawSubscribers = Array.isArray(body.subscribers) ? body.subscribers : [];
  const customSubject =
    typeof body.subject === 'string' && body.subject.trim()
      ? body.subject.trim().slice(0, 180)
      : `New Movie Uploaded on 0xDEV: ${String(movie.title || 'Free Release').slice(0, 100)}`;
  const customHtml = typeof body.html === 'string' ? body.html : '';
  const customText =
    typeof body.text === 'string' && body.text.trim()
      ? body.text
      : `New movie uploaded on 0xDEV: ${movie.title || ''}. Watch or save it offline at https://0x4dev.netlify.app/movies`;

  const dedupedEmails = [];
  const seen = new Set();
  for (const sub of rawSubscribers) {
    const email = typeof sub?.email === 'string' ? sub.email.trim().toLowerCase() : '';
    if (EMAIL_REGEX.test(email) && !seen.has(email)) {
      seen.add(email);
      dedupedEmails.push({
        email,
        name: typeof sub?.name === 'string' ? sub.name.trim() : 'Movie Subscriber',
      });
    }
  }

  const brevoApiKey = process.env.BREVO_API_KEY?.trim() || '';
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || '';

  if (dedupedEmails.length === 0) {
    return jsonResponse(200, {
      ok: true,
      configured: Boolean(brevoApiKey || resendApiKey),
      sentCount: 0,
      failedCount: 0,
      message: 'No valid active subscriber email addresses were supplied.',
    });
  }

  if (!brevoApiKey && !resendApiKey) {
    return jsonResponse(200, {
      ok: false,
      configured: false,
      sentCount: 0,
      failedCount: 0,
      reason:
        'No email API key is configured in Netlify Environment variables yet (add BREVO_API_KEY or RESEND_API_KEY).',
    });
  }

  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || PRIMARY_ADMIN_EMAIL;
  const resendFromAddress =
    process.env.RESEND_FROM_EMAIL?.trim() || '0xDEV Movies <onboarding@resend.dev>';

  let sentCount = 0;
  let failedCount = 0;
  const errors = [];

  const recipients = dedupedEmails.slice(0, 50);
  const BATCH_SIZE = 10;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(async (recipient) => {
        const apiRes = brevoApiKey
          ? await sendViaBrevo({
              apiKey: brevoApiKey,
              senderEmail: brevoSenderEmail,
              recipient,
              subject: customSubject,
              html: customHtml,
              text: customText,
            })
          : await sendViaResend({
              apiKey: resendApiKey,
              fromAddress: resendFromAddress,
              recipient,
              subject: customSubject,
              html: customHtml,
              text: customText,
            });

        if (apiRes.ok) {
          return { ok: true, email: recipient.email };
        }
        const errPayload = await apiRes.text();
        return { ok: false, email: recipient.email, error: errPayload.slice(0, 140) };
      })
    );

    settled.forEach((result, idx) => {
      const recipientEmail = batch[idx].email;
      if (result.status === 'fulfilled') {
        if (result.value.ok) {
          sentCount += 1;
        } else {
          failedCount += 1;
          errors.push(`${recipientEmail}: ${result.value.error}`);
        }
      } else {
        failedCount += 1;
        const msg =
          result.reason instanceof Error ? result.reason.message : 'Network error';
        errors.push(`${recipientEmail}: ${msg}`);
      }
    });
  }

  return jsonResponse(200, {
    ok: sentCount > 0,
    configured: true,
    provider: brevoApiKey ? 'brevo' : 'resend',
    sentCount,
    failedCount,
    errors: errors.slice(0, 5),
  });
}
