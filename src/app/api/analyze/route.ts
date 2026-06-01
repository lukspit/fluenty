import { NextRequest, NextResponse } from "next/server";

// Função para persistir dados no Supabase
async function saveToSupabase(scenario: string, duration: number, history: any[], result: any, userId: string | null, pathId: string | null) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log("Supabase URL ou chave de API não configurada. Pulando persistência.");
      return null;
    }

    const { supabase } = await import("@/lib/supabase");

    // 1. Inserir Sessão
    const { data: sessionData, error: sessionError } = await supabase
      .from("fluenty_sessions")
      .insert({
        scenario: scenario || "casual",
        duration_seconds: duration || 0,
        score_overall: result.score_overall || 0,
        score_grammar: result.score_grammar || 0,
        score_vocabulary: result.score_vocabulary || 0,
        score_fluency: result.score_fluency || 0,
        highlights: result.highlights || "",
        instagram_card_phrase: result.instagram_card_phrase || "",
        user_id: userId || null, // Associar com a FK de auth.users
        path_id: pathId || null  // Associar com a lição personalizada do path
      })
      .select("id")
      .single();

    if (sessionError) {
      console.error("Erro ao salvar fluenty_sessions no Supabase:", sessionError);
      return null;
    }

    const sessionId = sessionData.id;

    // 2. Inserir mensagens do histórico
    if (history && history.length > 0) {
      const msgsToInsert = history.map((msg: any) => ({
        session_id: sessionId,
        sender: msg.sender,
        text: msg.text
      }));
      const { error: msgError } = await supabase
        .from("fluenty_messages")
        .insert(msgsToInsert);
      if (msgError) console.error("Erro ao salvar fluenty_messages no Supabase:", msgError);
    }

    // 3. Inserir correções
    if (result.corrections && result.corrections.length > 0) {
      const correctionsToInsert = result.corrections.map((corr: any) => ({
        session_id: sessionId,
        original: corr.original,
        corrected: corr.corrected,
        explanation: corr.explanation
      }));
      const { error: corrError } = await supabase
        .from("fluenty_corrections")
        .insert(correctionsToInsert);
      if (corrError) console.error("Erro ao salvar fluenty_corrections no Supabase:", corrError);
    }

    // 4. Inserir melhorias de vocabulário
    if (result.vocabulary_improvements && result.vocabulary_improvements.length > 0) {
      const vocabToInsert = result.vocabulary_improvements.map((vi: any) => ({
        session_id: sessionId,
        word_used: vi.word_used,
        suggestions: vi.suggestions || [],
        context: vi.context
      }));
      const { error: vocabError } = await supabase
        .from("fluenty_vocabulary_improvements")
        .insert(vocabToInsert);
      if (vocabError) console.error("Erro ao salvar fluenty_vocabulary_improvements no Supabase:", vocabError);
    }

    console.log(`Sessão ${sessionId} salva com sucesso no Supabase para o usuário ${userId || "anonimo"}.`);
    return sessionId;
  } catch (err) {
    console.error("Erro na integração com Supabase:", err);
    return null;
  }
}

// Gera a próxima trilha de 5 fases baseada nas últimas conversas do usuário e perfil
async function generateNextTrack(userId: string, currentMaxPhase: number, oldTrackName: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return `Trilha Adicional (Fases ${currentMaxPhase + 1}-${currentMaxPhase + 5})`;
  }

  const { supabase } = await import("@/lib/supabase");

  // 1. Buscar perfil do usuário para obter preferências e nível
  const { data: profile } = await supabase
    .from("profiles")
    .select("english_level, learning_objective, interests")
    .eq("id", userId)
    .single();

  const level = profile?.english_level || "Intermediate";
  const objective = profile?.learning_objective || "General English";
  const interests = (profile?.interests || []).join(", ") || "General Topics";

  // 2. Buscar as últimas 5 sessões finalizadas para analisar o histórico e erros
  const { data: sessions } = await supabase
    .from("fluenty_sessions")
    .select("id, score_overall, highlights")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  let historyContext = "";
  if (sessions && sessions.length > 0) {
    historyContext += `Histórico de performance das últimas 5 conversas do usuário:\n`;
    for (const session of sessions) {
      historyContext += `- Nota de Fluência: ${session.score_overall}%. Feedback: ${session.highlights}\n`;
      
      // Buscar correções da sessão
      const { data: corrections } = await supabase
        .from("fluenty_corrections")
        .select("original, corrected")
        .eq("session_id", session.id)
        .limit(3);
        
      if (corrections && corrections.length > 0) {
        historyContext += `  Correções gramaticais feitas:\n`;
        corrections.forEach(c => {
          historyContext += `    * Errado: "${c.original}" -> Correto: "${c.corrected}"\n`;
        });
      }
    }
  }

  const nextStartPhase = currentMaxPhase + 1;
  const nextEndPhase = currentMaxPhase + 5;
  let trackName = "Evolução na Conversação";
  let pathFases: any[] = [];

  if (!apiKey) {
    trackName = `Aprofundamento de Conversação (Fases ${nextStartPhase}-${nextEndPhase})`;
    pathFases = Array.from({ length: 5 }).map((_, idx) => {
      const pNum = nextStartPhase + idx;
      return {
        user_id: userId,
        phase_number: pNum,
        title: `Fase ${pNum}: Prática de Diálogo Avançado ${idx + 1}`,
        description: `Reforce sua fluência conversando sobre tópicos práticos e expandindo seu vocabulário.`,
        scenario_key: idx % 2 === 0 ? "meeting" : "casual",
        system_instructions: `You are an conversational expert. Chat with the user at a ${level} level. Challenge them to elaborate.`,
        status: idx === 0 ? "unlocked" : "locked",
        score_needed: idx === 4 ? 75 : 70,
        track_name: trackName
      };
    });
  } else {
    try {
      const systemPrompt = `Você é um coordenador pedagógico de inglês baseado em dados e IA.
O usuário concluiu a trilha anterior de inglês chamada "${oldTrackName}".
Aqui está o perfil dele:
- Nível de inglês: ${level}
- Objetivo principal: ${objective}
- Temas de interesse: ${interests}

${historyContext}

Seu objetivo é analisar as conquistas e erros recorrentes dele e criar a PRÓXIMA TRILHA DE APRENDIZADO personalizada contendo exatamente 5 lições progressivas (Fase ${nextStartPhase} a ${nextEndPhase}).
As lições devem focar em áreas onde o usuário demonstrou erros, ou aumentar a complexidade em tópicos alinhados a seus interesses e objetivos.
Além disso, crie um nome marcante e motivador em Português do Brasil para esta nova trilha (ex: "Elevando a Comunicação Profissional" ou "Superando Erros Gramaticais Comuns").

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem qualquer markdown envolta (como \`\`\`json), seguindo exatamente o seguinte schema:
{
  "track_name": "Nome da Nova Trilha",
  "phases": [
    {
      "phase_number": número (de ${nextStartPhase} a ${nextEndPhase}),
      "title": "string (ex: Fase ${nextStartPhase}: Título da Lição)",
      "description": "string (descrição pedagógica em português)",
      "scenario_key": "string (mapear para: 'casual', 'interview', 'coffee', 'meeting')",
      "system_instructions": "string (instruções de roleplay em inglês para o tutor de voz, orientando-o a focar no nível '${level}', reforçar os tópicos de interesse e incentivar o usuário a corrigir os erros gramaticais detectados)"
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
            { role: "user", content: `Gere a próxima trilha (fases ${nextStartPhase} a ${nextEndPhase}) baseada no histórico de desempenho.` }
          ]
        })
      });

      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        let content = chatData.choices[0]?.message?.content || "";
        content = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

        const generatedData = JSON.parse(content);
        trackName = generatedData.track_name || trackName;
        const generatedList = generatedData.phases;

        if (Array.isArray(generatedList) && generatedList.length === 5) {
          pathFases = generatedList.map((item, idx) => ({
            user_id: userId,
            phase_number: item.phase_number || (nextStartPhase + idx),
            title: item.title,
            description: item.description,
            scenario_key: item.scenario_key || "casual",
            system_instructions: item.system_instructions,
            status: idx === 0 ? "unlocked" : "locked",
            score_needed: idx === 4 ? 75 : 70, // Última fase exige 75%
            track_name: trackName
          }));
        }
      }
    } catch (e) {
      console.error("Falha ao gerar próxima trilha com Gemini:", e);
      // Fallback
      trackName = `Aprofundamento de Conversação (Fases ${nextStartPhase}-${nextEndPhase})`;
      pathFases = Array.from({ length: 5 }).map((_, idx) => {
        const pNum = nextStartPhase + idx;
        return {
          user_id: userId,
          phase_number: pNum,
          title: `Fase ${pNum}: Prática de Diálogo Avançado ${idx + 1}`,
          description: `Reforce sua fluência conversando sobre tópicos práticos e expandindo seu vocabulário.`,
          scenario_key: idx % 2 === 0 ? "meeting" : "casual",
          system_instructions: `You are an conversational expert. Chat with the user at a ${level} level. Challenge them to elaborate.`,
          status: idx === 0 ? "unlocked" : "locked",
          score_needed: idx === 4 ? 75 : 70,
          track_name: trackName
        };
      });
    }
  }

  if (pathFases.length === 5) {
    const { error: insertError } = await supabase
      .from("fluenty_learning_paths")
      .insert(pathFases);
    if (insertError) {
      console.error("Erro ao inserir próxima trilha no Supabase:", insertError);
    }
  }

  return trackName;
}

// Endpoint do algoritmo de cálculo do Score de Fluência pós-sessão
export async function POST(req: NextRequest) {
  try {
    const { history, scenario, duration, pathId } = await req.json();

    if (!history || !Array.isArray(history) || history.length === 0) {
      return NextResponse.json(
        { error: "Histórico de conversa inválido ou vazio." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Extrai token de autorização JWT
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];
    let userId = null;

    if (token && supabaseUrl && supabaseKey) {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
        if (!userErr && user) {
          userId = user.id;
        }
      } catch (e) {
        console.error("Erro ao ler token JWT:", e);
      }
    }

    let parsedResult: any = null;

    // --- FALLBACK MOCKADO (Caso a API KEY não esteja configurada) ---
    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY não configurada. Usando análises mockadas.");
      
      // Gera notas intermediárias realistas e correções mockadas para teste
      parsedResult = {
        score_overall: 82,
        score_grammar: 85,
        score_vocabulary: 78,
        score_fluency: 83,
        corrections: [
          {
            original: "I have gone to the mall yesterday.",
            corrected: "I went to the mall yesterday.",
            explanation: "Quando especificamos um momento no passado ('yesterday'), usamos o Simple Past ('went') em vez do Present Perfect ('have gone')."
          },
          {
            original: "I work with technology since three years.",
            corrected: "I have been working in technology for three years.",
            explanation: "Para falar sobre ações que começaram no passado e continuam até hoje, usamos o Present Perfect Continuous ('have been working'). Também usamos 'for' em vez de 'since' para indicar duração de tempo."
          }
        ],
        vocabulary_improvements: [
          {
            word_used: "good",
            suggestions: ["rewarding", "exceptional", "noteworthy"],
            context: "No trecho: 'my work experience was good'"
          },
          {
            word_used: "very big",
            suggestions: ["huge", "massive", "immense"],
            context: "No trecho: 'we had a very big problem'"
          }
        ],
        highlights: "Você demonstrou excelente desenvoltura ao falar sobre seus projetos de tecnologia e sua velocidade de resposta foi ótima. Continue praticando para polir as preposições!",
        instagram_card_phrase: `Destravei meu inglês em conversação de ${scenario || "Negócios"} com 82% de fluência! ⚡`
      };
    } else {
      // --- FLUXO REAL COM OPENROUTER & LLM ---
      const fullTranscript = history
        .map((msg: { sender: string; text: string }) => `${msg.sender === "user" ? "USER" : "AI"}: ${msg.text}`)
        .join("\n");

      const systemPrompt = `Você é um avaliador de proficiência em inglês experiente e amigável.
Seu objetivo é analisar a transcrição de uma chamada de conversação entre o Usuário (USER) e a IA (AI) sob uma ótica de inglês nativo falado e fluidez prática.

ANALYSE:
1. Erros gramaticais, preposições e conjugações incorretas cometidas pelo USER.
2. Traduções literais do português ("Portinglês"): Identifique com precisão quando o usuário traduziu estruturas diretamente do português que não soam naturais ou estão erradas em inglês (ex: usar "I have 25 years" em vez de "I'm 25 years old", "take a coffee" em vez de "have/get a coffee", "I'm here for learn" em vez de "I'm here to learn", "near of my house" em vez de "near my house").
3. Falta de naturalidade (Phrasing Nativo): Identifique frases que estão gramaticalmente toleráveis, mas que um nativo não usaria no dia a dia, sugerindo expressões idiomáticas e colocações mais adequadas ao cenário. Explique isso de forma amigável.
4. Repetição excessiva de vocabulários básicos e sugira alternativas mais refinadas/nativas aplicadas ao contexto da fala (ex: em vez de usar "very good" toda hora, sugerir "exceptional", "rewarding", "outstanding").
5. A desenvoltura e fluidez (o usuário desenvolve frases completas e complexas ou responde apenas com monossílabos?).

REGRAS DE NOTA (0 a 100):
- 90-100: Fluência avançada. Pouquíssimos erros, vocabulário variado, frases longas e naturais.
- 75-89: Fluência intermediária alta. Comunica-se muito bem, comete alguns erros gramaticais menores, vocabulário adequado mas um pouco repetitivo.
- 50-74: Fluência intermediária básica. Consegue falar, mas depende de frases simples e comete erros frequentes de tempos verbais ou portinglês.
- Abaixo de 50: Iniciante. Respostas de uma ou duas palavras, muita dificuldade de formular estruturas completas.

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem qualquer tipo de markdown envolta (como \`\`\`json), seguindo exatamente o seguinte schema JSON:
{
  "score_overall": número (nota geral),
  "score_grammar": número (nota de gramática),
  "score_vocabulary": número (nota de vocabulário),
  "score_fluency": número (nota de fluidez),
  "corrections": [
    {
      "original": "frase errada do USER",
      "corrected": "frase correta sugerida",
      "explanation": "explicação curta e didática em Português do Brasil"
    }
  ],
  "vocabulary_improvements": [
    {
      "word_used": "palavra simples usada",
      "suggestions": ["lista", "de", "sinônimos", "avançados"],
      "context": "trecho onde foi usada"
    }
  ],
  "highlights": "texto de elogio amigável focando no que ele fez de bom primeiro, seguido de dicas gentis em Português do Brasil",
  "instagram_card_phrase": "frase de impacto curta e motivadora em Português do Brasil para colocar no story"
}

As explicações de correção e feedbacks devem ser escritas em Português do Brasil de forma clara, didática e motivadora.`;

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
            { role: "user", content: `Aqui está a transcrição da conversa de cenário "${scenario || "Casual"}":\n\n${fullTranscript}` }
          ]
        })
      });

      if (!chatResponse.ok) {
        const err = await chatResponse.text();
        console.error("Erro na Análise OpenRouter:", err);
        throw new Error(`Falha na análise da IA: ${chatResponse.statusText}`);
      }

      const chatData = await chatResponse.json();
      let content = chatData.choices[0]?.message?.content || "";
      content = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      parsedResult = JSON.parse(content);
    }

    // Salvar os dados analisados no Supabase
    const sessionId = await saveToSupabase(scenario, duration, history, parsedResult, userId, pathId);
    
    // --- LÓGICA DE PROGRESSÃO E DESBLOQUEIO DE FASES ---
    let phaseUnlocked = false;
    let trackCompleted = false;
    let newTrackName = "";
    let oldTrackName = "";

    if (userId && pathId && supabaseUrl && supabaseKey) {
      try {
        const { supabase } = await import("@/lib/supabase");

        // 1. Buscar a fase atual
        const { data: currentPhase } = await supabase
          .from("fluenty_learning_paths")
          .select("phase_number, score_needed, status, track_name")
          .eq("id", pathId)
          .single();

        if (currentPhase && currentPhase.status !== "completed") {
          const scoreNeeded = currentPhase.score_needed || 70;
          const scoreOverall = parsedResult.score_overall || 0;

          if (scoreOverall >= scoreNeeded) {
            oldTrackName = currentPhase.track_name || "Trilha de Aprendizado";

            // 2. Marcar a fase atual como completada
            await supabase
              .from("fluenty_learning_paths")
              .update({
                status: "completed",
                completed_at: new Date().toISOString()
              })
              .eq("id", pathId);

            // 3. Verificar se é fim de trilha (múltiplo de 5, ex: 5, 10, 15...)
            const currentPhaseNumber = currentPhase.phase_number;
            if (currentPhaseNumber % 5 === 0) {
              trackCompleted = true;
              newTrackName = await generateNextTrack(userId, currentPhaseNumber, oldTrackName);
            } else {
              // Desbloquear a próxima fase (phase_number + 1)
              const nextPhaseNumber = currentPhaseNumber + 1;
              const { error: unlockError } = await supabase
                .from("fluenty_learning_paths")
                .update({ status: "unlocked" })
                .eq("user_id", userId)
                .eq("phase_number", nextPhaseNumber);

              if (!unlockError) {
                phaseUnlocked = true;
              }
            }
          }
        }
      } catch (e) {
        console.error("Erro na progressão de fases:", e);
      }
    }

    const finalResult = { 
      ...parsedResult, 
      session_id: sessionId, 
      phase_unlocked: phaseUnlocked,
      track_completed: trackCompleted,
      new_track_name: newTrackName,
      old_track_name: oldTrackName
    };
    
    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error("Erro na API Route /api/analyze:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao processar análise" },
      { status: 500 }
    );
  }
}
