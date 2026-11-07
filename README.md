# 🪕 Pagode Hero 🍺

[![Deploy to GitHub Pages](https://github.com/meneguinha/pagode-hero/actions/workflows/deploy.yml/badge.svg)](https://github.com/meneguinha/pagode-hero/actions/workflows/deploy.yml)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Status-Online-06D6A0?style=flat)](https://meneguinha.github.io/pagode-hero/)

> **"O melhor pagode é aquele que a gente toca junto!"** 👑🌴

**Pagode Hero** é um jogo de ritmo web inspirado nos clássicos jogos de guitarra e notas musicais, adaptado para a energia, o balanço e a cadência de uma autêntica **roda de samba e pagode brasileira**.

Empunhe seu cavaquinho virtual, acompanhe as notas tiradas das palhetadas reais e mantenha a banda completa tocando no compasso!

---

## 🎮 Jogue Agora no Navegador

👉 **[https://meneguinha.github.io/pagode-hero/](https://meneguinha.github.io/pagode-hero/)**

---

## ✨ Principais Funcionalidades

- **🎛️ Áudio Multitrack Dinâmico (Stems Reais):**
  - A música toca separada em instrumentos independentes (Cavaquinho/Banjo, Pandeiro/Percussão, Baixo, Violão, Piano e Voz).
  - Se você começar a errar as notas, os instrumentos vão parando um a um até sobrar só o silêncio do mico!
  - Acerte as notas para trazer cada músico de volta para a roda.

- **🍺 Choppômetro (Barra de Resenha):**
  - Cada acerto é um gole no copo de chopp.
  - Copo esvaziou? É hora de gritar: **"CHAMA O GARÇOM!"**

- **🤵 Modo Overdrive: Chama o Garçom! (4x):**
  - Ative com a barra de **ESPAÇO** para chamar o garçom, encher o caneco com um jato de chopp e multiplicar seus pontos por 4x!

- **🎤 Letra Dinâmica e Clipe de Fundo:**
  - Letra sincronizada estilo karaokê no rodapé da pista.
  - Clipe original em alta definição sincronizado no fundo da varanda carioca.

- **🔞 Verificação de Maioridade e Consumo Responsável:**
  - Confirmação interativa de idade (+18 anos) antes de iniciar qualquer partida.
  - Mensagem de conscientização e consumo responsável (*"Beba com moderação & Se beber, não dirija"*).

- **🏆 Ranking e Recordes Locais:**
  - Salva automaticamente sua maior pontuação, histórico de partidas, precisão e combos no navegador.

---

## 🎹 Controles

O jogo foi desenhado para ser jogado tanto no teclado do computador quanto em dispositivos com tela de toque (mobile e tablets):

| Ação / Trilha | Tecla no PC | Toque / Mobile |
| :--- | :---: | :---: |
| **Trilha 1 (Ré - D4)** | <kbd>A</kbd> ou <kbd>1</kbd> | Botão **A** |
| **Trilha 2 (Sol - G4)** | <kbd>S</kbd> ou <kbd>2</kbd> | Botão **S** |
| **Trilha 3 (Si - B4)** | <kbd>K</kbd> ou <kbd>3</kbd> | Botão **K** |
| **Trilha 4 (Ré - D5)** | <kbd>L</kbd> ou <kbd>4</kbd> | Botão **L** |
| **Chama o Garçom! (4x)** | <kbd>ESPAÇO</kbd> | Botão na tela |

> 💡 **Dica de Calibração:** Se estiver utilizando fone de ouvido Bluetooth ou sentir atraso no som, acesse o menu **Configurações** e ajuste a latência de áudio em milissegundos.

---

## 🎵 Repertório em Destaque

- **Melhor Eu Ir / Ligando os Fatos** — *Grupo Menos é Mais (Churrasquinho)*
  - BPM: 88 (Cadenciado • Roda de Samba)
  - 3 Níveis de Dificuldade: **Fácil**, **Médio** e **Mestre 👑**

---

## 🛠️ Tecnologias Utilizadas

- **[TypeScript](https://www.typescriptlang.org/)** — Tipagem estática robusta para mecânicas de pontuação, motor de jogo e notas.
- **[Vite](https://vitejs.dev/)** — Build tool ultra-rápida e ambiente de desenvolvimento moderno.
- **[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)** — Sincronização precisa de múltiplos canais de áudio com baixa latência e controle dinâmico de volume/ganho.
- **HTML5 Canvas 2D** — Renderização suave a 60 FPS da pista de notas caindo em perspectiva.
- **CSS3 Moderno** — Design responsivo com efeitos de pinceladas de tinta, glassmorphism e animações temáticas.
- **[Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)** — Chuva de confetes ao fechar aquela apresentação digna de bamba!
- **[GitHub Actions](https://github.com/features/actions)** — Pipeline de CI/CD para deploy automático no GitHub Pages a cada commit.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- `npm` ou seu gerenciador de pacotes preferido

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/meneguinha/pagode-hero.git
   cd pagode-hero
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Acesse no navegador:**
   Abra [http://localhost:5173/](http://localhost:5173/) e aproveite a resenha!

5. **Para gerar a build de produção:**
   ```bash
   npm run build
   ```

---

## ⚖️ Responsabilidade e Classificação Indicativa

🔞 **Classificação: 18+**  
Este jogo faz alusão ao ambiente festivo e à cultura dos botecos e rodas de samba brasileiros, com referências a chopp gelado. O jogo promove o entretenimento consciente: **Beba com moderação** e **Se beber, nunca dirija**.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais informações.

Desenvolvido com carinho e muito pagode por [Felipe Nunes Menegotto (meneguinha)](https://github.com/meneguinha).
