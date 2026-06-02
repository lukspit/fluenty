const { execSync } = require('child_process');
const path = require('path');

const lessons = [
  {
    num: 1,
    title: "Fluenty - Aula 1: O Paradoxo",
    file: "aula_1_paradoxo.md",
    focus: "Gere um Cinematic Video Overview (vídeo resumo explicativo) em Português do Brasil de forma extremamente dinâmica e inteligente, focado em profissionais que entendem inglês mas travam na hora de falar. O vídeo deve focar exclusivamente no 'Paradoxo do Inglês Passivo' e na diferença científica de como o cérebro processa a leitura comparado com a fala em tempo real. Use um tom provocativo e científico, explicando por que tentar traduzir mentalmente gera o 'branco'. Termine instigando o espectador a assistir à próxima aula sobre as falhas das soluções de mercado."
  },
  {
    num: 2,
    title: "Fluenty - Aula 2: A Ilusão das Soluções Tradicionais",
    file: "aula_2_ilusao.md",
    focus: "Gere um Cinematic Video Overview (vídeo resumo explicativo) em Português do Brasil com tom dinâmico e provocativo. O foco deve ser desmascarar as soluções tradicionais de inglês. Explique de forma muito clara por que aplicativos de joguinhos e decoreba de gramática são uma ilusão que não treina a fala ativa. Mostre como o cérebro fica bom em preencher lacunas no app, mas continua travando ao falar com nativos. Termine direcionando o espectador para a próxima aula sobre o método moderno de Roleplay com IA."
  },
  {
    num: 3,
    title: "Fluenty - Aula 3: O Método de Roleplay com IA",
    file: "aula_3_metodo.md",
    focus: "Gere um Cinematic Video Overview (vídeo resumo explicativo) em Português do Brasil com tom inovador, prático e inspirador. O foco deve ser apresentar o Método do Roleplay Conversacional com IA. Explique as três chaves: 1) Simulação de contextos reais de carreira (como Daily Scrum), 2) Técnica de Recasting (modelagem de correção natural sem interrupção), e 3) Ambiente livre de julgamento para errar sem vergonha. Use transições fluidas e tom profissional moderno. Termine direcionando para a jornada prática na aula final."
  },
  {
    num: 4,
    title: "Fluenty - Aula 4: O Próximo Passo Prático",
    file: "aula_4_jornada.md",
    focus: "Gere um Cinematic Video Overview (vídeo resumo explicativo) em Português do Brasil com tom empolgante, direto e de fechamento de vendas. O foco deve ser a transição para a ação prática na plataforma Fluenty. Explique como funciona o onboarding (escolha de nível, digitação do cargo/profissão para gerar a trilha de 5 fases baseada no trabalho real, e escolha do tutor virtual). Faça uma chamada de ação (CTA) muito forte e irresistível para o espectador clicar no botão e iniciar o treinamento de voz agora mesmo no Fluenty."
  }
];

async function run() {
  console.log("=== INICIANDO INTEGRAÇÃO E CRIAÇÃO DAS AULAS NO NOTEBOOKLM ===\n");

  for (const lesson of lessons) {
    console.log(`\n--- Processando Aula ${lesson.num}: ${lesson.title} ---`);
    
    // 1. Criar o Notebook
    console.log(`Criando notebook "${lesson.title}"...`);
    const createOut = execSync(`nlm notebook create "${lesson.title}"`).toString();
    const idMatch = createOut.match(/ID:\s*([a-f0-9-]+)/i);
    if (!idMatch) {
      console.error(`Erro ao obter ID do notebook para aula ${lesson.num}. Retorno:`, createOut);
      continue;
    }
    const notebookId = idMatch[1];
    console.log(`✓ Notebook criado! ID: ${notebookId}`);

    // 2. Adicionar arquivo de fonte
    const filePath = path.join(__dirname, lesson.file);
    console.log(`Adicionando fonte "${lesson.file}"...`);
    try {
      execSync(`nlm source add "${notebookId}" --file "${filePath}" --wait`, { stdio: 'inherit' });
      console.log(`✓ Fonte adicionada e processada com sucesso!`);
    } catch (err) {
      console.error(`Erro ao adicionar fonte para aula ${lesson.num}:`, err.message);
      continue;
    }

    // 3. Disparar a geração do vídeo cinemático
    console.log(`Disparando geração do vídeo cinemático...`);
    try {
      const focusEscaped = lesson.focus.replace(/"/g, '\\"');
      const videoOut = execSync(`nlm video create "${notebookId}" --format cinematic --language pt-BR --focus "${focusEscaped}" -y`).toString();
      const artMatch = videoOut.match(/Artifact ID:\s*([a-f0-9-]+)/i);
      if (artMatch) {
        console.log(`✓ Geração do vídeo iniciada! Artifact ID: ${artMatch[1]}`);
      } else {
        console.log(`✓ Geração do vídeo iniciada! Retorno:`, videoOut.trim());
      }
    } catch (err) {
      console.error(`Erro ao iniciar geração do vídeo para aula ${lesson.num}:`, err.message);
    }
  }

  console.log("\n=== PROCESSO DE CRIAÇÃO CONCLUÍDO COM SUCESSO! ===");
}

run();
