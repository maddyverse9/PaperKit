/**
 * Generates realistic procedural SVG sample papers:
 * 1. Cafe receipt with torn edge
 * 2. Handwritten vintage note
 * 3. Scenic photo postcard (front + back)
 * 4. Yellow legal memo pad
 */

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createReceiptSample(): {
  front: { src: string; width: number; height: number };
  title: string;
} {
  const w = 320;
  const h = 540;
  const svg = `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="paper-noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" result="noise" />
      <feColorMatrix type="matrix" values="1 0 0 0 0.98  0 1 0 0 0.97  0 0 1 0 0.95  0 0 0 0.05 0" />
    </filter>
  </defs>

  <!-- Paper background -->
  <path d="M 0,0 L ${w},0 L ${w},${h - 15}
    Q ${w - 10},${h} ${w - 20},${h - 10}
    Q ${w - 30},${h - 20} ${w - 40},${h - 8}
    Q ${w - 50},${h} ${w - 60},${h - 12}
    Q ${w - 70},${h - 20} ${w - 80},${h - 10}
    Q ${w - 90},${h} ${w - 100},${h - 14}
    Q ${w - 110},${h - 22} ${w - 120},${h - 10}
    Q ${w - 130},${h} ${w - 140},${h - 12}
    Q ${w - 150},${h - 20} ${w - 160},${h - 8}
    Q ${w - 170},${h} ${w - 180},${h - 10}
    Q ${w - 190},${h - 22} ${w - 200},${h - 12}
    Q ${w - 210},${h} ${w - 220},${h - 10}
    Q ${w - 230},${h - 20} ${w - 240},${h - 8}
    Q ${w - 250},${h} ${w - 260},${h - 12}
    Q ${w - 270},${h - 20} ${w - 280},${h - 10}
    Q ${w - 290},${h} ${w - 300},${h - 12}
    Q ${w - 310},${h - 18} 0,${h - 10} Z"
    fill="#fdfbf7"
  />

  <g font-family="'Courier New', Courier, monospace" fill="#1f2937">
    <!-- Header -->
    <text x="160" y="55" font-size="18" font-weight="bold" text-anchor="middle" letter-spacing="2">ATELIER CAFE</text>
    <text x="160" y="75" font-size="11" text-anchor="middle" fill="#6b7280">140 Hayes St, San Francisco</text>
    <text x="160" y="90" font-size="10" text-anchor="middle" fill="#9ca3af">ORDER #8942 • 10:42 AM</text>

    <!-- Divider -->
    <line x1="24" y1="110" x2="${w - 24}" y2="110" stroke="#d1d5db" stroke-dasharray="4 4" stroke-width="1.2" />

    <!-- Line items -->
    <text x="28" y="145" font-size="13">1x Cortado (Oat)</text>
    <text x="${w - 28}" y="145" font-size="13" text-anchor="end">$ 5.50</text>

    <text x="28" y="175" font-size="13">1x Cardamom Bun</text>
    <text x="${w - 28}" y="175" font-size="13" text-anchor="end">$ 6.00</text>

    <text x="28" y="205" font-size="13">1x Hand-drip Geisha</text>
    <text x="${w - 28}" y="205" font-size="13" text-anchor="end">$ 8.50</text>

    <line x1="24" y1="235" x2="${w - 24}" y2="235" stroke="#d1d5db" stroke-dasharray="4 4" stroke-width="1.2" />

    <!-- Totals -->
    <text x="28" y="265" font-size="12" fill="#4b5563">SUBTOTAL</text>
    <text x="${w - 28}" y="265" font-size="12" text-anchor="end" fill="#4b5563">$ 20.00</text>

    <text x="28" y="290" font-size="12" fill="#4b5563">TAX (8.625%)</text>
    <text x="${w - 28}" y="290" font-size="12" text-anchor="end" fill="#4b5563">$ 1.73</text>

    <text x="28" y="325" font-size="16" font-weight="bold">TOTAL</text>
    <text x="${w - 28}" y="325" font-size="16" font-weight="bold" text-anchor="end">$ 21.73</text>

    <!-- Barcode simulation -->
    <g transform="translate(60, 370)">
      <rect x="0" y="0" width="3" height="45" fill="#111827"/>
      <rect x="5" y="0" width="1" height="45" fill="#111827"/>
      <rect x="8" y="0" width="4" height="45" fill="#111827"/>
      <rect x="15" y="0" width="2" height="45" fill="#111827"/>
      <rect x="20" y="0" width="1" height="45" fill="#111827"/>
      <rect x="24" y="0" width="5" height="45" fill="#111827"/>
      <rect x="32" y="0" width="2" height="45" fill="#111827"/>
      <rect x="37" y="0" width="3" height="45" fill="#111827"/>
      <rect x="43" y="0" width="1" height="45" fill="#111827"/>
      <rect x="47" y="0" width="4" height="45" fill="#111827"/>
      <rect x="54" y="0" width="2" height="45" fill="#111827"/>
      <rect x="60" y="0" width="6" height="45" fill="#111827"/>
      <rect x="70" y="0" width="1" height="45" fill="#111827"/>
      <rect x="74" y="0" width="3" height="45" fill="#111827"/>
      <rect x="80" y="0" width="2" height="45" fill="#111827"/>
      <rect x="85" y="0" width="4" height="45" fill="#111827"/>
      <rect x="92" y="0" width="1" height="45" fill="#111827"/>
      <rect x="96" y="0" width="5" height="45" fill="#111827"/>
      <rect x="105" y="0" width="2" height="45" fill="#111827"/>
      <rect x="110" y="0" width="4" height="45" fill="#111827"/>
      <rect x="117" y="0" width="1" height="45" fill="#111827"/>
      <rect x="122" y="0" width="3" height="45" fill="#111827"/>
      <rect x="128" y="0" width="2" height="45" fill="#111827"/>
      <rect x="134" y="0" width="6" height="45" fill="#111827"/>
      <rect x="144" y="0" width="2" height="45" fill="#111827"/>
      <rect x="150" y="0" width="3" height="45" fill="#111827"/>
      <rect x="156" y="0" width="1" height="45" fill="#111827"/>
      <rect x="160" y="0" width="4" height="45" fill="#111827"/>
      <rect x="168" y="0" width="2" height="45" fill="#111827"/>
      <rect x="174" y="0" width="5" height="45" fill="#111827"/>
      <rect x="183" y="0" width="2" height="45" fill="#111827"/>
      <rect x="188" y="0" width="4" height="45" fill="#111827"/>
      <rect x="195" y="0" width="3" height="45" fill="#111827"/>
    </g>

    <text x="160" y="445" font-size="11" text-anchor="middle" fill="#6b7280">THANK YOU FOR VISITING!</text>
  </g>
</svg>
`;
  return {
    front: { src: svgToDataUrl(svg), width: w, height: h },
    title: 'Cafe Receipt',
  };
}

export function createLetterSample(): {
  front: { src: string; width: number; height: number };
  title: string;
} {
  const w = 400;
  const h = 520;
  const svg = `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <!-- Warm cream parchment -->
  <rect width="${w}" height="${h}" fill="#fcf9f2" rx="2" />

  <!-- Coffee stain ring -->
  <ellipse cx="320" cy="420" rx="42" ry="40" fill="none" stroke="#d4b58e" stroke-width="4.5" opacity="0.32" stroke-dasharray="18 4 30 6 8 3" />
  <ellipse cx="321" cy="421" rx="39" ry="37" fill="#c49e72" opacity="0.04" />

  <!-- Ruled notebook lines -->
  <g stroke="#93c5fd" stroke-width="1" opacity="0.35">
    ${Array.from({ length: 15 }, (_, i) => `<line x1="30" y1="${120 + i * 26}" x2="${w - 30}" y2="${120 + i * 26}" />`).join('')}
  </g>

  <!-- Red left margin -->
  <line x1="75" y1="20" x2="75" y2="${h - 20}" stroke="#fca5a5" stroke-width="1.2" opacity="0.6" />

  <!-- Letter Text -->
  <g font-family="Georgia, serif" fill="#2d3748">
    <text x="88" y="80" font-size="13" font-style="italic" fill="#718096">October 19th</text>
    <text x="88" y="116" font-size="16" font-weight="bold">Dear Companion,</text>

    <text x="88" y="142" font-size="14" font-family="'Brush Script MT', 'Segoe Script', cursive, serif">
      The light across the desk feels tangible today.
    </text>
    <text x="88" y="168" font-size="14" font-family="'Brush Script MT', 'Segoe Script', cursive, serif">
      Paper has memory: a faint crease where folded,
    </text>
    <text x="88" y="194" font-size="14" font-family="'Brush Script MT', 'Segoe Script', cursive, serif">
      a gentle dog-ear at the corner, and the quiet
    </text>
    <text x="88" y="220" font-size="14" font-family="'Brush Script MT', 'Segoe Script', cursive, serif">
      satisfaction of picking it up to turn it over.
    </text>

    <text x="88" y="272" font-size="14" font-family="'Brush Script MT', 'Segoe Script', cursive, serif">
      I hope this note reaches you in good spirits.
    </text>

    <text x="240" y="350" font-size="15" font-family="'Brush Script MT', 'Segoe Script', cursive, serif" font-weight="bold">
      Yours always,
    </text>
    <text x="250" y="375" font-size="16" font-family="'Brush Script MT', 'Segoe Script', cursive, serif" fill="#3182ce">
      Adarsh
    </text>
  </g>
</svg>
`;
  return {
    front: { src: svgToDataUrl(svg), width: w, height: h },
    title: 'Handwritten Letter',
  };
}

export function createPostcardSample(): {
  front: { src: string; width: number; height: number };
  back: { src: string; width: number; height: number };
  title: string;
} {
  const w = 440;
  const h = 300;

  // Front: Polaroid/Postcard with landscape
  const frontSvg = `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="#ffffff" rx="2" />
  <!-- Landscape gradient artwork -->
  <g transform="translate(18, 18)">
    <rect width="${w - 36}" height="${h - 58}" rx="2" fill="url(#skyGradient)" />
    <!-- Mountains -->
    <path d="M 0,${h - 58} L 80,100 L 170,${h - 58} Z" fill="#475569" opacity="0.8" />
    <path d="M 110,${h - 58} L 220,60 L 320,${h - 58} Z" fill="#334155" />
    <path d="M 260,${h - 58} L 340,110 L ${w - 36},${h - 58} Z" fill="#1e293b" />
    <!-- Sun -->
    <circle cx="90" cy="65" r="24" fill="#fbbf24" opacity="0.9" />
    <!-- Pine trees silhouette -->
    <polygon points="40,210 48,185 56,210" fill="#0f172a" />
    <polygon points="52,210 58,190 64,210" fill="#0f172a" />
    <polygon points="340,210 348,180 356,210" fill="#0f172a" />
  </g>

  <defs>
    <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fdba74" />
      <stop offset="50%" stop-color="#f472b6" />
      <stop offset="100%" stop-color="#60a5fa" />
    </linearGradient>
  </defs>

  <text x="24" y="${h - 16}" font-family="-apple-system, sans-serif" font-size="12" font-weight="600" fill="#475569" letter-spacing="1">
    YOSEMITE NATIONAL PARK, CA
  </text>
</svg>
`;

  // Back: Postal divider, stamp, and handwritten message
  const backSvg = `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${w}" height="${h}" fill="#faf7f0" rx="2" />

  <!-- Center divider -->
  <line x1="${w / 2}" y1="30" x2="${w / 2}" y2="${h - 30}" stroke="#d1d5db" stroke-width="1.2" />

  <!-- Stamp in top-right -->
  <rect x="${w - 65}" y="24" width="45" height="52" fill="#fed7aa" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="3 3" />
  <circle cx="${w - 42}" cy="50" r="14" fill="#fb923c" opacity="0.6" />
  <text x="${w - 42}" y="54" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">USA</text>

  <!-- Postmark cancellation stamp -->
  <circle cx="${w - 90}" cy="50" r="26" fill="none" stroke="#64748b" stroke-width="1.2" opacity="0.6" />
  <line x1="${w - 120}" y1="42" x2="${w - 70}" y2="42" stroke="#64748b" stroke-width="1" opacity="0.6" />
  <line x1="${w - 120}" y1="50" x2="${w - 70}" y2="50" stroke="#64748b" stroke-width="1" opacity="0.6" />
  <line x1="${w - 120}" y1="58" x2="${w - 70}" y2="58" stroke="#64748b" stroke-width="1" opacity="0.6" />

  <!-- Left: Message -->
  <g font-family="'Brush Script MT', cursive, serif" font-size="15" fill="#334155">
    <text x="30" y="60">Greetings from the valley!</text>
    <text x="30" y="90">Hiked up the falls trail at</text>
    <text x="30" y="118">sunrise. Air was crisp and</text>
    <text x="30" y="146">the granite glowed amber.</text>
    <text x="30" y="180">Wish you were here!</text>
  </g>

  <!-- Right: Address lines -->
  <g stroke="#94a3b8" stroke-width="1">
    <line x1="${w / 2 + 25}" y1="130" x2="${w - 30}" y2="130" />
    <line x1="${w / 2 + 25}" y1="165" x2="${w - 30}" y2="165" />
    <line x1="${w / 2 + 25}" y1="200" x2="${w - 30}" y2="200" />
    <line x1="${w / 2 + 25}" y1="235" x2="${w - 30}" y2="235" />
  </g>
</svg>
`;

  return {
    front: { src: svgToDataUrl(frontSvg), width: w, height: h },
    back: { src: svgToDataUrl(backSvg), width: w, height: h },
    title: 'Vintage Postcard',
  };
}

export function createMemoSample(): {
  front: { src: string; width: number; height: number };
  title: string;
} {
  const w = 340;
  const h = 460;
  const svg = `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <!-- Yellow legal pad -->
  <rect width="${w}" height="${h}" fill="#fef9c3" rx="2" />

  <!-- Top binding strip -->
  <rect width="${w}" height="32" fill="#78350f" rx="1" />
  <line x1="0" y1="36" x2="${w}" y2="36" stroke="#ca8a04" stroke-dasharray="2 3" stroke-width="1" />

  <!-- Ruled lines -->
  <g stroke="#93c5fd" stroke-width="1" opacity="0.45">
    ${Array.from({ length: 13 }, (_, i) => `<line x1="20" y1="${80 + i * 28}" x2="${w - 20}" y2="${80 + i * 28}" />`).join('')}
  </g>

  <!-- Red double margin lines -->
  <line x1="55" y1="36" x2="55" y2="${h}" stroke="#f87171" stroke-width="1" opacity="0.65" />
  <line x1="59" y1="36" x2="59" y2="${h}" stroke="#f87171" stroke-width="1" opacity="0.65" />

  <!-- Memo content -->
  <g font-family="-apple-system, BlinkMacSystemFont, sans-serif" fill="#1e293b">
    <text x="70" y="68" font-size="14" font-weight="800" letter-spacing="1">PROJECT PAPERKIT</text>
    <text x="70" y="104" font-size="13">✓ CSS 3D tactile physics</text>
    <text x="70" y="132" font-size="13">✓ OpenCV contour scanner</text>
    <text x="70" y="160" font-size="13">✓ Dynamic light shadows</text>
    <text x="70" y="188" font-size="13">✓ 60fps gesture curl</text>
    <text x="70" y="216" font-size="13">✓ Lossless JSON roundtrip</text>
    <text x="70" y="244" font-size="13">✓ Book spread preview</text>
  </g>
</svg>
`;
  return {
    front: { src: svgToDataUrl(svg), width: w, height: h },
    title: 'Yellow Legal Memo',
  };
}
