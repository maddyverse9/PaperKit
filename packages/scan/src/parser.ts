/**
 * Heuristic Document Parser for OCR outputs.
 *
 * Classifies extracted text into semantic documents (Receipt, Bill/Invoice, Note/Memo)
 * and extracts structured fields to render onto skeuomorphic paper templates.
 */
import type { BillDoc, BillItem, ExtractedDoc, MemoDoc, ReceiptDoc, ReceiptItem } from './types.js';

const CURRENCY_REGEX = /[$€£¥₹]/;
const PRICE_REGEX = /(?:[$€£¥₹]\s*)?(\d{1,4}[.,]\d{2})/g;
const DATE_REGEX =
  /\b(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\b/i;
const TIME_REGEX = /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/;

function parseAmount(str: string): number | null {
  const clean = str.replace(/[$€£¥₹,\s]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function findCurrency(text: string): string {
  const match = text.match(CURRENCY_REGEX);
  return match ? match[0] : '$';
}

/**
 * Classifies raw text into 'receipt', 'bill', or 'memo'.
 */
export function classifyDocument(text: string, lines: string[]): 'receipt' | 'bill' | 'memo' {
  const lower = text.toLowerCase();

  let receiptScore = 0;
  let billScore = 0;
  let memoScore = 0;

  // Receipt indicators
  const receiptKeywords = [
    'receipt',
    'subtotal',
    'sub-total',
    'order #',
    'order no',
    'cashier',
    'tip',
    'gratuity',
    'change due',
    'item',
    'qty',
    'cafe',
    'coffee',
    'bakery',
    'restaurant',
    'market',
    'grocery',
    'thank you for shopping',
    'thank you for visiting',
  ];
  for (const kw of receiptKeywords) {
    if (lower.includes(kw)) receiptScore += 2;
  }

  // Bill/Invoice indicators
  const billKeywords = [
    'invoice',
    'statement',
    'bill to',
    'billed to',
    'remit to',
    'due date',
    'payment due',
    'balance due',
    'amount due',
    'invoice #',
    'invoice no',
    'account #',
    'account no',
    'terms: net',
    'po #',
    'total due',
  ];
  for (const kw of billKeywords) {
    if (lower.includes(kw)) billScore += 2;
  }

  // Memo/Note indicators
  const memoKeywords = [
    'dear',
    'meeting',
    'todo',
    'to-do',
    'memo',
    'reminder',
    'notes',
    'checklist',
    'sincerely',
    'yours truly',
    'yours always',
  ];
  for (const kw of memoKeywords) {
    if (lower.includes(kw)) memoScore += 2;
  }

  // Check lines for item + price patterns (common on receipts)
  let priceCount = 0;
  for (const line of lines) {
    if (/\d+[.,]\d{2}\s*$/.test(line)) {
      priceCount++;
    }
    if (/^[-*•[]\s+/.test(line)) {
      memoScore += 1;
    }
  }

  if (priceCount >= 2) receiptScore += 3;

  if (billScore > receiptScore && billScore >= memoScore) {
    return 'bill';
  }
  if (receiptScore >= billScore && receiptScore > memoScore) {
    return 'receipt';
  }
  if (memoScore > receiptScore && memoScore > billScore) {
    return 'memo';
  }

  // Default fallback based on whether price lines exist
  return priceCount >= 2 ? 'receipt' : 'memo';
}

/**
 * Parses raw lines into a structured ReceiptDoc.
 */
export function parseReceipt(text: string, lines: string[]): ReceiptDoc {
  const currency = findCurrency(text);
  const items: ReceiptItem[] = [];

  let merchant = 'STORE RECEIPT';
  let address: string | undefined;
  let date: string | undefined;
  let orderNumber: string | undefined;
  let subtotal: number | undefined;
  let tax: number | undefined;
  let total: number | undefined;
  let footer = 'THANK YOU FOR YOUR VISIT!';

  // Extract header info from first 4 lines
  const headerLines = lines.slice(0, 4);
  const firstHeader = headerLines[0];
  if (firstHeader && !PRICE_REGEX.test(firstHeader)) {
    merchant = firstHeader
      .toUpperCase()
      .replace(/[^A-Z0-9\s&'.-]/g, '')
      .trim();
    if (merchant.length < 2) merchant = 'CAFE & MARKET';
  }

  for (const line of headerLines.slice(1)) {
    const dMatch = line.match(DATE_REGEX);
    const tMatch = line.match(TIME_REGEX);
    if (dMatch || tMatch) {
      date = [dMatch?.[0], tMatch?.[0]].filter(Boolean).join(' • ');
    }

    const orderMatch = line.match(
      /(?:Order|Receipt|Ticket|Check)\s*(?:#|No\.?|Num)?[:\s]*([A-Z0-9-]+)/i,
    );
    if (orderMatch && orderMatch[1]) {
      orderNumber = `ORDER #${orderMatch[1]}`;
    }

    if (/\b(?:St|Street|Ave|Avenue|Blvd|Road|Way|Rd|Dr|Suite|CA|NY|TX|FL)\b/i.test(line)) {
      address = line.trim();
    }
  }

  // Process lines for items, subtotal, tax, and total
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const lower = line.toLowerCase();

    // Check for Order # anywhere
    if (!orderNumber) {
      const orderMatch = line.match(
        /(?:Order|Receipt|Check)\s*(?:#|No\.?|Num)?[:\s]*([A-Z0-9-]+)/i,
      );
      if (orderMatch && orderMatch[1]) orderNumber = `ORDER #${orderMatch[1]}`;
    }

    // Check for Date
    if (!date) {
      const dMatch = line.match(DATE_REGEX);
      if (dMatch && dMatch[0]) {
        const tMatch = line.match(TIME_REGEX);
        date = [dMatch[0], tMatch?.[0]].filter(Boolean).join(' • ');
      }
    }

    // Subtotal
    if (lower.includes('subtotal') || lower.includes('sub-total') || lower.includes('sub total')) {
      const match = line.match(/(?:[$€£¥₹]\s*)?(\d{1,4}[.,]\d{2})/);
      if (match && match[1]) subtotal = parseAmount(match[1]) ?? subtotal;
      continue;
    }

    // Tax
    if (lower.includes('tax') || lower.includes('vat') || lower.includes('gst')) {
      const match = line.match(/(?:[$€£¥₹]\s*)?(\d{1,4}[.,]\d{2})/);
      if (match && match[1]) tax = parseAmount(match[1]) ?? tax;
      continue;
    }

    // Total
    if (
      (lower.includes('total') || lower.includes('balance') || lower.includes('amount due')) &&
      !lower.includes('subtotal')
    ) {
      const match = line.match(/(?:[$€£¥₹]\s*)?(\d{1,4}[.,]\d{2})/);
      if (match && match[1]) total = parseAmount(match[1]) ?? total;
      continue;
    }

    // Skip footer / payments / misc metadata
    if (
      lower.includes('visa') ||
      lower.includes('mastercard') ||
      lower.includes('cash') ||
      lower.includes('change') ||
      lower.includes('auth') ||
      lower.includes('aid:') ||
      lower.includes('approved') ||
      lower.includes('thank you')
    ) {
      if (lower.includes('thank you')) footer = line.toUpperCase();
      continue;
    }

    // Item candidate: line with an item description and price at end
    const priceMatch = line.match(/(.*?)(?:[$€£¥₹]\s*)?(\d{1,4}[.,]\d{2})\s*$/);
    if (priceMatch && priceMatch[1] && priceMatch[2] && priceMatch[1].trim().length > 1) {
      const rawName = priceMatch[1].trim();
      const price = parseAmount(priceMatch[2]);
      if (price !== null && price > 0) {
        // Check for qty like "1x Cortado" or "2 Avocado Toast"
        const qtyMatch = rawName.match(/^(\d+)\s*[xX]?\s+(.*)/);
        let qty: number | undefined;
        let name = rawName;
        if (qtyMatch && qtyMatch[1] && qtyMatch[2]) {
          qty = parseInt(qtyMatch[1], 10);
          name = qtyMatch[2].trim();
        }
        // Filter out header lines that got caught
        if (name.length > 0 && !name.toLowerCase().includes('order')) {
          items.push({ name, qty, price });
        }
      }
    }
  }

  // If no items were detected, create a fallback item
  if (items.length === 0) {
    items.push({ name: 'General Purchase', price: total ?? 12.5 });
  }

  // Calculate missing totals
  if (total === undefined) {
    const itemSum = items.reduce((acc, it) => acc + it.price * (it.qty ?? 1), 0);
    subtotal = subtotal ?? itemSum;
    tax = tax ?? Math.round(subtotal * 0.0825 * 100) / 100;
    total = Math.round((subtotal + tax) * 100) / 100;
  } else {
    if (subtotal === undefined) {
      subtotal = tax ? total - tax : total;
    }
    if (tax === undefined) {
      tax = Math.max(0, Math.round((total - subtotal) * 100) / 100);
    }
  }

  return {
    kind: 'receipt',
    merchant,
    address,
    date:
      date ??
      'TODAY • ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    orderNumber: orderNumber ?? `ORDER #${Math.floor(1000 + Math.random() * 9000)}`,
    items,
    subtotal,
    tax,
    total,
    currency,
    footer,
  };
}

/**
 * Parses raw lines into a structured BillDoc.
 */
export function parseBill(text: string, lines: string[]): BillDoc {
  const currency = findCurrency(text);
  const items: BillItem[] = [];

  let company = 'SERVICE INVOICE';
  let billTo: string | undefined;
  let invoiceNumber: string | undefined;
  let issueDate: string | undefined;
  let dueDate: string | undefined;
  let status: 'PAID' | 'DUE' | 'OVERDUE' | 'PENDING' = 'DUE';
  let total: number | undefined;

  const lower = text.toLowerCase();
  if (lower.includes('paid in full') || lower.includes('paid')) {
    status = 'PAID';
  } else if (lower.includes('past due') || lower.includes('overdue')) {
    status = 'OVERDUE';
  }

  const firstLine = lines[0];
  if (firstLine) {
    company = firstLine.replace(/[^A-Za-z0-9\s&,.-]/g, '').trim();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const lLower = line.toLowerCase();

    // Invoice #
    const invMatch = line.match(
      /(?:Invoice|Account|Statement|Ref|Bill)\s*(?:#|No\.?|Number)?[:\s]*([A-Z0-9-]+)/i,
    );
    if (invMatch && invMatch[1] && !invoiceNumber) {
      invoiceNumber = invMatch[1];
    }

    // Dates
    if (lLower.includes('due') && !dueDate) {
      const dMatch = line.match(DATE_REGEX);
      if (dMatch && dMatch[0]) dueDate = dMatch[0];
    } else if ((lLower.includes('date') || lLower.includes('issued')) && !issueDate) {
      const dMatch = line.match(DATE_REGEX);
      if (dMatch && dMatch[0]) issueDate = dMatch[0];
    }

    // Bill To
    if (
      lLower.includes('bill to') ||
      lLower.includes('billed to') ||
      lLower.includes('customer:')
    ) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.toLowerCase().includes('invoice')) {
        billTo = nextLine;
      }
    }

    // Total / Balance
    if (
      lLower.includes('balance due') ||
      lLower.includes('total due') ||
      lLower.includes('amount due') ||
      lLower.includes('total amount')
    ) {
      const match = line.match(/(?:[$€£¥₹]\s*)?(\d{1,4}[.,]\d{2})/);
      if (match && match[1]) total = parseAmount(match[1]) ?? total;
      continue;
    }

    // Item
    const match = line.match(/(.*?)(?:[$€£¥₹]\s*)?(\d{1,4}[.,]\d{2})\s*$/);
    if (match && match[1] && match[2] && match[1].trim().length > 2) {
      const desc = match[1].trim();
      const amount = parseAmount(match[2]);
      if (
        amount !== null &&
        amount > 0 &&
        !lLower.includes('subtotal') &&
        !lLower.includes('total') &&
        !lLower.includes('balance') &&
        !lLower.includes('tax')
      ) {
        items.push({ description: desc, amount });
      }
    }
  }

  if (items.length === 0) {
    items.push({ description: 'Standard Services / Utility Charge', amount: total ?? 85.0 });
  }

  if (total === undefined) {
    total = items.reduce((acc, it) => acc + it.amount, 0);
  }

  const subtotal = items.reduce((acc, it) => acc + it.amount, 0);
  const tax = Math.max(0, Math.round((total - subtotal) * 100) / 100);

  return {
    kind: 'bill',
    company: company || 'UTILITY & SERVICE CO',
    billTo: billTo ?? 'Resident / Account Holder',
    invoiceNumber: invoiceNumber ?? `INV-${Math.floor(10000 + Math.random() * 90000)}`,
    issueDate: issueDate ?? new Date().toLocaleDateString(),
    dueDate: dueDate ?? 'Due Upon Receipt',
    status,
    items,
    subtotal,
    tax,
    total,
    currency,
  };
}

/**
 * Parses raw lines into a structured MemoDoc.
 */
export function parseMemo(text: string, lines: string[]): MemoDoc {
  let title = 'NOTE';
  let date: string | undefined;
  let signature: string | undefined;
  const contentLines: string[] = [];

  const lower = text.toLowerCase();
  const isStationery =
    lower.includes('dear ') ||
    lower.includes('yours') ||
    lower.includes('warmly') ||
    lower.includes('love,') ||
    lower.includes('sincerely');

  let startIndex = 0;
  const firstLine = lines[0];
  if (firstLine) {
    title = firstLine.replace(/^#+\s*/, '').trim();
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    // Check for date header
    if (!date && DATE_REGEX.test(line) && line.length < 30) {
      date = line;
      continue;
    }

    // Check for sign-off
    if (
      i >= lines.length - 2 &&
      /^(?:Yours|Sincerely|Best|Warmly|Thanks|Love|Cheers|Regards),?\s*(.*)$/i.test(line)
    ) {
      signature = line;
      continue;
    }

    contentLines.push(line);
  }

  if (contentLines.length === 0) {
    contentLines.push('Empty note contents.');
  }

  return {
    kind: 'memo',
    title: title || 'MEMO',
    date:
      date ??
      new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    lines: contentLines,
    signature,
    variant: isStationery ? 'stationery' : 'legal',
  };
}

/**
 * Parses raw OCR text into an appropriate structured document.
 */
export function parseDocument(rawText: string): ExtractedDoc {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const kind = classifyDocument(rawText, lines);

  switch (kind) {
    case 'receipt':
      return parseReceipt(rawText, lines);
    case 'bill':
      return parseBill(rawText, lines);
    case 'memo':
    default:
      return parseMemo(rawText, lines);
  }
}
