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
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const text = await n8nResponse.text();

    // Log for debugging (visible in Vercel function logs)
    console.log('[Ada] n8n status:', n8nResponse.status, '| body length:', text.length);
    if (text.length < 500) console.log('[Ada] n8n raw response:', text);

    // Check for n8n errors
    if (text.includes('not registered') || text.includes('not found') || n8nResponse.status === 404) {
      console.error('[Ada] n8n webhook not found:', text);
      return res.status(200).json({
        success: false,
        type: 'error',
        message: 'O assistente está temporariamente indisponível. Por favor, tente novamente mais tarde.'
      });
    }

    if (!text) {
      console.error('[Ada] n8n returned empty body. Workflow may have crashed. Check n8n execution logs.');
      return res.status(200).json({
        success: false,
        type: 'error',
        message: 'O assistente não retornou uma resposta. Verifique se o workflow n8n está ativo e funcionando corretamente.'
      });
    }

    let jsonData;
    try {
      const parsed = JSON.parse(text);
      // Handle potential double-encoded JSON: if n8n returned a JSON string inside JSON
      if (typeof parsed === 'string') {
        try {
          jsonData = JSON.parse(parsed);
        } catch {
          jsonData = { success: true, type: 'answer', message: parsed };
        }
      } else {
        jsonData = parsed;
      }
    } catch {
      console.error('[Ada] Failed to parse n8n response as JSON. Raw text:', text.substring(0, 300));
      jsonData = {
        success: false,
        type: 'error',
        message: 'O assistente retornou uma resposta em formato inválido. Tente novamente.'
      };
    }

    return res.status(200).json(jsonData);
  } catch (error) {
    console.error('[Ada] Error proxying to n8n:', error);
    return res.status(500).json({
      success: false,
      type: 'error',
      message: 'Erro ao conectar com o assistente: ' + (error.message || 'Unknown error'),
    });
  }
}
