import { NextRequest, NextResponse } from "next/server";

// Fallbacks de fases mockadas caso a OpenRouter API Key não esteja disponível
function getMockPath(level: string, objective: string, interests: string[], userId: string, occupation?: string) {
  const interestsStr = interests.length > 0 ? interests.join(", ") : "Geral";
  const trackName = occupation ? `Inglês para ${occupation}` : "Primeiros Passos com Conversação";
  return [
    {
      user_id: userId,
      phase_number: 1,
      title: "Fase 1: Introdução Básica",
      description: `Apresente-se ao seu tutor focado no objetivo de ${objective}${occupation ? ` como ${occupation}` : ""} e mencione seu interesse em ${interestsStr}.`,
      scenario_key: "casual",
      system_instructions: `You are a friendly personal tutor. Talk to the user at a ${level} level. Introduce yourself and ask the user about their day, their interest in ${interestsStr}, their career${occupation ? ` as a ${occupation}` : ""}, and their goals in English. Be welcoming.`,
      status: "unlocked",
      score_needed: 70,
      track_name: trackName
    },
    {
      user_id: userId,
      phase_number: 2,
      title: "Fase 2: Simulação de Diálogo Prático",
      description: "Pratique conversação simulando uma compra simples ou interação cotidiana.",
      scenario_key: "coffee",
      system_instructions: `You are a busy store assistant. Talk to the user at a ${level} level. They want to make a purchase related to their interests: ${interestsStr}. Guide the conversation.`,
      status: "locked",
      score_needed: 70,
      track_name: trackName
    },
    {
      user_id: userId,
      phase_number: 3,
      title: "Fase 3: Expressão de Opiniões",
      description: "Compartilhe seu ponto de vista sobre um tópico interessante e defenda sua ideia.",
      scenario_key: "meeting",
      system_instructions: `You are a group moderator. Ask the user to explain their ideas about ${interestsStr}. Challenge them gently to elaborate. Speak at a ${level} level.`,
      status: "locked",
      score_needed: 70,
      track_name: trackName
    },
    {
      user_id: userId,
      phase_number: 4,
      title: "Fase 4: Conversação Sob Pressão",
      description: "Simule uma entrevista ou reunião importante onde você deve justificar decisões.",
      scenario_key: "interview",
      system_instructions: `You are a direct interviewer. Ask tough questions about the user's background and goals. Keep the tone professional. Speak at a ${level} level.`,
      status: "locked",
      score_needed: 70,
      track_name: trackName
    },
    {
      user_id: userId,
      phase_number: 5,
      title: "Fase 5: Desafio de Vocabulário Nativo",
      description: "Discussão de nível avançado sobre cenários complexos usando phrasal verbs.",
      scenario_key: "casual",
      system_instructions: `You are an English language expert. Have a natural discussion with the user about their career and ${interestsStr}. Introduce and explain 1 new phrasal verb during the chat. Speak at a ${level} level.`,
      status: "locked",
      score_needed: 75,
      track_name: trackName
    }
  ];
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!token || !supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Não autorizado ou chaves do Supabase ausentes." },
        { status: 401 }
      );
    }

    const { supabase } = await import("@/lib/supabase");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Token de sessão inválido." },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Buscar preferências do perfil do usuário
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("english_level, learning_objective, interests")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "Não foi possível encontrar o perfil do usuário." },
        { status: 404 }
      );
    }

    const rawObjective = profile.learning_objective || "Daily Conversation";
    let objective = rawObjective;
    let occupation = "";

    // Se contiver o padrão "Objetivos: Profissão", faz o split
    if (rawObjective.includes(": ")) {
      const parts = rawObjective.split(": ");
      objective = parts[0];
      occupation = parts[1] || "";
    }

    const level = profile.english_level || "Intermediate";
    const interests = profile.interests || [];
    const apiKey = process.env.OPENROUTER_API_KEY;

    let pathFases = [];

    // --- SE NÃO HOUVER API KEY: GERAR MOCK ---
    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY não configurada. Gerando caminho mockado.");
      pathFases = getMockPath(level, objective, interests, userId, occupation);
    } else {
      // --- GERAR VIA IA GEMINI ---
      try {
        const interestsStr = interests.length > 0 ? interests.join(", ") : "General English";
        const systemPrompt = `Você é um coordenador pedagógico de inglês altamente experiente.
O usuário possui o seguinte perfil de aprendizado:
- Nível de inglês: ${level}
- Objetivos principais: ${objective}
${occupation ? `- Cargo/Profissão: ${occupation}` : ""}
- Temas de interesse: ${interestsStr}

Gere uma trilha de aprendizado de conversação por voz sob medida contendo exatamente 5 lições progressivas (fases de 1 a 5).
As lições devem ir aumentando de complexidade e devem ser muito focadas nos objetivos, na profissão e nos interesses do usuário.

${occupation ? `IMPORTANTE - CARGO DO USUÁRIO (${occupation}):
Como o usuário informou o cargo/profissão '${occupation}', você DEVE obrigatoriamente fazer com que as fases corporativas (especialmente roleplays de 'meeting' ou 'interview') simulem o cotidiano de trabalho real dessa profissão.
- Se ele for da área de tecnologia (ex: Software Developer, Product Designer, Project Manager), os diálogos devem discutir sprints, dailies, deploy, wireframes, roadmaps, code reviews ou bugs reais do cargo.
- Adapte para qualquer outra profissão que ele informe de forma muito natural e tecnicamente precisa, usando jargões adequados da indústria no prompt em inglês do roleplay.` : ""}

Para cada fase, defina:
1. phase_number: número inteiro de 1 a 5.
2. title: Título curto em Português do Brasil (ex: "Fase 1: Negociando na Reunião").
3. description: Descrição do desafio pedagógico em Português do Brasil (ex: "Converse com o gerente da empresa para definir as metas do trimestre").
4. scenario_key: Mapeie para uma dessas 4 chaves estéticas que temos na UI: "casual", "interview", "coffee", "meeting".
5. system_instructions: A instrução pedagógica em inglês de roleplay estrita que a IA (tutor de voz) deve seguir para atuar nessa lição. Ela deve incluir o cenário, o papel que a IA fará, e orientações sobre como guiar a conversa de acordo com o nível de inglês '${level}' e interesses '${interestsStr}'. (ex: "You are a senior tech lead. Lead a sprint planning. Ask the user at a ${level} level about their tasks. Keep the discussion focused on tech.").

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem qualquer markdown envolta (como \`\`\`json), seguindo exatamente o seguinte schema:
{
  "track_name": "Nome da trilha de aprendizado",
  "phases": [
    {
      "phase_number": número,
      "title": "string",
      "description": "string",
      "scenario_key": "string",
      "system_instructions": "string"
    }
  ]
}`;

        const chatResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://fluenty.app",
            "X-Title": "Fluenty App"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Gere o caminho personalizado para nível ${level}, objetivos ${objective}${occupation ? ` e profissão ${occupation}` : ""} com interesses ${interestsStr}.` }
            ]
          })
        });

        if (!chatResponse.ok) {
          throw new Error("Erro de comunicação com a LLM do OpenRouter");
        }

        const chatData = await chatResponse.json();
        let content = chatData.choices[0]?.message?.content || "";
        content = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

        const generatedData = JSON.parse(content);
        const trackName = generatedData.track_name || "Trilha Inicial de Aprendizado";
        const generatedList = generatedData.phases;

        if (Array.isArray(generatedList) && generatedList.length === 5) {
          pathFases = generatedList.map((item, idx) => ({
            user_id: userId,
            phase_number: item.phase_number || (idx + 1),
            title: item.title,
            description: item.description,
            scenario_key: item.scenario_key || "casual",
            system_instructions: item.system_instructions,
            status: idx === 0 ? "unlocked" : "locked",
            score_needed: idx === 4 ? 75 : 70, // Fase final exige 75%
            track_name: trackName
          }));
        } else {
          throw new Error("Formato inválido retornado pela IA");
        }
      } catch (e) {
        console.error("Falha ao gerar trilha com a LLM, usando fallback mockado:", e);
        pathFases = getMockPath(level, objective, interests, userId);
      }
    }

    // Apagar qualquer caminho de aprendizado anterior deste usuário para evitar duplicação
    await supabase
      .from("fluenty_learning_paths")
      .delete()
      .eq("user_id", userId);

    // Inserir as novas fases no banco
    const { error: insertError } = await supabase
      .from("fluenty_learning_paths")
      .insert(pathFases);

    if (insertError) {
      console.error("Erro ao inserir caminho personalizado no Supabase:", insertError);
      throw insertError;
    }

    console.log(`Caminho personalizado de 5 fases inserido com sucesso para o usuário ${userId}.`);
    return NextResponse.json({ success: true, count: pathFases.length });

  } catch (error: any) {
    console.error("Erro na API Route /api/generate-path:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao processar jornada personalizada" },
      { status: 500 }
    );
  }
}
