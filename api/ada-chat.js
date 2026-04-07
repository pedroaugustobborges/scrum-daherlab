export default function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', method: 'GET' });
  }

  if (req.method === 'POST') {
    return res.status(200).json({ status: 'ok', method: 'POST', body: req.body });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
