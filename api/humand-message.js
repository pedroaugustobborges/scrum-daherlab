/**
 * Vercel serverless proxy for the Humand chat API.
 *
 * Keeps credentials server-side (same pattern as ada-chat.js).
 *
 * POST body: { userExternalId: string, text: string }
 *
 * Flow:
 *   1. conversations.open  → get DM channel id for the user
 *   2. chat.postMessage    → send the message to that channel
 */

const HUMAND_BASE_URL = 'https://api-prod.humand.co/api/v1';
const HUMAND_AUTH =
  process.env.HUMAND_AUTH ||
  'Basic ODQwNDU3NjpqMVdzTDVwRnB5QlgteEhHTjNtMDNWc3djSDJMTFhYMg==';

/** Generates a ULID for the Idempotency-Key header. */
function ulid() {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let t = Date.now();
  let tEnc = '';
  for (let i = 0; i < 10; i++) { tEnc = chars[t % 32] + tEnc; t = Math.floor(t / 32); }
  let rEnc = '';
  for (let i = 0; i < 16; i++) rEnc += chars[Math.floor(Math.random() * 32)];
  return tEnc + rEnc;
}

function humandHeaders() {
  return {
    Authorization: HUMAND_AUTH,
    'Content-Type': 'application/json',
    'Idempotency-Key': ulid(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userExternalId, text } = req.body || {};

  if (!userExternalId || !text) {
    return res.status(400).json({ error: 'userExternalId and text are required' });
  }

  try {
    // Step 1 — open (or retrieve) the DM channel
    const openRes = await fetch(`${HUMAND_BASE_URL}/marty/conversations.open`, {
      method: 'POST',
      headers: humandHeaders(),
      body: JSON.stringify({ external_ids: [userExternalId] }),
    });

    const openData = await openRes.json();

    if (!openData.ok) {
      console.error('conversations.open failed:', openData);
      return res.status(200).json({ success: false, error: 'Failed to open Humand conversation', details: openData });
    }

    const channelId = openData?.channel?.id;
    if (!channelId) {
      return res.status(200).json({ success: false, error: 'No channel id returned by Humand' });
    }

    // Step 2 — send the message
    const msgRes = await fetch(`${HUMAND_BASE_URL}/marty/chat.postMessage`, {
      method: 'POST',
      headers: humandHeaders(),
      body: JSON.stringify({ channel: channelId, text, mrkdwn: false }),
    });

    const msgData = await msgRes.json();

    if (!msgData.ok) {
      console.error('chat.postMessage failed:', msgData);
      return res.status(200).json({ success: false, error: 'Failed to send Humand message', details: msgData });
    }

    return res.status(200).json({ success: true, ts: msgData.ts });
  } catch (error) {
    console.error('Humand proxy error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Unknown error' });
  }
}
