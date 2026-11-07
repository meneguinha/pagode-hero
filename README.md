# 🪕 Pagode Hero 🍺

[![Deploy to GitHub Pages](https://github.com/meneguinha/pagode-hero/actions/workflows/deploy.yml/badge.svg)](https://github.com/meneguinha/pagode-hero/actions/workflows/deploy.yml)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/Status-Online-06D6A0?style=flat)](https://meneguinha.github.io/pagode-hero/)

> **"The best pagode is the one we play together!"** 👑🌴

**Pagode Hero** is a web rhythm game inspired by classic guitar rhythm games, brought to life with the groove, swing, and soulful energy of an authentic Brazilian **roda de samba and pagode**.

Pick up your virtual cavaquinho, strike the notes to real instrument picking tracks, and keep the whole band playing in rhythm!

---

## 🎮 Play Online in Your Browser

👉 **[https://meneguinha.github.io/pagode-hero/](https://meneguinha.github.io/pagode-hero/)**

---

## ✨ Key Features

- **🎛️ Dynamic Multitrack Audio (Real Stems):**
  - Audio runs on independent stems (Cavaquinho/Banjo, Percussion/Pandeiro, Bass, Acoustic Guitar, Piano, and Lead Vocals).
  - Miss notes and the band gradually drops out instrument by instrument!
  - Nail your hits to bring every musician back into the groove.

- **🍺 "Chopp-o-meter" (Resenha Draft Beer Gauge):**
  - Every note hit takes a sip from your cold draft beer glass.
  - Glass running empty? It's time to shout: **"CHAMA O GARÇOM!"** (Call the waiter!).

- **🤵 Overdrive Mode: "Chama o Garçom!" (4x Multiplier):**
  - Press the **SPACEBAR** to call the waiter, pour a fresh stream of golden beer, and ignite a 4x score multiplier!

- **🎤 Synchronized Karaoke Lyrics & HD Music Video:**
  - Real-time lyrics bar with karaoke timing at the bottom of the track.
  - High-definition official music video synced seamlessly across a sunny Rio rooftop scene.

- **🔞 Age Verification & Responsible Drinking Disclaimer:**
  - Interactive age gate (+18 years old) before starting any match.
  - Social responsibility disclaimer (*"Drink responsibly & Never drink and drive"*).

- **🏆 Local Leaderboard & Statistics:**
  - Persists high scores, match history, accuracy percentage, and longest streaks in your browser.

---

## 🎹 Controls

Designed for both keyboard gameplay and touch screens (smartphones and tablets):

| Action / Track | PC Keyboard | Touch / Mobile |
| :--- | :---: | :---: |
| **Track 1 (D4 - Ré)** | <kbd>A</kbd> or <kbd>1</kbd> | Button **A** |
| **Track 2 (G4 - Sol)** | <kbd>S</kbd> or <kbd>2</kbd> | Button **S** |
| **Track 3 (B4 - Si)** | <kbd>K</kbd> or <kbd>3</kbd> | Button **K** |
| **Track 4 (D5 - Ré)** | <kbd>L</kbd> or <kbd>4</kbd> | Button **L** |
| **Chama o Garçom! (4x)** | <kbd>SPACE</kbd> | On-screen button |

> 💡 **Latency Calibration Tip:** Using Bluetooth headphones or feeling audio desync? Open the **Settings** menu to calibrate audio latency down to the millisecond.

---

## 🎵 Featured Track

- **Melhor Eu Ir / Ligando os Fatos** — *Grupo Menos é Mais (Churrasquinho)*
  - BPM: 88 (Cadenciado • Roda de Samba)
  - 3 Difficulty Tiers: **Easy** (Fácil), **Medium** (Médio), and **Master 👑** (Mestre)

---

## 🛠️ Tech Stack

- **[TypeScript](https://www.typescriptlang.org/)** — Strict type safety for scoring mechanics, hit detection, and engine logic.
- **[Vite](https://vitejs.dev/)** — Lightning-fast development tooling and optimized production builds.
- **[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)** — Low-latency multichannel audio playback with real-time gain node automation for dynamic muting.
- **HTML5 Canvas 2D** — Smooth 60 FPS perspective highway rendering for falling notes and visual feedback.
- **Modern CSS3** — Responsive layout, SVG brush masks, glassmorphism, and tropical summer color palettes.
- **[Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)** — Celebration particle effects for top performance finishes.
- **[GitHub Actions](https://github.com/features/actions)** — Automated CI/CD pipeline building and deploying directly to GitHub Pages on every push.

---

## 🚀 Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or your preferred package manager

### Step-by-Step

1. **Clone the repository:**
   ```bash
   git clone https://github.com/meneguinha/pagode-hero.git
   cd pagode-hero
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local dev server:**
   ```bash
   npm run dev
   ```

4. **Open in your browser:**
   Navigate to [http://localhost:5173/](http://localhost:5173/) and join the roda!

5. **Build for production:**
   ```bash
   npm run build
   ```

---

## ⚖️ Age Disclaimer & Social Responsibility

🔞 **Rating: 18+**  
This game celebrates Brazilian samba culture and festive gatherings, featuring references to draft beer (chopp). It promotes conscious and safe entertainment: **Enjoy responsibly** and **Never drink and drive**.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.

Crafted with rhythm, passion, and Brazilian pagode by [Felipe Nunes Menegotto (meneguinha)](https://github.com/meneguinha).
