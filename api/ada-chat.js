export default async function handler(req, res) {
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://pedroaugustobborges.app.n8n.cloud/webhook/ada-assistant';

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

    const text = await response.text();

    // Check for n8n errors
    if (text.includes('not registered') || text.includes('not found') || response.status === 404) {
      console.error('n8n webhook error:', text);
      return res.status(200).json({
        success: false,
        type: 'error',
        message: 'O assistente está temporariamente indisponível. Por favor, tente novamente mais tarde.'
      });
    }

    let jsonData;
    try {
      jsonData = JSON.parse(text);
    } catch {
      jsonData = {
        success: true,
        type: 'answer',
        message: text || 'Resposta recebida do servidor.'
      };
    }

    return res.status(200).json(jsonData);
  } catch (error) {
    console.error('Error proxying to n8n:', error);
    return res.status(500).json({
      success: false,
      type: 'error',
      message: 'Erro ao conectar com o assistente: ' + (error.message || 'Unknown error'),
    });
  }
}
