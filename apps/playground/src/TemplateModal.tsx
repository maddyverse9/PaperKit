import React, { useMemo, useState } from 'react';
import {
  type ExtractedDoc,
  type RenderedTemplate,
  type TemplateKind,
  renderTemplate,
} from '@paperkit/scan';

export interface TemplateModalProps {
  initialDocument: ExtractedDoc;
  rawOcrText?: string;
  onConfirm: (rendered: RenderedTemplate) => void;
  onCancel: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  initialDocument,
  rawOcrText,
  onConfirm,
  onCancel,
}) => {
  // Determine initial template kind
  const initialKind: TemplateKind =
    initialDocument.kind === 'receipt'
      ? 'receipt'
      : initialDocument.kind === 'bill'
        ? 'bill'
        : initialDocument.variant === 'stationery'
          ? 'stationery-note'
          : 'legal-memo';

  const [kind, setKind] = useState<TemplateKind>(initialKind);
  const [doc, setDoc] = useState<ExtractedDoc>(() => JSON.parse(JSON.stringify(initialDocument)));
  const [showRawOcr, setShowRawOcr] = useState(false);

  // Render template dynamically on any change
  const rendered = useMemo(() => {
    try {
      return renderTemplate(doc, kind);
    } catch (err) {
      console.error('Failed to render template:', err);
      return renderTemplate(initialDocument, kind);
    }
  }, [doc, kind, initialDocument]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(5, 7, 12, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '90vh',
          backgroundColor: '#181a20',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f3f4f6',
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1b1d24',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>✨</span>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                Tactile Paper Template
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                100% Client-Side OCR
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Extracted content mapped to a physical paper template. Pick a style or edit details
              below.
            </p>
          </div>

          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
            minHeight: '480px',
          }}
        >
          {/* Left Column: Live SVG Paper Preview */}
          <div
            style={{
              flex: '1 1 50%',
              backgroundColor: '#0f1117',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '12px',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Paper Preview ({rendered.width} × {rendered.height}px)
            </div>

            <div
              style={{
                maxHeight: '440px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter:
                  'drop-shadow(0 15px 30px rgba(0, 0, 0, 0.45)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25))',
                transform: 'rotate(-1deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <img
                src={rendered.dataUrl}
                alt={rendered.title}
                style={{
                  maxHeight: '420px',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  borderRadius: '2px',
                }}
              />
            </div>

            <div
              style={{
                marginTop: '16px',
                fontSize: '12px',
                color: '#94a3b8',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                padding: '6px 12px',
                borderRadius: '8px',
              }}
            >
              Tip: On the desk, you can press <strong>[F]</strong> or double-click to flip and
              inspect!
            </div>
          </div>

          {/* Right Column: Template Selector & Field Editor */}
          <div
            style={{
              flex: '1 1 50%',
              padding: '20px 24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Style Selector Tabs */}
            <div>
              <label style={labelStyle}>Choose Paper Stock Template</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  marginTop: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setKind('receipt')}
                  style={kind === 'receipt' ? activeTabStyle : inactiveTabStyle}
                >
                  <span style={{ fontSize: '16px' }}>🧾</span>
                  <span>Thermal Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKind('bill')}
                  style={kind === 'bill' ? activeTabStyle : inactiveTabStyle}
                >
                  <span style={{ fontSize: '16px' }}>📑</span>
                  <span>Modern Invoice / Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKind('legal-memo')}
                  style={kind === 'legal-memo' ? activeTabStyle : inactiveTabStyle}
                >
                  <span style={{ fontSize: '16px' }}>📝</span>
                  <span>Yellow Legal Pad</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKind('stationery-note')}
                  style={kind === 'stationery-note' ? activeTabStyle : inactiveTabStyle}
                >
                  <span style={{ fontSize: '16px' }}>✉️</span>
                  <span>Vintage Note</span>
                </button>
              </div>
            </div>

            {/* Form Fields based on Template Kind */}
            {kind === 'receipt' && (
              <ReceiptEditor
                doc={doc.kind === 'receipt' ? doc : adaptToReceipt(doc)}
                onChange={(updated) => setDoc(updated)}
              />
            )}

            {kind === 'bill' && (
              <BillEditor
                doc={doc.kind === 'bill' ? doc : adaptToBill(doc)}
                onChange={(updated) => setDoc(updated)}
              />
            )}

            {(kind === 'legal-memo' || kind === 'stationery-note') && (
              <MemoEditor
                doc={doc.kind === 'memo' ? doc : adaptToMemo(doc)}
                onChange={(updated) => setDoc(updated)}
              />
            )}

            {/* Raw OCR Accordion */}
            {rawOcrText && (
              <div style={{ marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowRawOcr(!showRawOcr)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#60a5fa',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{showRawOcr ? '▼ Hide' : '▶ Show'} Raw Extracted OCR Text</span>
                </button>
                {showRawOcr && (
                  <pre
                    style={{
                      marginTop: '8px',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#111318',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '11px',
                      color: '#94a3b8',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'monospace',
                    }}
                  >
                    {rawOcrText}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: '#1b1d24',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'transparent',
              color: '#d1d5db',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(rendered)}
            style={{
              padding: '8px 22px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)',
            }}
          >
            <span>📄</span>
            <span>Place Template on Board</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Sub-Editors for Each Document Style
// ==========================================

const ReceiptEditor: React.FC<{
  doc: any;
  onChange: (d: any) => void;
}> = ({ doc, onChange }) => {
  const updateField = (key: string, val: any) => {
    onChange({ ...doc, [key]: val });
  };

  const updateItem = (index: number, key: string, val: any) => {
    const nextItems = [...doc.items];
    nextItems[index] = { ...nextItems[index], [key]: val };
    // recalculate totals
    const subtotal = nextItems.reduce((acc, it) => acc + (it.price || 0) * (it.qty || 1), 0);
    const tax = doc.tax !== undefined ? doc.tax : Math.round(subtotal * 0.0825 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    onChange({ ...doc, items: nextItems, subtotal, total });
  };

  const addItem = () => {
    const nextItems = [...doc.items, { name: 'New Item', price: 4.5, qty: 1 }];
    const subtotal = nextItems.reduce((acc, it) => acc + (it.price || 0) * (it.qty || 1), 0);
    const total = Math.round((subtotal + (doc.tax || 0)) * 100) / 100;
    onChange({ ...doc, items: nextItems, subtotal, total });
  };

  const removeItem = (index: number) => {
    const nextItems = doc.items.filter((_: any, idx: number) => idx !== index);
    const subtotal = nextItems.reduce(
      (acc: number, it: any) => acc + (it.price || 0) * (it.qty || 1),
      0,
    );
    const total = Math.round((subtotal + (doc.tax || 0)) * 100) / 100;
    onChange({ ...doc, items: nextItems, subtotal, total });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={labelStyle}>Merchant / Store Name</label>
        <input
          type="text"
          value={doc.merchant || ''}
          onChange={(e) => updateField('merchant', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Order / Receipt #</label>
          <input
            type="text"
            value={doc.orderNumber || ''}
            onChange={(e) => updateField('orderNumber', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Date & Time</label>
          <input
            type="text"
            value={doc.date || ''}
            onChange={(e) => updateField('date', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={labelStyle}>Line Items ({doc.items?.length || 0})</label>
          <button
            type="button"
            onClick={addItem}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add Item
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
          {doc.items?.map((item: any, i: number) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                padding: '6px 8px',
                borderRadius: '6px',
              }}
            >
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(i, 'name', e.target.value)}
                style={{ ...inputStyle, flex: 1, padding: '4px 8px' }}
                placeholder="Item name"
              />
              <input
                type="number"
                step="0.01"
                value={item.price}
                onChange={(e) => updateItem(i, 'price', parseFloat(e.target.value) || 0)}
                style={{ ...inputStyle, width: '70px', padding: '4px 8px', textAlign: 'right' }}
                placeholder="Price"
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Tax Amount</label>
          <input
            type="number"
            step="0.01"
            value={doc.tax ?? 0}
            onChange={(e) => updateField('tax', parseFloat(e.target.value) || 0)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Total ({doc.currency || '$'})</label>
          <input
            type="number"
            step="0.01"
            value={doc.total ?? 0}
            onChange={(e) => updateField('total', parseFloat(e.target.value) || 0)}
            style={{ ...inputStyle, fontWeight: 700, color: '#38bdf8' }}
          />
        </div>
      </div>
    </div>
  );
};

const BillEditor: React.FC<{
  doc: any;
  onChange: (d: any) => void;
}> = ({ doc, onChange }) => {
  const updateField = (key: string, val: any) => {
    onChange({ ...doc, [key]: val });
  };

  const updateItem = (index: number, key: string, val: any) => {
    const nextItems = [...doc.items];
    nextItems[index] = { ...nextItems[index], [key]: val };
    const total = nextItems.reduce((acc, it) => acc + (it.amount || 0), 0);
    onChange({ ...doc, items: nextItems, total });
  };

  const addItem = () => {
    const nextItems = [...doc.items, { description: 'New Service Charge', amount: 45.0 }];
    const total = nextItems.reduce((acc, it) => acc + (it.amount || 0), 0);
    onChange({ ...doc, items: nextItems, total });
  };

  const removeItem = (index: number) => {
    const nextItems = doc.items.filter((_: any, idx: number) => idx !== index);
    const total = nextItems.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);
    onChange({ ...doc, items: nextItems, total });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={labelStyle}>Company / Biller</label>
        <input
          type="text"
          value={doc.company || ''}
          onChange={(e) => updateField('company', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Bill To (Client)</label>
          <input
            type="text"
            value={doc.billTo || ''}
            onChange={(e) => updateField('billTo', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Invoice #</label>
          <input
            type="text"
            value={doc.invoiceNumber || ''}
            onChange={(e) => updateField('invoiceNumber', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Due Date</label>
          <input
            type="text"
            value={doc.dueDate || ''}
            onChange={(e) => updateField('dueDate', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Status Stamp</label>
          <select
            value={doc.status || 'DUE'}
            onChange={(e) => updateField('status', e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="DUE">DUE</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={labelStyle}>Line Charges ({doc.items?.length || 0})</label>
          <button
            type="button"
            onClick={addItem}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add Charge
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
          {doc.items?.map((item: any, i: number) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                padding: '6px 8px',
                borderRadius: '6px',
              }}
            >
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(i, 'description', e.target.value)}
                style={{ ...inputStyle, flex: 1, padding: '4px 8px' }}
                placeholder="Charge description"
              />
              <input
                type="number"
                step="0.01"
                value={item.amount}
                onChange={(e) => updateItem(i, 'amount', parseFloat(e.target.value) || 0)}
                style={{ ...inputStyle, width: '75px', padding: '4px 8px', textAlign: 'right' }}
                placeholder="Amount"
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Total Due ({doc.currency || '$'})</label>
        <input
          type="number"
          step="0.01"
          value={doc.total ?? 0}
          onChange={(e) => updateField('total', parseFloat(e.target.value) || 0)}
          style={{ ...inputStyle, fontWeight: 700, color: '#38bdf8' }}
        />
      </div>
    </div>
  );
};

const MemoEditor: React.FC<{
  doc: any;
  onChange: (d: any) => void;
}> = ({ doc, onChange }) => {
  const updateField = (key: string, val: any) => {
    onChange({ ...doc, [key]: val });
  };

  const handleLinesChange = (text: string) => {
    const lines = text.split('\n');
    onChange({ ...doc, lines });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={labelStyle}>Memo / Note Title</label>
        <input
          type="text"
          value={doc.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Date Header</label>
          <input
            type="text"
            value={doc.date || ''}
            onChange={(e) => updateField('date', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Sign-off / Signature</label>
          <input
            type="text"
            value={doc.signature || ''}
            onChange={(e) => updateField('signature', e.target.value)}
            style={inputStyle}
            placeholder="e.g. Yours always, Adarsh"
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Note Content (one row per line on paper)</label>
        <textarea
          value={Array.isArray(doc.lines) ? doc.lines.join('\n') : ''}
          onChange={(e) => handleLinesChange(e.target.value)}
          rows={6}
          style={{
            ...inputStyle,
            fontFamily: 'inherit',
            lineHeight: 1.5,
            resize: 'vertical',
          }}
          placeholder="Enter notes, bullet points, or checklist items..."
        />
      </div>
    </div>
  );
};

// ==========================================
// Adapters for cross-kind conversions
// ==========================================

function adaptToReceipt(doc: any): any {
  if (doc.kind === 'receipt') return doc;
  const items =
    doc.kind === 'bill'
      ? doc.items?.map((b: any) => ({ name: b.description, price: b.amount, qty: 1 })) || []
      : doc.lines?.map((l: string, i: number) => ({ name: l, price: 5 + i * 2, qty: 1 })) || [];
  const total = doc.total || items.reduce((s: number, it: any) => s + it.price, 0) || 20.0;
  return {
    kind: 'receipt',
    merchant: doc.company || doc.title || 'CAFE & MARKET',
    orderNumber: doc.invoiceNumber ? `ORDER #${doc.invoiceNumber}` : 'ORDER #4892',
    date: doc.date || doc.dueDate || 'TODAY',
    items,
    total,
    currency: doc.currency || '$',
  };
}

function adaptToBill(doc: any): any {
  if (doc.kind === 'bill') return doc;
  const items =
    doc.kind === 'receipt'
      ? doc.items?.map((r: any) => ({ description: r.name, amount: r.price })) || []
      : doc.lines?.map((l: string, i: number) => ({ description: l, amount: 20 + i * 15 })) || [];
  const total = doc.total || items.reduce((s: number, it: any) => s + it.amount, 0) || 75.0;
  return {
    kind: 'bill',
    company: doc.merchant || doc.title || 'SERVICE INVOICE',
    billTo: 'Customer Account',
    invoiceNumber: doc.orderNumber
      ? doc.orderNumber.replace(/[^0-9]/g, '') || 'INV-102'
      : 'INV-102',
    dueDate: 'Due on Receipt',
    status: 'DUE',
    items,
    total,
    currency: doc.currency || '$',
  };
}

function adaptToMemo(doc: any): any {
  if (doc.kind === 'memo') return doc;
  const lines =
    doc.kind === 'receipt'
      ? doc.items?.map(
          (i: any) =>
            `• ${i.qty ? i.qty + 'x ' : ''}${i.name} - ${doc.currency || '$'}${i.price.toFixed(2)}`,
        ) || []
      : doc.items?.map(
          (i: any) => `• ${i.description} - ${doc.currency || '$'}${i.amount.toFixed(2)}`,
        ) || [];
  return {
    kind: 'memo',
    title: doc.merchant || doc.company || 'NOTES',
    date: doc.date || doc.dueDate || 'October 20th',
    lines,
    signature: 'Yours, PaperKit',
  };
}

// ==========================================
// Styles
// ==========================================

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  backgroundColor: '#12141a',
  color: '#f3f4f6',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const activeTabStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #3b82f6',
  backgroundColor: 'rgba(59, 130, 246, 0.18)',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 0 12px rgba(59, 130, 246, 0.25)',
};

const inactiveTabStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  backgroundColor: '#12141a',
  color: '#94a3b8',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};
