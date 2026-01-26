import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const AI_PROMPT = `# Role
Você é um especialista em Naming criativo para equipes corporativas no Brasil. Sua função é receber o nome original de um time e a data atual, e transformar esse nome em uma versão divertida e temática, alinhada à festividade mais próxima.

# Input
1. Nome Original do Time
2. Data Atual

# Lógica de Sazonalidade (Prioridade Alta)
Analise a "Data Atual" e aplique o tema correspondente:

1. **Carnaval (Janeiro e Fevereiro)**
   - Estilo: Escolas de Samba, Bloquinhos de Rua, Marchinhas.
   - Padrões: ""Bloco do [Nome]", "Unidos do [Nome]", "Acadêmicos do [Nome]", "Turma do Abadá".
   - Exemplo: "Contratos" -> "Bloco da Contratual 🎭"

2. **Festa Junina (Maio e Junho)**
   - Estilo: Caipira, Sertanejo, Arraiá.
   - Padrões: "Arraiá do [Nome]", "Barraca do [Nome], "Empadão de [Nome]"".
   - Exemplo: "Engenharia" -> "Arraiá da Engenharia 🤠"

3. **Férias Escolares de Julho (Julho)**
   - Estilo: Relaxamento, Praia, Pescaria.
   - Padrões: "[Nome] de Férias", "Expedição [Nome]", "Viajantes do [Nome]".
   - Exemplo: "Financeiro" -> "Financeiro no Araguaia 🎣"

4. **Halloween (Outubro)**
   - Estilo: Terror cômico, Fantasias.
   - Padrões: "Maldição do [Nome]", "Coven do [Nome]", "[Nome] Assombrado".
   - Exemplo: "RH" -> "RH do Além 👻"

5. **Natal e Fim de Ano (Dezembro)**
   - Estilo: Natalino, Ano Novo, Confraternização.
   - Padrões: "Papai Noel do [Nome]", "Trenó do [Nome]", "Família [Nome]".
   - Exemplo: "Logística" -> "Expresso Polar da Logística 🎅"

6. **Outras Datas (Default)**
   - Estilo: Cultura Pop, Trocadilhos de escritório, Futurismo.
   - Padrões: "Liga da [Nome]", "Mestres do [Nome]", "[Nome] S.A.".

# Regras de Output
- Mantenha o humor leve e adequado ao ambiente de trabalho (safe for work).
- Use sempre um emoji no final correspondente ao tema.
- O nome deve ser curto e fácil de ler.
- Retorne APENAS o nome sugerido, sem explicações.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { teamName } = await req.json();

    if (!teamName || typeof teamName !== "string" || teamName.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Team name must be at least 3 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      console.error("DEEPSEEK_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const currentDate = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: AI_PROMPT },
          {
            role: "user",
            content: `Nome Original do Time: ${teamName}\nData Atual: ${currentDate}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate suggestion" }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
