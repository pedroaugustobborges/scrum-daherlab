import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const AI_PROMPT = `# Role
Você é um especialista em gestão de projetos ágeis e Scrum Master sênior com mais de 15 anos de experiência. Sua função é analisar o estado atual de um sprint e fornecer uma dica prática, específica e acionável para ajudar a equipe a ter sucesso.

# Diretrizes para a Dica
1. **Seja específico**: Use os dados fornecidos (progresso, tarefas, pontos) para contextualizar sua dica
2. **Seja prático**: Sugira ações concretas que a equipe pode implementar imediatamente
3. **Seja motivacional**: Mantenha um tom positivo e encorajador
4. **Seja conciso**: A dica deve ter entre 300 e 400 caracteres, nunca menos que 300 e nunca mais que 400

# Cenários a considerar
- Se o progresso está baixo e restam poucos dias: foque em priorização e redução de escopo
- Se há muitas tarefas bloqueadas: sugira técnicas de desbloqueio
- Se o progresso está bom: reconheça e sugira como manter o ritmo
- Se há ações pendentes do sprint anterior: mencione a importância de endereçá-las
- Se a velocidade atual está abaixo da média: sugira retrospectiva rápida

# Output
Retorne APENAS a dica, sem explicações adicionais, prefixos ou formatação. A dica deve ser direta e em português brasileiro.`;

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
    const {
      sprintName,
      sprintGoal,
      totalTasks,
      completedTasks,
      totalPoints,
      completedPoints,
      blockedTasks,
      daysRemaining,
      averageVelocity,
      previousSprintActions,
    } = await req.json();

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

    const progressPercentage = totalPoints > 0
      ? Math.round((completedPoints / totalPoints) * 100)
      : 0;

    const contextMessage = `
Dados do Sprint "${sprintName}":
- Objetivo: ${sprintGoal || "Não definido"}
- Progresso: ${progressPercentage}% (${completedPoints}/${totalPoints} pontos)
- Tarefas: ${completedTasks}/${totalTasks} concluídas
- Tarefas bloqueadas: ${blockedTasks}
- Dias restantes: ${daysRemaining}
- Velocidade média histórica: ${averageVelocity} pontos/sprint
${previousSprintActions ? `- Ações pendentes do sprint anterior: ${previousSprintActions}` : ""}

Forneça uma dica específica para este cenário (300-400 caracteres):`;

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
          { role: "user", content: contextMessage },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate tip" }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    let tip = data.choices?.[0]?.message?.content?.trim() || "";

    // Ensure tip is within bounds (300-400 chars)
    if (tip.length > 400) {
      // Find the last complete sentence within 400 chars
      const truncated = tip.substring(0, 400);
      const lastPeriod = truncated.lastIndexOf(".");
      if (lastPeriod > 280) {
        tip = truncated.substring(0, lastPeriod + 1);
      } else {
        tip = truncated + "...";
      }
    }

    return new Response(JSON.stringify({ tip }), {
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
