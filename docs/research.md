# Pesquisa de Mercado, Persona e Análise Tecnológica: Fluenty

Este documento reúne a base estratégica e técnica do **Fluenty**, consolidando a concorrência, o perfil do cliente ideal (ICP), a identidade de marca sugerida e a viabilidade financeira da infraestrutura de voz por IA.

---

## 1. Mapeamento da Persona (ICP - Ideal Customer Profile)

Para o lançamento do Fluenty, focaremos em um nicho de alto poder aquisitivo e que tem uma dor latente e mensurável no Brasil.

### O Profissional de Tecnologia (Devs, Designers, Product Managers)
*   **A Dor Crítica:** Ele lê e entende inglês perfeitamente (consome documentações, cursos e tutoriais internacionais diariamente), escreve bem, mas **trava e sente pânico na hora de falar** em reuniões diárias (dailies) ou processos seletivos para empresas do exterior.
*   **O Motivo Financeiro:** Dominar a fala em inglês é o maior multiplicador salarial dessa categoria. Trabalhar para fora paga de 3x a 5x mais do que no mercado nacional. Eles enxergam uma assinatura de R$ 49/mês como um investimento de baixíssimo custo para destravar carreiras de R$ 15k-30k/mês.
*   **O Comportamento Social:** Devs adoram o visual do GitHub (os "quadradinhos verdes" de contribuição). O heatmap de consistência do Fluenty toca direto no ego profissional deles. Eles sentem orgulho de compartilhar seu progresso de capacitação profissional nos Stories do Instagram ou no LinkedIn.

---

## 2. Análise da Concorrência

Como o Fluenty se diferencia dos players estabelecidos no mercado?

| Concorrente | O que faz bem? | Onde falha (Nossa Oportunidade)? | Diferencial do Fluenty |
| :--- | :--- | :--- | :--- |
| **Loora** | Focado em inglês profissional com feedback gramatical. | Interface fria e corporativa tradicional, sem gamificação visceral. Churn alto. | Estética premium e minimalista, desafios diários, e forte apelo visual/instagramável. |
| **Talkpal** | Suporta dezenas de idiomas com modos divertidos (debates, roleplays). | App muito amplo e infantilizado, sem foco claro em quem quer destravar para negócios. | Posicionamento focado em conversação de carreira (English for Tech/Business) e atrito zero. |
| **Elsa Speak** | Excelente em analisar fonemas e corrigir pronúncia específica. | Interface entediante baseada em repetição de sílabas. Não treina conversação espontânea. | Foco na fala real e fluida ("Speak Up!"). O erro é parte do processo; o foco é a comunicação. |

---

## 3. Análise Financeira da Stack de Voz (Custo vs. Latência)

O principal gargalo de Micro-SaaS de voz é o custo das APIs de inteligência artificial. Comparamos as duas principais arquiteturas para o MVP do Fluenty:

### Cenário A: API de Voz em Tempo Real (OpenAI Realtime API)
*   **Como funciona:** O app envia o stream de áudio do usuário via WebSocket e recebe o áudio da IA diretamente do modelo GPT-4o Realtime.
*   **Latência:** Extraordinária (< 400ms). Conversa extremamente natural.
*   **Custo:** Aprox. $0.06/minuto (entrada) e $0.24/minuto (saída).
    *   *Custo por sessão de 15 min:* **~$1.80 USD (~R$ 10,00)**.
    *   *Inviabilidade:* Se o usuário fizer 10 sessões no mês, o custo de API empata com a assinatura mensal de R$ 49. **Inviável para modelo de assinatura ilimitada.**

### Cenário B: A "Golden Stack" Híbrida (Deepgram + LLM + Cartesia)
*   **Como funciona:**
    1.  **Transcrição (STT):** O áudio do usuário é enviado em blocos rápidos para o **Deepgram Nova-2** (latência de 150ms).
    2.  **Cérebro (LLM):** O texto transcrito vai para o **Gemini 1.5 Flash** (rápido e extremamente barato).
    3.  **Voz (TTS):** O texto de resposta é sintetizado em áudio ultra-realista pelo **Cartesia.ai (Sonic)** (latência de 90ms).
*   **Latência:** Muito baixa (600ms a 900ms). Perfeitamente aceitável e fluida.
*   **Custo:**
    *   Deepgram: $0.0043 por minuto.
    *   Gemini 1.5 Flash: $0.075 por 1 milhão de tokens (quase grátis).
    *   Cartesia.ai: $0.05 por 1 milhão de caracteres.
    *   *Custo por sessão de 15 min:* **Menos de $0.03 USD (~R$ 0,15)**.
    *   *Viabilidade:* Com custo de R$ 0,15 por sessão de 15 minutos, um usuário que pratica todos os dias custa apenas R$ 4,50/mês em infraestrutura. **Altamente lucrativo para um plano de R$ 49/mês.**

> [!TIP]
> **Decisão Tecnológica:** Para o MVP do Fluenty, adotaremos a **Golden Stack Híbrida (Deepgram + Gemini + Cartesia)** para garantir margens de lucro saudáveis sem comprometer a fluidez da conversa.

---

## 4. Branding & Conceito Visual do Logotipo

O design de marca do Fluenty deve transmitir sofisticação minimalista com uma injeção de energia de atitude ("Speak Up!").

### O Logotipo (Conceito Visual)
*   **Símbolo principal:** A letra **F** de Fluenty estilizada. Ela é formada por 4 barras verticais arredondadas de alturas diferentes que, juntas, simulam uma **onda sonora de áudio** em movimento de crescimento (da esquerda para a direita).
*   **O Balão de Fala Dinâmico:** Um balão de chat minimalista onde o canto superior direito se alonga em diagonal para cima, simulando uma seta ou um raio (símbolo de aceleração, sprint e evolução de performance).

```
   ||  ||
   ||  ||  ||
   ||  ||  ||  ||
   [ Onda Sonora em F ]
```

### A Paleta de Cores
*   **Obsidian Black (`#0B0B0C`):** O preto fosco profundo para fundos de telas. Passa sofisticação e reduz a fadiga visual.
*   **Acid Lime (`#CCFF00`):** Verde-limão neon ácido. Utilizado cirurgicamente nos botões de ação ("Speak Up!"), marcas de streaks ativos e destaques de conquistas. Representa energia, atitude e modernidade.
*   **Muted Slate (`#2A2B2E`):** Cinza médio neutro para bordas finas, botões secundários e containers translúcidos (efeito vidro).
