import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // --- SE NÃO CONFIGURADO: RETORNA DADOS DE HISTÓRICO MOCKADO PREMIUM ---
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase não configurado. Retornando dados mockados de progresso.");
      return NextResponse.json({
        has_supabase: false,
        stats: {
          total_sessions: 6,
          total_duration_minutes: 58,
          average_score: 80,
          streak: 12
        },
        evolution: [
          { date: "24/05", score: 72 },
          { date: "25/05", score: 75 },
          { date: "26/05", score: 78 },
          { date: "27/05", score: 80 },
          { date: "28/05", score: 85 },
          { date: "29/05", score: 82 }
        ],
        common_errors: [
          { original: "I work with technology since three years.", corrected: "I have been working in technology for three years.", count: 3 },
          { original: "I have gone to the mall yesterday.", corrected: "I went to the mall yesterday.", count: 2 },
          { original: "He don't like coffee.", corrected: "He doesn't like coffee.", count: 2 }
        ],
        history: [
          {
            id: "mock-1",
            scenario: "casual",
            duration_seconds: 600,
            score_overall: 82,
            score_grammar: 85,
            score_vocabulary: 78,
            score_fluency: 83,
            highlights: "Você demonstrou excelente desenvoltura ao falar sobre seus projetos de tecnologia e sua velocidade de resposta foi ótima. Continue praticando para polir as preposições!",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 horas atrás
            corrections: [
              {
                original: "I have gone to the mall yesterday.",
                corrected: "I went to the mall yesterday.",
                explanation: "Quando especificamos um momento no passado ('yesterday'), usamos o Simple Past ('went') in vez do Present Perfect ('have gone')."
              },
              {
                original: "I work with technology since three years.",
                corrected: "I have been working in technology for three years.",
                explanation: "Para falar sobre ações que começaram no passado e continuam até hoje, usamos o Present Perfect Continuous ('have been working'). Também usamos 'for' em vez de 'since' para indicar duração de tempo."
              }
            ],
            vocabulary_improvements: [
              { word_used: "good", suggestions: ["rewarding", "exceptional"], context: "my work experience was good" },
              { word_used: "very big", suggestions: ["huge", "massive"], context: "we had a very big problem" }
            ]
          },
          {
            id: "mock-2",
            scenario: "interview",
            duration_seconds: 900,
            score_overall: 85,
            score_grammar: 88,
            score_vocabulary: 82,
            score_fluency: 85,
            highlights: "Ótima escolha vocabular técnica durante a simulação da entrevista. O uso de termos do Scrum foi muito natural.",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
            corrections: [
              {
                original: "He don't like coffee.",
                corrected: "He doesn't like coffee.",
                explanation: "Para a terceira pessoa do singular (he, she, it) no presente simples negativo, usamos a contração 'doesn't' em vez de 'don't'."
              }
            ],
            vocabulary_improvements: [
              { word_used: "important", suggestions: ["crucial", "fundamental"], context: "this feature is very important" }
            ]
          },
          {
            id: "mock-3",
            scenario: "coffee",
            duration_seconds: 300,
            score_overall: 80,
            score_grammar: 78,
            score_vocabulary: 80,
            score_fluency: 82,
            highlights: "Muito bom ao interagir pedindo comida. Mostrou familiaridade com a cultura local de gorjetas e pedidos de viagem.",
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 dias atrás
            corrections: [],
            vocabulary_improvements: []
          }
        ]
      });
    }

    // --- CASO TENHA SUPABASE: BUSCAR DO BANCO ---
    const { supabase } = await import("@/lib/supabase");

    let userId = null;
    let userStreak = 12; // fallback decorativo se der erro

    if (token) {
      const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
      if (!userErr && user) {
        userId = user.id;

        // Busca o streak da tabela profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("streak")
          .eq("id", userId)
          .single();
        if (profile) {
          userStreak = profile.streak;
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Não autorizado. Token de sessão inválido." }, { status: 401 });
    }

    // 1. Buscar todas as sessões do usuário
    const { data: sessions, error: sessionsError } = await supabase
      .from("fluenty_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (sessionsError) throw sessionsError;

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        has_supabase: true,
        stats: {
          total_sessions: 0,
          total_duration_minutes: 0,
          average_score: 0,
          streak: 12
        },
        evolution: [],
        common_errors: [],
        history: []
      });
    }

    // Calcular estatísticas
    const total_sessions = sessions.length;
    const total_seconds = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
    const total_duration_minutes = Math.round(total_seconds / 60);
    const sum_scores = sessions.reduce((acc, s) => acc + (s.score_overall || 0), 0);
    const average_score = Math.round(sum_scores / total_sessions);

    // Mapear evolução para o gráfico (pega até as últimas 8 sessões em ordem cronológica ascendente)
    const evolution = [...sessions]
      .slice(0, 8)
      .reverse()
      .map(s => {
        const dateObj = new Date(s.created_at);
        const day = dateObj.getDate().toString().padStart(2, "0");
        const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
        return {
          date: `${day}/${month}`,
          score: s.score_overall
        };
      });

    // Buscar correções e vocabulário para cada sessão para montar o histórico completo
    const sessionIds = sessions.map(s => s.id);

    const { data: corrections, error: corrError } = await supabase
      .from("fluenty_corrections")
      .select("*")
      .in("session_id", sessionIds);

    const { data: vocabImprovements, error: vocabError } = await supabase
      .from("fluenty_vocabulary_improvements")
      .select("*")
      .in("session_id", sessionIds);

    if (corrError) throw corrError;
    if (vocabError) throw vocabError;

    // Agrupar erros comuns (mais frequentes)
    const errorCounts: Record<string, { original: string; corrected: string; count: number }> = {};
    corrections?.forEach(c => {
      const key = `${c.original.trim()}->${c.corrected.trim()}`;
      if (errorCounts[key]) {
        errorCounts[key].count++;
      } else {
        errorCounts[key] = {
          original: c.original,
          corrected: c.corrected,
          count: 1
        };
      }
    });
    const common_errors = Object.values(errorCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    // Montar o histórico final com as sub-tabelas acopladas
    const history = sessions.map(s => {
      return {
        ...s,
        corrections: corrections?.filter(c => c.session_id === s.id) || [],
        vocabulary_improvements: vocabImprovements?.filter(v => v.session_id === s.id) || []
      };
    });

    return NextResponse.json({
      has_supabase: true,
      stats: {
        total_sessions,
        total_duration_minutes,
        average_score,
        streak: userStreak
      },
      evolution,
      common_errors,
      history
    });

  } catch (error: any) {
    console.error("Erro na API Route /api/history:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar histórico" },
      { status: 500 }
    );
  }
}
