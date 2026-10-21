import { describe, expect, it } from 'vitest';
import { classifyDocument, parseDocument } from './parser.js';
import { renderBill, renderLegalMemo, renderReceipt } from './templates.js';

describe('OCR document parser', () => {
  it('classifies a receipt correctly', () => {
    const raw = `
      BLUE BOTTLE COFFEE
      315 Linden St, San Francisco
      Order #4829
      1x Cortado $5.50
      1x Almond Croissant $4.75
      Subtotal: $10.25
      Tax: $0.87
      Total: $11.12
      Thank you for visiting!
    `;
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    expect(classifyDocument(raw, lines)).toBe('receipt');
  });

  it('classifies a bill/invoice correctly', () => {
    const raw = `
      PACIFIC CLOUD SERVICES
      INVOICE #INV-98231
      Due Date: 11/15/2026
      Bill To: ACME Corporation
      Cloud Compute Cluster $120.00
      Object Storage Tier $35.00
      Total Due: $155.00
    `;
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    expect(classifyDocument(raw, lines)).toBe('bill');
  });

  it('classifies a memo note correctly', () => {
    const raw = `
      PROJECT PAPERKIT GOALS
      - Implement client-side OCR
      - Render skeuomorphic paper templates
      - Add tactile curl animations
    `;
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    expect(classifyDocument(raw, lines)).toBe('memo');
  });

  it('extracts structured receipt fields', () => {
    const raw = `
      ATELIER CAFE & BAKERY
      Order #8942
      1x Pour Over Coffee $6.00
      2x Cardamom Bun $12.00
      Subtotal $18.00
      Tax $1.55
      Total $19.55
    `;
    const doc = parseDocument(raw);
    expect(doc.kind).toBe('receipt');
    if (doc.kind === 'receipt') {
      expect(doc.merchant).toContain('ATELIER CAFE');
      expect(doc.items.length).toBe(2);
      expect(doc.items[0].name).toContain('Pour Over Coffee');
      expect(doc.items[0].price).toBe(6.0);
      expect(doc.total).toBe(19.55);
    }
  });

  it('extracts structured invoice fields', () => {
    const raw = `
      ACME CONSULTING
      Invoice: ACME-402
      Due Date: 12/01/2026
      Bill To: Tech Startup Inc
      Design System Architecture $1500.00
      Performance Audit $800.00
      Balance Due: $2300.00
    `;
    const doc = parseDocument(raw);
    expect(doc.kind).toBe('bill');
    if (doc.kind === 'bill') {
      expect(doc.company).toContain('ACME CONSULTING');
      expect(doc.invoiceNumber).toBe('ACME-402');
      expect(doc.dueDate).toBe('12/01/2026');
      expect(doc.items.length).toBe(2);
      expect(doc.total).toBe(2300.0);
    }
  });
});

describe('Skeuomorphic templates', () => {
  it('renders a receipt template with torn edge and barcode', () => {
    const receipt = renderReceipt({
      kind: 'receipt',
      merchant: 'TEST BISTRO',
      items: [{ name: 'Espresso', price: 4.0 }],
      total: 4.0,
      currency: '$',
    });

    expect(receipt.kind).toBe('receipt');
    expect(receipt.width).toBe(320);
    expect(receipt.svg).toContain('TEST BISTRO');
    expect(receipt.svg).toContain('Espresso');
    expect(receipt.svg).toContain('TOTAL');
    expect(receipt.dataUrl).toMatch(/^data:image\/svg\+xml/);
  });

  it('renders a bill template with stamp and table', () => {
    const bill = renderBill({
      kind: 'bill',
      company: 'METRO POWER',
      items: [{ description: 'Electric Service', amount: 92.5 }],
      total: 92.5,
      currency: '$',
      status: 'PAID',
    });

    expect(bill.kind).toBe('bill');
    expect(bill.svg).toContain('METRO POWER');
    expect(bill.svg).toContain('PAID');
    expect(bill.dataUrl).toMatch(/^data:image\/svg\+xml/);
  });

  it('renders a legal memo with ruled lines and margin', () => {
    const memo = renderLegalMemo({
      kind: 'memo',
      title: 'MEETING NOTES',
      lines: ['Review sprint velocity', 'Plan Q4 roadmap'],
    });

    expect(memo.kind).toBe('legal-memo');
    expect(memo.svg).toContain('MEETING NOTES');
    expect(memo.svg).toContain('Review sprint velocity');
  });

  it('safely escapes special XML characters in content', () => {
    const receipt = renderReceipt({
      kind: 'receipt',
      merchant: 'FISH & CHIPS <SPECIAL>',
      items: [{ name: 'Rock & Sole "Fresh"', price: 15.0 }],
      total: 15.0,
      currency: '$',
    });

    expect(receipt.svg).toContain('FISH &amp; CHIPS &lt;SPECIAL&gt;');
    expect(receipt.svg).toContain('Rock &amp; Sole &quot;Fresh&quot;');
  });
});
