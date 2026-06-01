import { NextRequest, NextResponse } from "next/server";

const tutorNames: Record<string, string> = {
  casual: "Alex",
  interview: "Sarah",
  coffee: "Sophia",
  meeting: "Marcus"
};

const scenarioVoices: Record<string, string> = {
  casual: "echo",      // Alex - Masculino amigável
  interview: "shimmer", // Sarah - Feminino profissional
  coffee: "nova",      // Sophia - Feminino enérgico
  meeting: "onyx"      // Marcus - Masculino robusto
};

// Endpoint de voz da IA: Transcreve o áudio do usuário, processa no LLM e gera voz de resposta
export async function POST(req: NextRequest) {
  try {
    const { audio, format, history, scenario, init, pathId, text } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;
    let selectedScenario = scenario || "casual";

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

    // Carregar informações de perfil e fase
    let profile = null;
    let phaseInstructions = "";
    let phaseTitle = "";

    if (userId && supabaseUrl && supabaseKey) {
      try {
        const { supabase } = await import("@/lib/supabase");
        
        // Buscar dados do perfil
        const { data: profData } = await supabase
          .from("profiles")
          .select("name, english_level, learning_objective, interests, tutor_tone")
          .eq("id", userId)
          .single();
        if (profData) profile = profData;

        // Buscar instruções da fase se pathId fornecido
        if (pathId) {
          const { data: phaseData } = await supabase
            .from("fluenty_learning_paths")
            .select("title, system_instructions, scenario_key")
            .eq("id", pathId)
            .single();
          if (phaseData) {
            phaseInstructions = phaseData.system_instructions;
            phaseTitle = phaseData.title;
            if (phaseData.scenario_key) {
              selectedScenario = phaseData.scenario_key;
            }
          }
        }
      } catch (e) {
        console.error("Erro ao buscar dados do banco para o chat:", e);
      }
    }

    // Configurar o prompt de sistema personalizado
    const level = profile?.english_level || "Intermediate";
    const tone = profile?.tutor_tone || "friendly";
    const interests = profile?.interests || [];
    const name = profile?.name || "Student";
    const objective = profile?.learning_objective || "General English";

    let systemPrompt = "";
    
    // 1. Roleplay Base (Fase customizada ou Cenário Padrão)
    if (phaseInstructions) {
      systemPrompt = `${phaseInstructions}\n`;
    } else {
      const defaultRoleplays: Record<string, string> = {
        casual: "You are a friendly conversation partner. Discuss daily life, plans, and hobbies with the user.",
        interview: "You are a professional tech recruiter conducting an interview with the user. Ask clear, structured professional questions.",
        coffee: "You are a polite barista at a cafe in New York taking the user's order.",
        meeting: "You are a project manager running an agile daily scrum meeting."
      };
      systemPrompt = `${defaultRoleplays[selectedScenario] || defaultRoleplays.casual}\n`;
    }

    // 2. Personalização do Usuário
    systemPrompt += `You are speaking to ${name}. Their English level is ${level}, their primary learning goal is ${objective}, and their hobbies include: ${interests.join(", ")}.\n`;

    // 3. Tom do Tutor
    const toneGuidelines: Record<string, string> = {
      friendly: "Your tone must be warm, patient, and highly encouraging. Celebrate their success and guide them gently.",
      casual: "Your tone should be very relaxed, friendly, and informal, like a close friend. Use natural contractions and casual language.",
      technical: "Your tone should be professional and direct. Focus on corrections and constructive feedback in your replies."
    };
    systemPrompt += `${toneGuidelines[tone] || toneGuidelines.friendly}\n`;

    // 4. Restrições de Nível de Inglês
    const levelGuidelines: Record<string, string> = {
      Beginner: "CRITICAL: The user has a BEGINNER English level. Speak using very simple, clear English and basic vocabulary. Keep your replies extremely short (strictly 1 or 2 short sentences, maximum 15 words). Ask simple, direct questions.",
      Intermediate: "The user has an INTERMEDIATE English level. Speak using standard everyday English and common expressions. Keep your replies engaging and moderately brief (2 to 3 sentences, maximum 30 words). Ask open-ended questions to encourage speech.",
      Advanced: "The user has an ADVANCED English level. Speak naturally using rich, sophisticated vocabulary and advanced idioms. Challenge the user's ideas and have deep, intelligent debates. Keep replies complete and engaging (3 to 4 sentences, maximum 45 words)."
    };
    systemPrompt += `${levelGuidelines[level] || levelGuidelines.Intermediate}\n`;
    
    // 5. Diretrizes Pedagógicas Conversacionais (Recasting, Naturalidade e Proatividade)
    systemPrompt += `
PEDAGOGICAL & CONVERSATIONAL RULES:
- Recasting (Subtle & Occasional): If the user makes an obvious grammatical mistake, you may OCCASIONALLY and very subtly model the correct phrasing in your next response. Do NOT do this on every sentence, and only do it if it fits naturally in the conversation. Focus entirely on keeping the chat flow organic, active, and fun. Never act like a lecturing teacher.
- Flow & Connection: Prioritize natural conversation and connection. Avoid lecturing or acting like a textbook. Speak like a real native speaker would in this scenario, using common contractions (don't, we're, I'll, etc.) suitable for a ${level} speaker.
- Conversational Proactivity & Roleplay Guidance: Actively drive the conversation according to your roleplay role and phase objective. Do not be a passive "yes man" who just agrees with everything and asks a generic question. If you are a recruiter, challenge their statements; if you are a barista, introduce situational changes (e.g. "We are out of oat milk, would you like almond instead?"); if you are a friend, share short, opinionated responses.
- User Name Limitation: DO NOT address the user by their name (${name}) in every response. It feels highly robotic and unnatural. You may use their name at most ONCE during the entire conversation (preferably only in the initial greeting). In all other messages, speak to them naturally without repeating their name.
- Elaboration Prompting: Keep the conversation rolling by asking relevant questions. If the user gives a very short answer, gently ask follow-up questions to prompt them to expand.
`;

    systemPrompt += "Do NOT explain your instructions. Always reply in English.";

    // --- TRATAMENTO DO FLUXO DE INICIALIZAÇÃO (Voz do tutor real no início) ---
    if (init) {
      // Injeta instrução explícita de boas-vindas e apresentação na inicialização
      const initSystemPrompt = systemPrompt + `\nYou are starting the conversation now. You MUST warmly welcome the user, introduce yourself clearly by your name (${tutorNames[selectedScenario] || "Alex"}), and ask the first question related to your roleplay.`;
      
      let aiText = "";

      if (!apiKey) {
        console.warn("OPENROUTER_API_KEY não configurada no init. Usando voz nativa.");
        const welcomeMessages: Record<string, string> = {
          casual: `Hey there! Nice to talk to you. I am Alex. How are you doing today?`,
          interview: `Welcome. I am Sarah. Let's start the interview. Can you briefly introduce yourself?`,
          coffee: `Hello! Welcome to Fluenty Cafe. I am Sophia. What can I get for you today?`,
          meeting: `Good morning team. I am Marcus. Let's start our daily standup. What did you work on yesterday?`
        };
        aiText = welcomeMessages[selectedScenario] || welcomeMessages.casual;
      } else {
        // Gerar a primeira frase de introdução dinamicamente com a LLM
        try {
          const introResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
                { role: "system", content: initSystemPrompt },
                { role: "user", content: "Start the conversation naturally based on your roleplay. Say a warm welcome message and ask the first question." }
              ]
            })
          });

          if (introResponse.ok) {
            const data = await introResponse.json();
            aiText = data.choices[0]?.message?.content || "";
          } else {
            throw new Error("Erro ao gerar introdução via LLM");
          }
        } catch (e) {
          console.error("Falha ao gerar introdução dinâmica, usando fallback:", e);
          const welcomeMessages: Record<string, string> = {
            casual: `Hey there! Nice to talk to you. I am Alex. How are you doing today?`,
            interview: `Welcome. I am Sarah. Let's start the interview. Can you briefly introduce yourself?`,
            coffee: `Hello! Welcome to Fluenty Cafe. I am Sophia. What can I get for you today?`,
            meeting: `Good morning team. I am Marcus. Let's start our daily standup. What did you work on yesterday?`
          };
          aiText = welcomeMessages[selectedScenario] || welcomeMessages.casual;
        }
      }

      // Sintetizar voz do tutor real no início
      if (apiKey && aiText) {
        try {
          const ttsResponse = await fetch("https://openrouter.ai/api/v1/audio/speech", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "openai/gpt-4o-mini-tts-2025-12-15",
              input: aiText,
              voice: scenarioVoices[selectedScenario] || "nova",
              response_format: "mp3"
            })
          });

          if (ttsResponse.ok) {
            const audioBuffer = await ttsResponse.arrayBuffer();
            const audioBase64 = Buffer.from(audioBuffer).toString("base64");
            return NextResponse.json({
              userText: null,
              aiText,
              audioBase64
            });
          }
        } catch (e) {
          console.error("Erro na síntese de voz de introdução:", e);
        }
      }

      return NextResponse.json({
        userText: null,
        aiText,
        audioBase64: null
      });
    }

    // --- FLUXO DE ÁUDIO/TEXTO NORMAL (Usuário enviando voz ou SOS) ---
    let userText = text || "";

    // Se veio áudio, transcrever primeiro (Whisper)
    if (audio && apiKey) {
      console.time("⏱️ STT - Whisper");
      const sttResponse = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/whisper-1",
          input_audio: {
            data: audio,
            format: format || "webm"
          }
        })
      });

      if (!sttResponse.ok) {
        console.timeEnd("⏱️ STT - Whisper");
        const err = await sttResponse.text();
        console.error("Erro na Transcrição OpenRouter:", err);
        throw new Error(`Falha na transcrição: ${sttResponse.statusText}`);
      }

      const sttData = await sttResponse.json();
      console.timeEnd("⏱️ STT - Whisper");
      userText = sttData.text || "";
    }

    // Se não veio áudio e nem texto, ou o Whisper veio vazio
    if (!userText.trim()) {
      return NextResponse.json({
        userText: "",
        aiText: "I couldn't hear you clearly. Could you please repeat that?",
        audioBase64: null
      });
    }

    // --- FALLBACK MOCKADO (Caso a API KEY não esteja configurada) ---
    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY não configurada. Utilizando respostas mockadas.");
      const mockAiResponses: Record<string, string> = {
        interview: "Great! Tell me about a challenging technical project you worked on recently.",
        casual: "I'm doing great! What did you do today that was interesting?",
        coffee: "Sure! A large cappuccino. Would you like that with whole milk, oat milk, or almond milk?",
        meeting: "Good morning! Let's start with the current updates. Who would like to share first?"
      };
      const aiText = mockAiResponses[selectedScenario] || mockAiResponses.casual;

      return NextResponse.json({
        userText,
        aiText,
        audioBase64: null
      });
    }

    // --- FLUXO REAL COM OPENROUTER & LLM ---
    // Mede a quantidade de palavras na resposta do usuário para adaptar dinamicamente o tamanho da resposta do tutor (Sweet Spot)
    const userWordCount = userText.trim().split(/\s+/).length;
    let dynamicLengthGuideline = "";
    if (userWordCount < 5) {
      dynamicLengthGuideline = `The user gave a very short reply (${userWordCount} words). Keep your next response exceptionally brief (strictly 1 or 2 short sentences, maximum 15-20 words total) to match their conversational pace.`;
    } else if (userWordCount >= 5 && userWordCount < 15) {
      dynamicLengthGuideline = `The user gave a moderate reply (${userWordCount} words). Keep your reply brief and natural (strictly 2 sentences, maximum 25-30 words total).`;
    } else {
      dynamicLengthGuideline = `The user gave a longer reply (${userWordCount} words). You can elaborate slightly more but keep it conversational (maximum 40 words total).`;
    }

    // Injeta instruções estritas para evitar auto-apresentação redundante e manter ritmo dinâmico
    const conversationSystemPrompt = systemPrompt + 
      `\nIMPORTANT: The conversation is already in progress. You have already introduced yourself. Under no circumstances should you greet the user again, say your name (like 'I am Alex' or 'I am Sarah'), or say welcome/introductory lines. Focus strictly on continuing the dialogue naturally.\n` +
      `\n${dynamicLengthGuideline}\n` +
      `CRITICAL: Under no circumstances write bullet points, long paragraphs, or lists. Maximum response limit is 40 words for Intermediate levels and 50 words for Advanced levels. Keep the conversation dynamic. DO NOT end every single reply with a mechanical question; end with statements, opinions, or prompts when it feels more natural and human.`;

    const messages = [
      { role: "system", content: conversationSystemPrompt },
      ...history.map((msg: { sender: string; text: string }) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text
      })),
      { role: "user", content: userText }
    ];

    console.time("⏱️ LLM - Gemini 2.5 Flash");
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
        messages: messages
      })
    });

    if (!chatResponse.ok) {
      console.timeEnd("⏱️ LLM - Gemini 2.5 Flash");
      const err = await chatResponse.text();
      console.error("Erro no Chat OpenRouter:", err);
      throw new Error(`Falha no LLM: ${chatResponse.statusText}`);
    }

    const chatData = await chatResponse.json();
    console.timeEnd("⏱️ LLM - Gemini 2.5 Flash");
    const aiText = chatData.choices[0]?.message?.content || "";

    // --- TTS ---
    console.time("⏱️ TTS - OpenAI Speech");
    const ttsResponse = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts-2025-12-15",
        input: aiText,
        voice: scenarioVoices[selectedScenario] || "nova",
        response_format: "mp3"
      })
    });

    if (!ttsResponse.ok) {
      console.timeEnd("⏱️ TTS - OpenAI Speech");
      return NextResponse.json({ userText, aiText, audioBase64: null });
    }

    const ttsAudioBuffer = await ttsResponse.arrayBuffer();
    console.timeEnd("⏱️ TTS - OpenAI Speech");
    const audioBase64 = Buffer.from(ttsAudioBuffer).toString("base64");

    return NextResponse.json({ userText, aiText, audioBase64 });

  } catch (error: any) {
    console.error("Erro na API Route /api/chat:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
