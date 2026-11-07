// Cena animada da tela inicial: quiosque na praia ao pôr do sol, com a roda de pagode.
// Tudo em SVG com SMIL (animateTransform), sincronizado no BPM da música.

const BPM = 88;
const BEAT = 60 / BPM;

type Hair = 'afro' | 'short' | 'cap' | 'hat' | 'bun' | 'long';
type Prop = 'cavaco' | 'pandeiro' | 'lata' | 'dance';

interface PersonOptions {
  x: number;
  y: number; // linha dos pés
  scale: number;
  skin: string;
  shirt: string;
  shorts: string;
  hair: Hair;
  hairColor?: string;
  accent?: string; // boné / chapéu / chinelo
  prop: Prop;
  delay?: number; // defasagem (s) para ninguém mexer igualzinho
  opacity?: number;
}

function rotateAnim(from: number, to: number, dur: number, delay: number) {
  return `<animateTransform attributeName="transform" type="rotate" values="${from} 0 0;${to} 0 0;${from} 0 0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="${dur}s" begin="${-delay}s" repeatCount="indefinite"/>`;
}

function arm(sx: number, sy: number, d: string, skin: string, anim: string, extra = '') {
  return `<g transform="translate(${sx} ${sy})"><g>${anim}<path d="${d}" stroke="${skin}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>${extra}</g></g>`;
}

function hair(kind: Hair, color: string, accent: string) {
  switch (kind) {
    case 'afro':
      return { back: `<circle cx="0" cy="-114" r="17" fill="${color}"/>`, front: '' };
    case 'bun':
      return {
        back: `<circle cx="0" cy="-112" r="12.5" fill="${color}"/><circle cx="0" cy="-126" r="7" fill="${color}"/>`,
        front: '',
      };
    case 'long':
      return {
        back: `<rect x="-14" y="-120" width="28" height="34" rx="12" fill="${color}"/>`,
        front: `<path d="M-12 -110 Q0 -126 12 -110 Q0 -118 -12 -110Z" fill="${color}"/>`,
      };
    case 'cap':
      return {
        back: `<circle cx="0" cy="-112" r="12" fill="${color}"/>`,
        front: `<path d="M-12.5 -112 Q0 -131 12.5 -112Z" fill="${accent}"/><rect x="3" y="-114.5" width="16" height="4" rx="2" fill="${accent}"/>`,
      };
    case 'hat':
      return {
        back: `<circle cx="0" cy="-112" r="12" fill="${color}"/>`,
        front: `<rect x="-10" y="-131" width="20" height="14" rx="5" fill="#e9c46a"/><rect x="-10" y="-121" width="20" height="3" fill="${accent}"/><ellipse cx="0" cy="-117" rx="20" ry="4" fill="#e9c46a"/>`,
      };
    default:
      return { back: `<circle cx="0" cy="-113" r="12.5" fill="${color}"/>`, front: '' };
  }
}

function person(o: PersonOptions) {
  const delay = o.delay ?? 0;
  const hairColor = o.hairColor ?? '#1f1410';
  const accent = o.accent ?? '#ff6b6b';
  const h = hair(o.hair, hairColor, accent);
  const skin = o.skin;

  let backArm = '';
  let frontArm = '';
  let instrument = '';
  let sway = '';

  switch (o.prop) {
    case 'cavaco':
      // cavaquinho atravessado no peito; mão direita palhetando, esquerda no braço
      instrument = `<g transform="translate(-2 -66) rotate(-150)">
          <rect x="8" y="-2" width="27" height="4" fill="#7a4a1f"/>
          <rect x="33" y="-3.5" width="7" height="7" rx="1.5" fill="#5c3416"/>
          <ellipse cx="0" cy="0" rx="12" ry="8.5" fill="#c0803a" stroke="#7a4a1f" stroke-width="1.5"/>
          <circle cx="2" cy="0" r="2.6" fill="#3b2416"/>
        </g>`;
      backArm = arm(-14, -90, 'M0 0 L-11 5 L-17 8', skin, rotateAnim(-4, 4, BEAT, delay));
      frontArm = arm(14, -90, 'M0 0 L2 14 L-14 24', skin, rotateAnim(-9, 9, BEAT / 2, delay));
      break;
    case 'pandeiro':
      backArm = arm(-14, -90, 'M0 0 L-4 -16 L3 -32', skin, rotateAnim(-18, 6, BEAT / 2, delay));
      frontArm = arm(
        14,
        -90,
        'M0 0 L8 -18 L10 -36',
        skin,
        rotateAnim(-6, 10, BEAT / 2, delay),
        `<g transform="translate(11 -47)">
            <circle r="12" fill="#f4d6a0" stroke="#b8572f" stroke-width="4"/>
            <circle cx="0" cy="-12" r="2" fill="#ffd166"/><circle cx="12" cy="0" r="2" fill="#ffd166"/>
            <circle cx="0" cy="12" r="2" fill="#ffd166"/><circle cx="-12" cy="0" r="2" fill="#ffd166"/>
          </g>`
      );
      break;
    case 'lata':
      backArm = arm(-14, -90, 'M0 0 L-3 22 L-2 42', skin, rotateAnim(-10, 12, BEAT * 2, delay));
      frontArm = arm(
        14,
        -90,
        'M0 0 L8 -18 L10 -34',
        skin,
        rotateAnim(-14, 14, BEAT * 2, delay),
        `<g transform="translate(6 -50)">
            <rect width="10" height="16" rx="2" fill="#ffd166"/>
            <rect y="6" width="10" height="4" fill="#ffffff" opacity="0.85"/>
            <ellipse cx="5" cy="0.5" rx="5" ry="1.6" fill="#d9dde2"/>
          </g>`
      );
      break;
    case 'dance':
      backArm = arm(-14, -90, 'M0 0 L-10 -16 L-14 -34', skin, rotateAnim(-25, 15, BEAT, delay));
      frontArm = arm(14, -90, 'M0 0 L10 -16 L14 -34', skin, rotateAnim(-15, 25, BEAT, delay + BEAT / 2));
      sway = rotateAnim(-6, 6, BEAT * 2, delay);
      break;
  }

  return `
    <g transform="translate(${o.x} ${o.y}) scale(${o.scale})" opacity="${o.opacity ?? 1}">
      <g>${sway}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="${BEAT}s" begin="${-delay}s" repeatCount="indefinite"/>
          <!-- pernas e chinelos -->
          <path d="M-7 -46 L-9 0" stroke="${skin}" stroke-width="8" stroke-linecap="round"/>
          <path d="M7 -46 L9 0" stroke="${skin}" stroke-width="8" stroke-linecap="round"/>
          <ellipse cx="-11" cy="1" rx="8" ry="2.6" fill="${accent}"/>
          <ellipse cx="11" cy="1" rx="8" ry="2.6" fill="${accent}"/>
          <rect x="-16" y="-60" width="32" height="18" rx="6" fill="${o.shorts}"/>
          ${backArm}
          <!-- tronco -->
          <rect x="-16" y="-97" width="32" height="44" rx="12" fill="${o.shirt}"/>
          <rect x="-4" y="-104" width="8" height="9" rx="3" fill="${skin}"/>
          ${h.back}
          <circle cx="0" cy="-108" r="11.5" fill="${skin}"/>
          ${h.front}
          ${instrument}
          ${frontArm}
        </g>
      </g>
    </g>`;
}

function palm(x: number, y: number, scale: number, flip = false) {
  return `
    <g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})" opacity="0.9">
      <path d="M0 0 C 6 -60 -4 -120 18 -190" stroke="#3a2a1c" stroke-width="12" fill="none" stroke-linecap="round"/>
      <g transform="translate(18 -190)">
        <g>
          <animateTransform attributeName="transform" type="rotate" values="-3 0 0;3 0 0;-3 0 0" dur="${BEAT * 6}s" repeatCount="indefinite"/>
          <path d="M0 0 Q -50 -30 -95 10 Q -50 -15 0 0Z" fill="#0b4d3c"/>
          <path d="M0 0 Q 50 -35 100 5 Q 50 -12 0 0Z" fill="#0b4d3c"/>
          <path d="M0 0 Q -30 -55 -60 -70 Q -20 -40 0 0Z" fill="#0e5c47"/>
          <path d="M0 0 Q 35 -55 70 -60 Q 25 -35 0 0Z" fill="#0e5c47"/>
          <path d="M0 0 Q -10 -45 5 -85 Q 8 -40 0 0Z" fill="#0b4d3c"/>
        </g>
      </g>
    </g>`;
}

function pandeiro(cx: number, cy: number, rx: number, ry: number, id: string) {
  // pandeiro deitado na mesa, em perspectiva: aro de madeira, pele e platinelas
  const jingles = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (0.08 + (0.84 * i) / 8);
    const x = cx - Math.cos(a) * rx * 0.98;
    const y = cy + Math.sin(a) * ry + ry * 0.32;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
        <rect x="-7" y="-4" width="14" height="9" rx="2" fill="#2c1a10"/>
        <ellipse cx="-3.5" cy="0.5" rx="4.5" ry="3" fill="url(#jingle-${id})"/>
        <ellipse cx="3.5" cy="0.5" rx="4.5" ry="3" fill="url(#jingle-${id})">
          <animate attributeName="opacity" values="1;0.55;1" dur="${(BEAT * (1 + (i % 3) * 0.5)).toFixed(3)}s" repeatCount="indefinite"/>
        </ellipse>
      </g>`;
  }).join('');
  return `
    <g>
      <defs>
        <radialGradient id="pele-${id}" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stop-color="#f7efdc"/><stop offset="0.7" stop-color="#e3d3b2"/><stop offset="1" stop-color="#bfa57c"/>
        </radialGradient>
        <linearGradient id="jingle-${id}" x1="0" x2="1">
          <stop offset="0" stop-color="#fdf3cf"/><stop offset="1" stop-color="#b98f3a"/>
        </linearGradient>
      </defs>
      <ellipse cx="${cx}" cy="${cy + ry * 0.9}" rx="${rx * 1.05}" ry="${ry * 0.55}" fill="#000" opacity="0.28"/>
      <ellipse cx="${cx}" cy="${cy + ry * 0.35}" rx="${rx}" ry="${ry}" fill="#5a3218"/>
      <rect x="${cx - rx}" y="${cy}" width="${rx * 2}" height="${ry * 0.35}" fill="#5a3218"/>
      ${jingles}
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#7a4524"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.93}" ry="${ry * 0.9}" fill="url(#pele-${id})"/>
      <ellipse cx="${cx - rx * 0.3}" cy="${cy - ry * 0.3}" rx="${rx * 0.35}" ry="${ry * 0.22}" fill="#fff" opacity="0.25"/>
    </g>`;
}

function cavaquinhoOnTable(x: number, y: number, angle: number) {
  return `
    <g transform="translate(${x} ${y}) rotate(${angle})">
      <ellipse cx="10" cy="34" rx="120" ry="18" fill="#000" opacity="0.25"/>
      <rect x="40" y="-9" width="190" height="18" rx="3" fill="#4a2a14"/>
      <g stroke="#e9dcc0" stroke-width="1" opacity="0.8">
        <line x1="-30" y1="-5" x2="245" y2="-5"/><line x1="-30" y1="-1.5" x2="245" y2="-1.5"/>
        <line x1="-30" y1="1.5" x2="245" y2="1.5"/><line x1="-30" y1="5" x2="245" y2="5"/>
      </g>
      <rect x="228" y="-13" width="36" height="26" rx="5" fill="#3b2010"/>
      <path d="M-90 -40 C-130 -40 -140 40 -90 40 C-70 40 -60 28 -40 28 C-20 28 -10 46 25 46 C70 46 70 -46 25 -46 C-10 -46 -20 -28 -40 -28 C-60 -28 -70 -40 -90 -40 Z" fill="#b8763a" stroke="#6b3f1c" stroke-width="3"/>
      <circle cx="-25" cy="0" r="13" fill="#2b170b"/>
      <circle cx="-25" cy="0" r="16" fill="none" stroke="#e9c58a" stroke-width="2" opacity="0.7"/>
      <rect x="-82" y="-12" width="9" height="24" rx="2" fill="#3b2010"/>
      <g stroke="#e9dcc0" stroke-width="1" opacity="0.8">
        <line x1="-78" y1="-5" x2="-30" y2="-5"/><line x1="-78" y1="-1.5" x2="-30" y2="-1.5"/>
        <line x1="-78" y1="1.5" x2="-30" y2="1.5"/><line x1="-78" y1="5" x2="-30" y2="5"/>
      </g>
      <path d="M-120 -30 C-110 -38 -96 -38 -88 -34" stroke="#fff" stroke-width="3" opacity="0.25" fill="none"/>
    </g>`;
}

function isopor(x: number, y: number) {
  return `
    <g transform="translate(${x} ${y})">
      <ellipse cx="85" cy="112" rx="100" ry="14" fill="#000" opacity="0.28"/>
      <rect x="0" y="22" width="170" height="92" rx="10" fill="#3b6f99"/>
      <rect x="0" y="22" width="170" height="92" rx="10" fill="url(#isopor-shade)"/>
      <rect x="-6" y="0" width="182" height="30" rx="9" fill="#e9eef0"/>
      <rect x="62" y="8" width="46" height="9" rx="4" fill="#b9c4c8"/>
      <text x="85" y="76" text-anchor="middle" transform="rotate(-6 85 76)" font-family="'Permanent Marker', cursive" font-size="22" fill="#f4ead6" opacity="0.9">BORA</text>
      <text x="85" y="100" text-anchor="middle" transform="rotate(-6 85 100)" font-family="'Permanent Marker', cursive" font-size="22" fill="#f4ead6" opacity="0.9">PAGODE!</text>
    </g>`;
}

function bottle(x: number, y: number) {
  return `
    <g transform="translate(${x} ${y})">
      <ellipse cx="0" cy="150" rx="30" ry="7" fill="#000" opacity="0.3"/>
      <path d="M-9 0 H9 V30 C9 48 24 56 24 76 V146 C24 152 20 154 16 154 H-16 C-20 154 -24 152 -24 146 V76 C-24 56 -9 48 -9 30 Z" fill="#6b3a12"/>
      <path d="M-9 0 H9 V30 C9 48 24 56 24 76 V146 C24 152 20 154 16 154 H-16 C-20 154 -24 152 -24 146 V76 C-24 56 -9 48 -9 30 Z" fill="url(#bottle-shine)"/>
      <rect x="-11" y="-6" width="22" height="10" rx="2" fill="#c9a24a"/>
      <ellipse cx="0" cy="106" rx="23" ry="26" fill="#efe1c0"/>
      <text x="0" y="104" text-anchor="middle" font-family="'Permanent Marker', cursive" font-size="10" fill="#8a3b1c">GELADA</text>
      <text x="0" y="118" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="7" fill="#8a3b1c">600 ml</text>
      <circle cx="12" cy="88" r="1.6" fill="#fff" opacity="0.7"/><circle cx="-14" cy="132" r="1.3" fill="#fff" opacity="0.6"/>
    </g>`;
}

function tableCan(x: number, y: number, label: string) {
  return `
    <g transform="translate(${x} ${y})">
      <ellipse cx="17" cy="62" rx="22" ry="5" fill="#000" opacity="0.28"/>
      <rect x="0" y="4" width="34" height="58" rx="4" fill="${label}"/>
      <rect x="0" y="4" width="34" height="58" rx="4" fill="url(#can-shine)"/>
      <path d="M0 30 Q9 25 17 30 T34 30 V36 Q26 41 17 36 T0 36Z" fill="#fff" opacity="0.85"/>
      <ellipse cx="17" cy="5" rx="17" ry="4" fill="#d6dade" stroke="#9aa0a6" stroke-width="0.8"/>
    </g>`;
}

/**
 * Tela inicial: vista de um quiosque na praia ao pôr do sol (Rio, Pão de Açúcar ao fundo),
 * com a mesa da roda de pagode em primeiro plano.
 */
export function renderKiosqueBackground(): string {
  const skins = ['#8d5524', '#c68642', '#e0ac69', '#5c3a1e', '#a0662f'];
  return `
    <svg class="kiosque-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="k-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#27425c"/>
          <stop offset="0.42" stop-color="#7d7088"/>
          <stop offset="0.74" stop-color="#d9976d"/>
          <stop offset="1" stop-color="#efc289"/>
        </linearGradient>
        <radialGradient id="k-sun-glow">
          <stop offset="0" stop-color="#ffe6b0" stop-opacity="0.9"/>
          <stop offset="0.35" stop-color="#f7b878" stop-opacity="0.45"/>
          <stop offset="1" stop-color="#f7b878" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="k-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#6f8a99"/>
          <stop offset="0.5" stop-color="#3f6478"/>
          <stop offset="1" stop-color="#2a4b5e"/>
        </linearGradient>
        <linearGradient id="k-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#d9b684"/><stop offset="1" stop-color="#b8935f"/>
        </linearGradient>
        <linearGradient id="k-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7a5232"/><stop offset="1" stop-color="#4a2f1b"/>
        </linearGradient>
        <linearGradient id="isopor-shade" x1="0" x2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="0.18"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.25"/>
        </linearGradient>
        <linearGradient id="bottle-shine" x1="0" x2="1">
          <stop offset="0" stop-color="#000" stop-opacity="0.25"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.25"/>
          <stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/>
        </linearGradient>
        <linearGradient id="can-shine" x1="0" x2="1">
          <stop offset="0" stop-color="#000" stop-opacity="0.25"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.35"/>
          <stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/>
        </linearGradient>
      </defs>

      <!-- céu e sol -->
      <rect width="1600" height="590" fill="url(#k-sky)"/>
      <circle cx="770" cy="560" r="230" fill="url(#k-sun-glow)">
        <animate attributeName="r" values="220;245;220" dur="${BEAT * 8}s" repeatCount="indefinite"/>
      </circle>
      <circle cx="770" cy="560" r="32" fill="#ffe6b0"/>

      <!-- nuvens passando devagar -->
      <g opacity="0.45" fill="#f3c7a6">
        <animateTransform attributeName="transform" type="translate" values="-40 0;60 0;-40 0" dur="90s" repeatCount="indefinite"/>
        <ellipse cx="420" cy="330" rx="140" ry="16"/><ellipse cx="500" cy="318" rx="70" ry="12"/>
        <ellipse cx="1010" cy="270" rx="170" ry="14"/><ellipse cx="1120" cy="285" rx="90" ry="11"/>
        <ellipse cx="760" cy="420" rx="120" ry="9"/>
      </g>

      <!-- morros: Pão de Açúcar e Urca -->
      <path d="M0 590 Q120 560 240 572 Q330 548 420 575 L460 590 Z" fill="#7e6c7f" opacity="0.7"/>
      <path d="M1180 590 Q1260 540 1340 560 Q1420 530 1520 565 L1600 575 V590 Z" fill="#7e6c7f" opacity="0.6"/>
      <path d="M860 592 Q905 575 935 552 Q965 470 1005 432 Q1032 408 1052 444 Q1072 500 1088 548 L1104 540 Q1128 506 1152 518 Q1182 548 1232 584 L1250 592 Z" fill="#5e4e64"/>

      <!-- mar com o reflexo do sol -->
      <rect y="588" width="1600" height="190" fill="url(#k-sea)"/>
      <g fill="#ffe6b0">
        ${[0, 1, 2, 3, 4, 5, 6]
          .map((i) => {
            const y = 598 + i * 22;
            const w = 30 + i * 18;
            return `<rect x="${770 - w / 2}" y="${y}" width="${w}" height="3" rx="1.5" opacity="0.6">
              <animate attributeName="opacity" values="0.65;0.15;0.65" dur="${(1.6 + i * 0.37).toFixed(2)}s" repeatCount="indefinite"/>
            </rect>`;
          })
          .join('')}
      </g>
      <g stroke="#e9f2f2" stroke-width="2" fill="none" opacity="0.25">
        <animateTransform attributeName="transform" type="translate" values="0 0;-60 0;0 0" dur="12s" repeatCount="indefinite"/>
        <path d="M-60 650 Q-20 642 20 650 T100 650 T180 650 T260 650 T340 650 T420 650 T500 650 T580 650 T660 650 T740 650 T820 650 T900 650 T980 650 T1060 650 T1140 650 T1220 650 T1300 650 T1380 650 T1460 650 T1540 650 T1620 650 T1700 650"/>
        <path d="M-60 710 Q-20 700 20 710 T100 710 T180 710 T260 710 T340 710 T420 710 T500 710 T580 710 T660 710 T740 710 T820 710 T900 710 T980 710 T1060 710 T1140 710 T1220 710 T1300 710 T1380 710 T1460 710 T1540 710 T1620 710 T1700 710"/>
      </g>

      <!-- espuma e areia -->
      <path d="M0 772 Q200 760 400 770 T800 768 T1200 772 T1600 766 V790 H0Z" fill="#f4efe4" opacity="0.6">
        <animateTransform attributeName="transform" type="translate" values="0 0;0 5;0 0" dur="${BEAT * 6}s" repeatCount="indefinite"/>
      </path>
      <rect y="776" width="1600" height="60" fill="url(#k-sand)"/>

      <!-- galera dançando na areia -->
      ${person({ x: 560, y: 812, scale: 0.42, skin: skins[0], shirt: '#e9c46a', shorts: '#264653', hair: 'afro', prop: 'dance', delay: 0.1, accent: '#e76f51' })}
      ${person({ x: 610, y: 815, scale: 0.4, skin: skins[2], shirt: '#e76f51', shorts: '#2a9d8f', hair: 'long', hairColor: '#3b2416', prop: 'lata', delay: 0.35, accent: '#e9c46a' })}
      ${person({ x: 1110, y: 812, scale: 0.42, skin: skins[3], shirt: '#2a9d8f', shorts: '#1d3557', hair: 'cap', prop: 'pandeiro', delay: 0.2, accent: '#e9c46a' })}
      ${person({ x: 1160, y: 815, scale: 0.4, skin: skins[1], shirt: '#f4f1de', shorts: '#e76f51', hair: 'bun', prop: 'dance', delay: 0.5, accent: '#2a9d8f' })}

      <!-- coqueiros emoldurando -->
      ${palm(70, 800, 1.7)}
      ${palm(1550, 800, 1.6, true)}

      <!-- mesa da roda, em primeiro plano -->
      <path d="M0 830 L1600 830 L1600 900 L0 900 Z" fill="url(#k-wood)"/>
      <g stroke="#3a2416" stroke-width="2" opacity="0.5">
        <line x1="0" y1="852" x2="1600" y2="852"/><line x1="0" y1="876" x2="1600" y2="876"/>
      </g>
      <rect y="826" width="1600" height="6" fill="#8d6440"/>

      ${bottle(600, 676)}
      ${isopor(820, 718)}
      ${tableCan(1000, 768, '#e0a34a')}
      ${tableCan(1042, 774, '#d9705a')}
      ${pandeiro(730, 846, 120, 34, 'big')}
      ${pandeiro(960, 866, 74, 22, 'small')}
      ${cavaquinhoOnTable(1260, 840, -8)}
    </svg>`;
}

/**
 * Estrutura do quiosque (viga, palha e pilares) presa ao topo da tela.
 * Com `decorations`, inclui o lampião pendurado.
 */
export function renderKiosqueFrame(decorations = true): string {
  return `
    <svg class="kiosque-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <defs>
        <linearGradient id="k-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3a2416"/><stop offset="1" stop-color="#22140c"/>
        </linearGradient>
        <radialGradient id="k-lamp">
          <stop offset="0" stop-color="#ffd98a" stop-opacity="0.85"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- estrutura do quiosque -->
      <rect x="0" y="0" width="1600" height="40" fill="url(#k-beam)"/>
      <path d="M0 40 ${Array.from({ length: 81 }, (_, i) => `L${i * 20} ${40 + (i % 2 ? 26 : 12)}`).join(' ')} L1600 40 Z" fill="#8a6a3e"/>
      <rect x="0" y="0" width="34" height="900" fill="url(#k-beam)"/>
      <rect x="1566" y="0" width="34" height="900" fill="url(#k-beam)"/>

      ${decorations ? `
      <!-- lampião -->
      <g transform="translate(1110 40)">
        <line x1="0" y1="0" x2="0" y2="70" stroke="#22140c" stroke-width="3"/>
        <circle cx="0" cy="98" r="70" fill="url(#k-lamp)">
          <animate attributeName="opacity" values="0.9;0.7;0.95;0.8;0.9" dur="3.3s" repeatCount="indefinite"/>
        </circle>
        <path d="M-14 70 H14 L18 82 V112 L12 122 H-12 L-18 112 V82 Z" fill="#3a2416"/>
        <rect x="-11" y="84" width="22" height="26" rx="3" fill="#ffd98a" opacity="0.95"/>
      </g>

` : ''}
    </svg>`;
}

