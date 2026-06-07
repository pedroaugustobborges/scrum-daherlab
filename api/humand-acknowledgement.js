/**
 * Vercel serverless proxy for the Humand Public API – acknowledgements.
 *
 * Keeps the API key server-side (same pattern as humand-message.js).
 *
 * POST body:
 *   {
 *     acknowledgedUsername:       string,   // Humand username of the person being recognised
 *     acknowledgerUsername:       string,   // Humand username of who is giving the recognition (Ada)
 *     body:                       string,   // Acknowledgement text shown on the platform
 *     acknowledgementCategoryName: string,  // Name of an existing category in the Humand workspace
 *   }
 *
 * Required env vars:
 *   HUMAND_PUBLIC_API_KEY        – Bearer token for https://api-prod.humand.co/public/api/v1
 *   HUMAND_ADA_USERNAME          – Ada's / system account's Humand username  (default: "ada")
 *   HUMAND_ACK_CATEGORY          – Acknowledgement category name              (default: "Reconhecimento")
 */

const HUMAND_PUBLIC_BASE_URL = 'https://api-prod.humand.co/public/api/v1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    acknowledgedUsername,
    acknowledgerUsername,
    body,
    acknowledgementCategoryName,
  } = req.body || {};

  if (!acknowledgedUsername || !body) {
    return res
      .status(400)
      .json({ error: 'acknowledgedUsername and body are required' });
  }

  const apiKey = process.env.HUMAND_PUBLIC_API_KEY || '';
  if (!apiKey) {
    console.error('humand-acknowledgement: HUMAND_PUBLIC_API_KEY is not set');
    return res.status(500).json({ success: false, error: 'API key not configured' });
  }

  const finalAcknowledgerUsername =
    acknowledgerUsername ||
    process.env.HUMAND_ADA_USERNAME ||
    'ada';

  const finalCategoryName =
    acknowledgementCategoryName ||
    process.env.HUMAND_ACK_CATEGORY ||
    'Reconhecimento';

  try {
    const ackRes = await fetch(`${HUMAND_PUBLIC_BASE_URL}/acknowledgements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        body,
        acknowledgedUsername,
        acknowledgementCategoryName: finalCategoryName,
        acknowledgerUsername: finalAcknowledgerUsername,
      }),
    });

    const data = await ackRes.json();

    if (!ackRes.ok) {
      console.error('Humand acknowledgement API error:', data);
      return res
        .status(200)
        .json({ success: false, error: data.message || 'Request failed', details: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('humand-acknowledgement proxy error:', error);
    return res
      .status(500)
      .json({ success: false, error: error.message || 'Unknown error' });
  }
}
