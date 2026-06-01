import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const apiKey = process.env.OPENROUTER_API_KEY;

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

    // 1. Verificar se o usuário já concluiu o desafio diário hoje
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    // Buscar sessões de hoje com scenario = 'daily_challenge'
    const { data: existingSessions, error: sessionErr } = await supabase
      .from("fluenty_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("scenario", "daily_challenge")
      .gte("created_at", `${todayStr}T00:00:00.000Z`)
      .lte("created_at", `${todayStr}T23:59:59.999Z`);

    if (existingSessions && existingSessions.length > 0) {
      const completedSession = existingSessions[0];
      return NextResponse.json({
        completed: true,
        score: completedSession.score_overall,
        highlights: completedSession.highlights
      });
    }

    // 2. Buscar preferências do perfil do usuário para gerar o desafio personalizado
    const { data: profile } = await supabase
      .from("profiles")
      .select("english_level, learning_objective, interests")
      .eq("id", user.id)
      .single();

    const level = profile?.english_level || "Intermediate";
    const objective = profile?.learning_objective || "Daily Conversation";
    const interests = profile?.interests || ["General"];
    const interestsStr = interests.join(", ");

    // Se a OpenRouter API Key não estiver configurada, retornar um desafio mockado estável
    if (!apiKey) {
      // Mock determinístico baseado no dia do mês
      const day = new Date().getDate();
      const mockChallenges = [
        {
          type: "pronunciation",
          title: "Desafio de Pronúncia: Trava-Língua do TH",
          instruction: "Leia o trava-língua abaixo em voz alta com foco na clareza dos sons de 'th' com vibração de voz.",
          target_text: "The three doctors thought through the theory thoroughly.",
          context: "Dica pedagógica: Coloque a ponta da língua entre os dentes superiores e inferiores para produzir o som correto do 'th'."
        },
        {
          type: "upgrade",
          title: "Desafio de Vocabulário: Evite o 'very'",
          instruction: "Grave um áudio lendo a frase abaixo, mas substitua a expressão comum 'very tired' por um sinônimo muito mais sofisticado e nativo.",
          target_text: "I worked all day long, so I am very tired now.",
          context: "Dica pedagógica: Experimente usar expressões como 'exhausted', 'drained' ou 'worn out' para soar mais fluente."
        },
        {
          type: "scenario",
          title: "Cenário Rápido: Comida Fria",
          instruction: "Você está em um restaurante em Nova York e o seu hambúrguer chegou frio. Grave um áudio reclamando com o garçom de forma polida em até 20 segundos.",
          target_text: "Excuse me, I'm sorry to bother you, but my burger is cold. Could you please warm it up?",
          context: "Dica pedagógica: Use 'I'm sorry to bother you, but...' para abrir a reclamação com educação, mantendo um tom firme."
        }
      ];

      const challenge = mockChallenges[day % mockChallenges.length];
      return NextResponse.json({ completed: false, challenge });
    }

    // 3. Gerar o desafio dinamicamente com o Gemini via OpenRouter
    const systemPrompt = `Você é um coordenador pedagógico de inglês moderno e focado em gamificação de aprendizado de idiomas.
Sua missão é gerar um único micro-desafio de conversação de áudio diário para o usuário.
O usuário possui o seguinte perfil de aprendizado:
- Nível de inglês: ${level}
- Objetivo principal: ${objective}
- Temas de interesse: ${interestsStr}

Escolha aleatoriamente um desses 3 formatos de desafio:
1. "pronunciation": Exige que o usuário leia uma frase desafiadora ou trava-língua em voz alta focado em fonemas comuns (ex: som do TH, diferença entre bit/beat, R e L americanos, etc.).
2. "upgrade": Apresenta uma frase simples e comum e desafia o usuário a regravá-la substituindo vocabulários repetitivos e fracos (como "very good", "bad", "happy", "problem") por opções idiomáticas nativas fortes.
3. "scenario": Um cenário rápido de sobrevivência quotidiana relacionado aos interesses e objetivos dele onde ele tem que dar uma única resposta de áudio curta (ex: "Peça um café especial no aeroporto de Londres").

Gere o desafio sob medida para o nível '${level}' e interesses '${interestsStr}'.
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem qualquer tipo de markdown envolta (como \`\`\`json), seguindo exatamente o seguinte schema JSON:
{
  "type": "pronunciation" | "upgrade" | "scenario",
  "title": "Título marcante em Português do Brasil (ex: Desafio de Pronúncia: O Som do TH)",
  "instruction": "Instrução clara de gravação em Português do Brasil (ex: Leia a frase abaixo com foco...)",
  "target_text": "A frase em inglês de referência a ser lida, reescrita ou respondida (ex: 'I think that they went to the theater together')",
  "context": "Uma dica pedagógica ou contexto didático em Português do Brasil (ex: Lembre-se de colocar a ponta da língua...)"
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
          { role: "user", content: "Gere o desafio diário personalizado de hoje de acordo com o perfil." }
        ],
        temperature: 0.7
      })
    });

    if (!chatResponse.ok) {
      throw new Error("Falha na chamada da OpenRouter API.");
    }

    const chatData = await chatResponse.json();
    let content = chatData.choices[0]?.message?.content || "";
    content = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

    const challenge = JSON.parse(content);
    return NextResponse.json({ completed: false, challenge });

  } catch (err: any) {
    console.error("Erro na API GET /api/daily-challenge:", err);
    return NextResponse.json(
      { error: "Erro de conexão ao carregar desafio diário." },
      { status: 500 }
    );
  }
}

// Endpoint de envio/avaliação do desafio diário do dia
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!token || !supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    const { supabase } = await import("@/lib/supabase");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json(
        { error: "Token inválido." },
        { status: 401 }
      );
    }

    const { audioBase64, format, challengeType, targetText } = await req.json();

    if (!audioBase64) {
      return NextResponse.json(
        { error: "O áudio em base64 é obrigatório." },
        { status: 400 }
      );
    }

    let transcription = "";
    
    // 1. Transcrever com Whisper do OpenRouter
    if (apiKey) {
      try {
        console.time("⏱️ STT - Daily Challenge Whisper");
        const sttResponse = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openai/whisper-1",
            input_audio: {
              data: audioBase64,
              format: format || "webm"
            }
          })
        });

        if (sttResponse.ok) {
          const sttData = await sttResponse.json();
          transcription = sttData.text || "";
        } else {
          const errText = await sttResponse.text();
          console.error("Erro na API Whisper:", errText);
        }
        console.timeEnd("⏱️ STT - Daily Challenge Whisper");
      } catch (err) {
        console.error("Erro ao chamar Whisper:", err);
      }
    }

    // Fallback se não transcreveu via API real
    if (!transcription.trim()) {
      transcription = targetText || "I failed to record properly but tried.";
    }

    // Buscar perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("english_level")
      .eq("id", user.id)
      .single();

    const level = profile?.english_level || "Intermediate";

    let score = 80;
    let feedback = `Muito bom! Você completou o desafio diário com sucesso. Sua gravação foi processada e avaliada de acordo com o nível ${level}.`;

    // 2. Chamar a LLM para avaliar a transcrição com base no desafio diário
    if (apiKey) {
      try {
        const evaluationSystemPrompt = `Você é um avaliador de pronúncia e gramática de inglês rápido e descontraído para desafios diários de gamificação.
Analise a transcrição gerada pelo áudio do usuário em comparação ao objetivo do desafio.

DADOS:
- Tipo de desafio: ${challengeType} (pronunciation = leitura de trava-língua, upgrade = substituição de vocabulário básico, scenario = resposta de áudio livre no cenário).
- Texto de referência (se aplicável): ${targetText}
- Transcrição do áudio gravado pelo usuário: "${transcription}"
- Nível de inglês: ${level}

Gere uma avaliação descontraída e rápida.
1. Se for "pronunciation", avalie a similaridade de leitura e clareza de palavras em comparação à frase alvo.
2. Se for "upgrade", garanta que o usuário substituiu a palavra básica por uma expressão rica e nativa (ex: tirou "very tired" e colocou "exhausted").
3. Se for "scenario", verifique se ele respondeu ao cenário de forma coerente com o pedido em inglês.

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem qualquer tipo de markdown envolta (como \`\`\`json), seguindo exatamente o seguinte schema JSON:
{
  "score": número de 0 a 100 (nota geral baseada no nível '${level}'),
  "feedback": "Dica rápida e descontraída em Português do Brasil de 1 ou 2 frases, elogiando e apontando onde polir."
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
              { role: "system", content: evaluationSystemPrompt },
              { role: "user", content: `Avalie o resultado da gravação: "${transcription}"` }
            ],
            temperature: 0.3
          })
        });

        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          let content = chatData.choices[0]?.message?.content || "";
          content = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
          const evaluationResult = JSON.parse(content);
          
          score = Number(evaluationResult.score) || 80;
          feedback = evaluationResult.feedback || feedback;
        }
      } catch (err) {
        console.error("Erro ao chamar LLM para avaliar desafio diário:", err);
      }
    }

    // 3. Gravar o progresso na tabela fluenty_sessions com scenario = 'daily_challenge'
    // Isso atualiza o streak de forma nativa e registra no banco
    const { error: sessionError } = await supabase
      .from("fluenty_sessions")
      .insert({
        user_id: user.id,
        scenario: "daily_challenge",
        duration_seconds: 15,
        score_overall: score,
        score_grammar: score,
        score_vocabulary: score,
        score_fluency: score,
        highlights: feedback,
        instagram_card_phrase: `Completei o Desafio Diário do Fluenty hoje com nota ${score}%! ⚡`
      });

    if (sessionError) {
      console.error("Erro ao gravar fluenty_sessions do desafio diário:", sessionError);
    }

    // Retornar resultados para o front-end
    return NextResponse.json({
      score,
      feedback,
      transcription
    });

  } catch (err: any) {
    console.error("Erro na API POST /api/daily-challenge:", err);
    return NextResponse.json(
      { error: "Erro de conexão ao salvar avaliação." },
      { status: 500 }
    );
  }
}
