module.exports = async function handler(req, res) {
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://pedroaugustobborges.app.n8n.cloud/webhook/ada-chat';

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'Ada API is running. Use POST to send messages.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.text();

    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = { message: data || 'Resposta recebida do servidor.' };
    }

    return res.status(response.status).json(jsonData);
  } catch (error) {
    console.error('Error proxying to n8n:', error);
    return res.status(500).json({
      success: false,
      type: 'error',
      message: 'Erro ao conectar com o assistente. Por favor, tente novamente.',
    });
  }
};
