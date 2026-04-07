const https = require('https');

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
    const body = JSON.stringify(req.body);
    const url = new URL(N8N_WEBHOOK_URL);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const data = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          resolve({ status: response.statusCode, data });
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.write(body);
      request.end();
    });

    let jsonData;
    try {
      jsonData = JSON.parse(data.data);
    } catch {
      jsonData = { message: data.data || 'Resposta recebida do servidor.' };
    }

    return res.status(data.status).json(jsonData);
  } catch (error) {
    console.error('Error proxying to n8n:', error);
    return res.status(500).json({
      success: false,
      type: 'error',
      message: 'Erro ao conectar com o assistente: ' + error.message,
    });
  }
};
