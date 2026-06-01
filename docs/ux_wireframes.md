# Fluxo de Telas & Wireframes (UX): Fluenty

Este documento descreve a arquitetura de informação, o fluxo de navegação e o layout conceitual (wireframe) das três telas principais do **Fluenty**.

---

## 1. Mapa de Navegação (Fluxo Principal)

```
[ Tela 1: Dashboard ] 
        |
        +---> (Clique em "Speak Up!" ou Cenário) ---> [ Tela 2: Conversação (Voz) ]
                                                               |
  [ Tela 3: Relatório ] <--- (Clique em "Desligar") <----------+
        |
        +---> (Clique em "Compartilhar") ---> [ Modal: Editor de Card Stories ]
```

---

## 2. Especificação e Layout das Telas

### Tela 1: Dashboard (A Home do Hábito)
O foco desta tela é motivar o usuário a manter a consistência diária e iniciar a prática rapidamente.

```
+-------------------------------------------------------------+
|  [Logo: Fluenty]                                     🔥 12  |
+-------------------------------------------------------------+
|                                                             |
|  [ Seu Heatmap de Prática ]                                 |
|  +-------------------------------------------------------+  |
|  |  [ ][x][ ][ ][x][x][x]  (Estilo GitHub Contributions) |  |
|  +-------------------------------------------------------+  |
|  "Você está a 3 dias de bater o seu recorde! Continue."     |
|                                                             |
|                   +-----------------+                       |
|                   |   SPEAK UP! ⚡  |                       |  <-- Botão Pulsante (Acid Lime)
|                   +-----------------+                       |
|                                                             |
|  SELECIONE UM CENÁRIO:                                      |
|  +---------------------------+  +------------------------+  |
|  | 💬 Casual Chat            |  | 💼 Job Interview       |  |  <-- Cards horizontais
|  | Conversa livre e diária   |  | Simule uma entrevista  |  |      estilo Glassmorphic
|  +---------------------------+  +------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

*   **Comportamento:** O botão principal "Speak Up!" inicia um cenário livre (Casual Chat). Os cards abaixo permitem escolher cenários temáticos.
*   **Aparência:** Tons escuros foscos (Obsidian Black) com o botão central e o streak no verde-neon (Acid Lime).

---

### Tela 2: Conversação de Voz (Call Screen)
Uma interface imersiva, clean e livre de distrações, projetada para acalmar a ansiedade de falar em outro idioma.

```
+-------------------------------------------------------------+
|  [Cenário: Job Interview]                           14:02   |
+-------------------------------------------------------------+
|                                                             |
|                                                             |
|                                                             |
|                     (((( 波 ))))                            |  <-- Animação de Onda Sonora
|                                                             |      (Reage ao áudio do usuário e da IA)
|                                                             |
|                                                             |
|                                                             |
|  [ Legenda Opcional: "How are you doing today, Lucas?" ]    |  <-- Texto secundário na base
|                                                             |
|         +-----+        +--------+        +-----+            |
|         | SOS |        | (Fone) |        | [T] |            |  <-- Controles flutuantes
|         +-----+        +--------+        +-----+            |
|       Ajuda de Frase    Desligar        Legenda             |
|                                                             |
+-------------------------------------------------------------+
```

*   **SOS Assist (Ajuda):** Se o usuário travar por 5 segundos sem falar, a tela brilha sutilmente e o botão SOS pisca. Ao clicar, a IA sugere 3 formas possíveis de responder à última pergunta.
*   **Ondas Sonoras:** Linhas de áudio dinâmicas em CSS que mudam de cor/tamanho (Verde para quando o usuário fala, Cinza quando a IA fala).

---

### Tela 3: Relatório de Performance (Result Screen)
A tela onde o usuário recebe a validação do seu progresso e se prepara para espalhar a marca organicamente.

```
+-------------------------------------------------------------+
| [x] Fechar                                                  |
+-------------------------------------------------------------+
|                                                             |
|                    +-------------+                          |
|                    |     87%     |                          |  <-- Score Circular
|                    +-------------+                          |
|                     Fluência Geral                          |
|                                                             |
|   ESTATÍSTICAS:                                             |
|   - ⏱️ Tempo: 15 min   - 🗣️ Pronúncia: 90%   - 🔥 Streak +1 |
|                                                             |
|   [ ABA: FEEDBACK ]   [ ABA: VOCABULÁRIO ]                  |
|   +-----------------------------------------------------+   |
|   | ❌ "I have gone to the mall yesterday."              |   |  <-- Lista interativa de
|   | ✅ "I went to the mall yesterday."                  |   |      correções e sugestões
|   +-----------------------------------------------------+   |
|                                                             |
|                 +----------------------------+              |
|                 | COMPARTILHAR CONQUISTA 📤  |              |  <-- Abre editor do Card Stories
|                 +----------------------------+              |
|                                                             |
+-------------------------------------------------------------+
```

*   **Editor de Card (Stories 9:16):** Um modal sobreposto onde o usuário escolhe a paleta de cores (ex: Aurora Neon, Editorial Minimalist ou Obsidian Dark) e baixa a imagem ou abre o fluxo nativo de compartilhamento do celular.
