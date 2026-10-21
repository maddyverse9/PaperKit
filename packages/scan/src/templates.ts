/**
 * Skeuomorphic SVG Paper Templates for PaperKit.
 *
 * Generates tactile, vector-rendered paper sheets:
 * 1. Thermal Cafe / Retail Receipt (with realistic torn bottom edge and barcode)
 * 2. Modern Invoice / Utility Bill (with tabular charges, total due box, and distress stamp)
 * 3. Yellow Legal Memo Pad (with leatherette binding, red margins, and blue ruled lines)
 * 4. Vintage Parchment Note (with cursive script, date header, and coffee stain)
 */
import type {
  BillDoc,
  ExtractedDoc,
  MemoDoc,
  ReceiptDoc,
  RenderedTemplate,
  TemplateKind,
} from './types.js';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a realistic torn / saw-toothed bottom edge path for thermal receipt paper.
 */
function generateTornEdgePath(w: number, h: number): string {
  const toothWidth = 20;
  const numTeeth = Math.floor(w / toothWidth);
  let path = `M 0,0 L ${w},0 L ${w},${h - 14}`;

  for (let i = numTeeth; i >= 0; i--) {
    const x = i * toothWidth;
    const isDip = i % 2 === 0;
    const y = isDip ? h - 22 : h - 6;
    const midX = x + toothWidth / 2;
    const midY = isDip ? h - 8 : h - 20;
    path += ` Q ${midX},${midY} ${x},${y}`;
  }

  path += ` L 0,${h - 10} Z`;
  return path;
}

/**
 * 1. Thermal Cafe & Store Receipt Template.
 */
export function renderReceipt(receipt: ReceiptDoc): RenderedTemplate {
  const w = 320;
  const itemsHeight = receipt.items.length * 30;
  const h = Math.max(520, 360 + itemsHeight);

  const tornPath = generateTornEdgePath(w, h);

  let currentY = 145;
  const itemsSvg = receipt.items
    .map((item) => {
      const lineY = currentY;
      currentY += 28;
      const label = item.qty ? `${item.qty}x ${item.name}` : item.name;
      const formattedPrice = `${receipt.currency} ${item.price.toFixed(2)}`;
      return `
    <text x="28" y="${lineY}" font-size="13">${escapeXml(label)}</text>
    <text x="${w - 28}" y="${lineY}" font-size="13" text-anchor="end">${escapeXml(formattedPrice)}</text>
      `;
    })
    .join('');

  const dividerY1 = currentY + 4;
  currentY += 30;

  const subtotalY = currentY;
  currentY += 24;
  const taxY = currentY;
  currentY += 28;
  const totalY = currentY;
  currentY += 36;
  const barcodeY = currentY;

  const svg = `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <!-- Textured thermal paper background with torn edge -->
  <path d="${tornPath}" fill="#fdfbf7" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))" />

  <g font-family="'Courier New', Courier, monospace" fill="#1f2937">
    <!-- Header -->
    <text x="${w / 2}" y="52" font-size="17" font-weight="bold" text-anchor="middle" letter-spacing="2">
      ${escapeXml(receipt.merchant)}
    </text>
    ${
      receipt.address
        ? `<text x="${w / 2}" y="74" font-size="11" text-anchor="middle" fill="#6b7280">${escapeXml(receipt.address)}</text>`
        : ''
    }
    <text x="${w / 2}" y="${receipt.address ? 92 : 76}" font-size="10" text-anchor="middle" fill="#9ca3af">
      ${escapeXml(receipt.orderNumber ?? 'ORDER #1042')} • ${escapeXml(receipt.date ?? 'TODAY')}
    </text>

    <!-- Top Divider -->
    <line x1="24" y1="${receipt.address ? 112 : 98}" x2="${w - 24}" y2="${receipt.address ? 112 : 98}" stroke="#d1d5db" stroke-dasharray="4 4" stroke-width="1.2" />

    <!-- Line Items -->
    ${itemsSvg}

    <!-- Middle Divider -->
    <line x1="24" y1="${dividerY1}" x2="${w - 24}" y2="${dividerY1}" stroke="#d1d5db" stroke-dasharray="4 4" stroke-width="1.2" />

    <!-- Totals -->
    ${
      receipt.subtotal !== undefined
        ? `
    <text x="28" y="${subtotalY}" font-size="12" fill="#4b5563">SUBTOTAL</text>
    <text x="${w - 28}" y="${subtotalY}" font-size="12" text-anchor="end" fill="#4b5563">${escapeXml(receipt.currency)} ${receipt.subtotal.toFixed(2)}</text>
    `
        : ''
    }
    ${
      receipt.tax !== undefined
        ? `
    <text x="28" y="${taxY}" font-size="12" fill="#4b5563">TAX</text>
    <text x="${w - 28}" y="${taxY}" font-size="12" text-anchor="end" fill="#4b5563">${escapeXml(receipt.currency)} ${receipt.tax.toFixed(2)}</text>
    `
        : ''
    }

    <text x="28" y="${totalY}" font-size="16" font-weight="bold">TOTAL</text>
    <text x="${w - 28}" y="${totalY}" font-size="16" font-weight="bold" text-anchor="end">${escapeXml(receipt.currency)} ${receipt.total.toFixed(2)}</text>

    <!-- Barcode simulation -->
    <g transform="translate(60, ${barcodeY})">
      <rect x="0" y="0" width="3" height="40" fill="#111827"/>
      <rect x="5" y="0" width="1" height="40" fill="#111827"/>
      <rect x="8" y="0" width="4" height="40" fill="#111827"/>
      <rect x="15" y="0" width="2" height="40" fill="#111827"/>
      <rect x="20" y="0" width="1" height="40" fill="#111827"/>
      <rect x="24" y="0" width="5" height="40" fill="#111827"/>
      <rect x="32" y="0" width="2" height="40" fill="#111827"/>
      <rect x="37" y="0" width="3" height="40" fill="#111827"/>
      <rect x="43" y="0" width="1" height="40" fill="#111827"/>
      <rect x="47" y="0" width="4" height="40" fill="#111827"/>
      <rect x="54" y="0" width="2" height="40" fill="#111827"/>
      <rect x="60" y="0" width="6" height="40" fill="#111827"/>
      <rect x="70" y="0" width="1" height="40" fill="#111827"/>
      <rect x="74" y="0" width="3" height="40" fill="#111827"/>
      <rect x="80" y="0" width="2" height="40" fill="#111827"/>
      <rect x="85" y="0" width="4" height="40" fill="#111827"/>
      <rect x="92" y="0" width="1" height="40" fill="#111827"/>
      <rect x="96" y="0" width="5" height="40" fill="#111827"/>
      <rect x="105" y="0" width="2" height="40" fill="#111827"/>
      <rect x="110" y="0" width="4" height="40" fill="#111827"/>
      <rect x="117" y="0" width="1" height="40" fill="#111827"/>
      <rect x="122" y="0" width="3" height="40" fill="#111827"/>
      <rect x="128" y="0" width="2" height="40" fill="#111827"/>
      <rect x="134" y="0" width="6" height="40" fill="#111827"/>
      <rect x="144" y="0" width="2" height="40" fill="#111827"/>
      <rect x="150" y="0" width="3" height="40" fill="#111827"/>
      <rect x="156" y="0" width="1" height="40" fill="#111827"/>
      <rect x="160" y="0" width="4" height="40" fill="#111827"/>
      <rect x="168" y="0" width="2" height="40" fill="#111827"/>
      <rect x="174" y="0" width="5" height="40" fill="#111827"/>
      <rect x="183" y="0" width="2" height="40" fill="#111827"/>
      <rect x="188" y="0" width="4" height="40" fill="#111827"/>
      <rect x="195" y="0" width="3" height="40" fill="#111827"/>
    </g>

    <!-- Footer -->
    <text x="${w / 2}" y="${barcodeY + 68}" font-size="11" text-anchor="middle" fill="#6b7280">
      ${escapeXml(receipt.footer ?? 'THANK YOU FOR VISITING!')}
    </text>
  </g>
</svg>
`;

  return {
    svg,
    dataUrl: svgToDataUrl(svg),
    width: w,
    height: h,
    title: receipt.merchant,
    kind: 'receipt',
  };
}

/**
 * 2. Modern Invoice & Utility Bill Template.
 */
export function renderBill(bill: BillDoc): RenderedTemplate {
  const w = 420;
  const itemsHeight = bill.items.length * 36;
  const h = Math.max(540, 380 + itemsHeight);

  let currentY = 195;
  const itemsSvg = bill.items
    .map((item, idx) => {
      const lineY = currentY;
      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      currentY += 34;
      return `
    <rect x="28" y="${lineY - 20}" width="${w - 56}" height="32" fill="${rowBg}" rx="3" />
    <text x="36" y="${lineY}" font-size="13" fill="#1e293b">${escapeXml(item.description)}</text>
    <text x="${w - 36}" y="${lineY}" font-size="13" font-weight="600" text-anchor="end" fill="#0f172a">${escapeXml(bill.currency)} ${item.amount.toFixed(2)}</text>
      `;
    })
    .join('');

  const totalsBoxY = currentY + 16;
  const stampColor = bill.status === 'PAID' ? '#16a34a' : '#dc2626';
  const stampText = bill.status === 'PAID' ? 'PAID' : 'PAYMENT DUE';

  const svg = `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <!-- Clean bright white invoice paper with subtle border -->
  <rect width="${w}" height="${h}" fill="#fcfcfd" stroke="#e2e8f0" stroke-width="1.5" rx="3" />

  <!-- Top Blue Accent Bar -->
  <rect width="${w}" height="8" fill="#2563eb" rx="2" />

  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <!-- Header -->
    <text x="32" y="48" font-size="18" font-weight="800" fill="#0f172a">${escapeXml(bill.company)}</text>
    <text x="32" y="68" font-size="12" fill="#64748b">Invoice • ${escapeXml(bill.invoiceNumber ?? 'INV-001')}</text>

    <!-- Top Right Details Badge -->
    <rect x="${w - 150}" y="28" width="118" height="52" fill="#eff6ff" rx="4" />
    <text x="${w - 140}" y="48" font-size="11" fill="#3b82f6" font-weight="600">DUE DATE</text>
    <text x="${w - 140}" y="66" font-size="13" font-weight="700" fill="#1e40af">${escapeXml(bill.dueDate ?? 'Due on Receipt')}</text>

    <!-- Recipient Info -->
    <rect x="28" y="94" width="${w - 56}" height="42" fill="#f8fafc" stroke="#f1f5f9" rx="4" />
    <text x="40" y="112" font-size="10" font-weight="700" fill="#94a3b8" letter-spacing="1">BILL TO:</text>
    <text x="40" y="127" font-size="13" font-weight="600" fill="#334155">${escapeXml(bill.billTo ?? 'Valued Customer')}</text>

    <!-- Table Header -->
    <rect x="28" y="150" width="${w - 56}" height="28" fill="#e2e8f0" rx="3" />
    <text x="36" y="168" font-size="11" font-weight="700" fill="#475569" letter-spacing="1">ITEM DESCRIPTION</text>
    <text x="${w - 36}" y="168" font-size="11" font-weight="700" fill="#475569" text-anchor="end" letter-spacing="1">AMOUNT</text>

    <!-- Table Rows -->
    ${itemsSvg}

    <!-- Totals Summary Card -->
    <g transform="translate(${w - 210}, ${totalsBoxY})">
      <rect width="182" height="74" fill="#eff6ff" stroke="#bfdbfe" rx="6" />
      <text x="14" y="24" font-size="11" fill="#475569">SUBTOTAL</text>
      <text x="168" y="24" font-size="11" text-anchor="end" fill="#475569">${escapeXml(bill.currency)} ${(bill.subtotal ?? bill.total).toFixed(2)}</text>

      <line x1="14" y1="36" x2="168" y2="36" stroke="#bfdbfe" stroke-width="1" />

      <text x="14" y="58" font-size="14" font-weight="800" fill="#1e3a8a">TOTAL DUE</text>
      <text x="168" y="58" font-size="16" font-weight="800" text-anchor="end" fill="#1d4ed8">${escapeXml(bill.currency)} ${bill.total.toFixed(2)}</text>
    </g>

    <!-- Rubber Stamp Overlay -->
    <g transform="translate(60, ${totalsBoxY + 30}) rotate(-14)">
      <rect x="-10" y="-18" width="130" height="38" fill="none" stroke="${stampColor}" stroke-width="2.5" stroke-dasharray="6 3" rx="4" opacity="0.85" />
      <text x="55" y="6" font-size="15" font-weight="900" fill="${stampColor}" text-anchor="middle" letter-spacing="2" opacity="0.88">
        ${stampText}
      </text>
    </g>
  </g>
</svg>
`;

  return {
    svg,
    dataUrl: svgToDataUrl(svg),
    width: w,
    height: h,
    title: bill.company,
    kind: 'bill',
  };
}

/**
 * 3. Yellow Legal Memo Pad Template.
 */
export function renderLegalMemo(memo: MemoDoc): RenderedTemplate {
  const w = 340;
  const lineSpacing = 28;
  const linesHeight = memo.lines.length * lineSpacing;
  const h = Math.max(480, 160 + linesHeight);

  const numRuledLines = Math.floor((h - 80) / lineSpacing);
  const ruledLinesSvg = Array.from({ length: numRuledLines }, (_, i) => {
    const y = 80 + i * lineSpacing;
    return `<line x1="20" y1="${y}" x2="${w - 20}" y2="${y}" stroke="#93c5fd" stroke-width="1" opacity="0.45" />`;
  }).join('');

  let currentY = 104;
  const contentSvg = memo.lines
    .map((line) => {
      const y = currentY;
      currentY += lineSpacing;
      return `<text x="70" y="${y}" font-size="13" fill="#1e293b">${escapeXml(line)}</text>`;
    })
    .join('');

  const svg = `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <!-- Yellow legal pad stock -->
  <rect width="${w}" height="${h}" fill="#fef9c3" rx="2" />

  <!-- Top Dark Leatherette Binding Strip -->
  <rect width="${w}" height="32" fill="#78350f" rx="1" />
  <line x1="0" y1="36" x2="${w}" y2="36" stroke="#ca8a04" stroke-dasharray="2 3" stroke-width="1" />

  <!-- Ruled Blue Lines -->
  <g>${ruledLinesSvg}</g>

  <!-- Red Vertical Margin Lines -->
  <line x1="55" y1="36" x2="55" y2="${h}" stroke="#f87171" stroke-width="1" opacity="0.65" />
  <line x1="59" y1="36" x2="59" y2="${h}" stroke="#f87171" stroke-width="1" opacity="0.65" />

  <!-- Text Content -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
    <!-- Header Title -->
    <text x="70" y="68" font-size="14" font-weight="800" letter-spacing="1" fill="#0f172a">
      ${escapeXml(memo.title.toUpperCase())}
    </text>
    ${
      memo.date
        ? `<text x="${w - 28}" y="68" font-size="11" font-weight="600" text-anchor="end" fill="#b45309">${escapeXml(memo.date)}</text>`
        : ''
    }

    <!-- Content Items -->
    ${contentSvg}

    ${
      memo.signature
        ? `<text x="${w - 30}" y="${currentY + 10}" font-size="13" font-style="italic" text-anchor="end" fill="#475569">${escapeXml(memo.signature)}</text>`
        : ''
    }
  </g>
</svg>
`;

  return {
    svg,
    dataUrl: svgToDataUrl(svg),
    width: w,
    height: h,
    title: memo.title,
    kind: 'legal-memo',
  };
}

/**
 * 4. Vintage Parchment Stationery Note Template.
 */
export function renderStationeryNote(memo: MemoDoc): RenderedTemplate {
  const w = 380;
  const lineSpacing = 26;
  const linesHeight = memo.lines.length * lineSpacing;
  const h = Math.max(500, 200 + linesHeight);

  const numLines = Math.floor((h - 120) / lineSpacing);
  const notebookLinesSvg = Array.from({ length: numLines }, (_, i) => {
    const y = 120 + i * lineSpacing;
    return `<line x1="30" y1="${y}" x2="${w - 30}" y2="${y}" stroke="#93c5fd" stroke-width="1" opacity="0.32" />`;
  }).join('');

  let currentY = 142;
  const contentSvg = memo.lines
    .map((line) => {
      const y = currentY;
      currentY += lineSpacing;
      return `<text x="88" y="${y}" font-size="14" font-family="'Brush Script MT', 'Segoe Script', cursive, Georgia, serif">${escapeXml(line)}</text>`;
    })
    .join('');

  const svg = `
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <!-- Warm cream parchment -->
  <rect width="${w}" height="${h}" fill="#fcf9f2" rx="2" />

  <!-- Coffee stain ring accent in corner -->
  <ellipse cx="${w - 60}" cy="${h - 70}" rx="38" ry="36" fill="none" stroke="#d4b58e" stroke-width="4" opacity="0.28" stroke-dasharray="16 4 28 6 8 3" />
  <ellipse cx="${w - 59}" cy="${h - 69}" rx="35" ry="33" fill="#c49e72" opacity="0.04" />

  <!-- Notebook lines -->
  <g>${notebookLinesSvg}</g>

  <!-- Coral left margin line -->
  <line x1="75" y1="20" x2="75" y2="${h - 20}" stroke="#fca5a5" stroke-width="1.2" opacity="0.6" />

  <g font-family="Georgia, serif" fill="#2d3748">
    ${
      memo.date
        ? `<text x="88" y="78" font-size="13" font-style="italic" fill="#718096">${escapeXml(memo.date)}</text>`
        : ''
    }
    <text x="88" y="112" font-size="16" font-weight="bold">${escapeXml(memo.title)}</text>

    <!-- Body lines -->
    ${contentSvg}

    ${
      memo.signature
        ? `<text x="${w - 50}" y="${currentY + 20}" font-size="15" font-family="'Brush Script MT', 'Segoe Script', cursive, serif" text-anchor="end" fill="#3182ce">${escapeXml(memo.signature)}</text>`
        : ''
    }
  </g>
</svg>
`;

  return {
    svg,
    dataUrl: svgToDataUrl(svg),
    width: w,
    height: h,
    title: memo.title,
    kind: 'stationery-note',
  };
}

/**
 * Renders an ExtractedDoc to a RenderedTemplate SVG paper.
 * Can optionally override the target template kind.
 */
export function renderTemplate(doc: ExtractedDoc, targetKind?: TemplateKind): RenderedTemplate {
  const kind =
    targetKind ??
    (doc.kind === 'memo'
      ? doc.variant === 'stationery'
        ? 'stationery-note'
        : 'legal-memo'
      : doc.kind);

  switch (kind) {
    case 'receipt': {
      if (doc.kind === 'receipt') return renderReceipt(doc);
      // Adapt bill or memo into receipt format
      const items =
        doc.kind === 'bill'
          ? doc.items.map((b) => ({ name: b.description, price: b.amount }))
          : doc.lines.map((l, i) => ({ name: l, price: 5 + i * 2 }));
      const total = doc.kind === 'bill' ? doc.total : items.reduce((s, it) => s + it.price, 0);
      return renderReceipt({
        kind: 'receipt',
        merchant: doc.kind === 'bill' ? doc.company : doc.title,
        items,
        total,
        currency: doc.kind === 'bill' ? doc.currency : '$',
      });
    }
    case 'bill': {
      if (doc.kind === 'bill') return renderBill(doc);
      // Adapt receipt or memo into bill format
      const items =
        doc.kind === 'receipt'
          ? doc.items.map((r) => ({ description: r.name, amount: r.price }))
          : doc.lines.map((l, i) => ({ description: l, amount: 15 + i * 10 }));
      const total = doc.kind === 'receipt' ? doc.total : items.reduce((s, it) => s + it.amount, 0);
      return renderBill({
        kind: 'bill',
        company: doc.kind === 'receipt' ? doc.merchant : doc.title,
        items,
        total,
        currency: doc.kind === 'receipt' ? doc.currency : '$',
        status: 'DUE',
      });
    }
    case 'legal-memo': {
      if (doc.kind === 'memo') return renderLegalMemo(doc);
      const lines =
        doc.kind === 'receipt'
          ? doc.items.map(
              (i) =>
                `• ${i.qty ? i.qty + 'x ' : ''}${i.name} - ${doc.currency}${i.price.toFixed(2)}`,
            )
          : doc.items.map((i) => `• ${i.description} - ${doc.currency}${i.amount.toFixed(2)}`);
      return renderLegalMemo({
        kind: 'memo',
        title: doc.kind === 'receipt' ? doc.merchant : doc.company,
        lines,
      });
    }
    case 'stationery-note': {
      if (doc.kind === 'memo') return renderStationeryNote(doc);
      const lines =
        doc.kind === 'receipt'
          ? doc.items.map((i) => `${i.name}: ${doc.currency}${i.price.toFixed(2)}`)
          : doc.items.map((i) => `${i.description}: ${doc.currency}${i.amount.toFixed(2)}`);
      return renderStationeryNote({
        kind: 'memo',
        title: doc.kind === 'receipt' ? doc.merchant : doc.company,
        lines,
      });
    }
    default:
      return renderReceipt(doc as ReceiptDoc);
  }
}
