import React, { useEffect, useRef, useState } from 'react';
import type { Paper } from '@paperkit/core';
import { PaperBoard, useBoard, useBoardPapers } from '@paperkit/react';
import {
  deskewWithCorners,
  scanImage,
  performOcr,
  parseDocument,
  type ScanCorners,
  type ExtractedDoc,
  type RenderedTemplate,
} from '@paperkit/scan';
import { BookPreview } from './BookPreview.js';
import { CornerAdjustModal } from './CornerAdjustModal.js';
import { TemplateModal } from './TemplateModal.js';
import {
  createLetterSample,
  createMemoSample,
  createPostcardSample,
  createReceiptSample,
} from './samplePapers.js';

export const App: React.FC = () => {
  const board = useBoard({
    dropJitter: 2.5,
    maxPaperSize: 380,
  });

  const papers = useBoardPapers(board);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [bookMode, setBookMode] = useState(false);
  const [showLightingMenu, setShowLightingMenu] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState('');

  // Fallback modal state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCorners, setPendingCorners] = useState<ScanCorners | null>(null);

  // Template modal state
  const [pendingTemplateDoc, setPendingTemplateDoc] = useState<ExtractedDoc | null>(null);
  const [pendingRawOcrText, setPendingRawOcrText] = useState<string | undefined>(undefined);

  // Settings
  const [lightAngle, setLightAngle] = useState(315);
  const [lightElev, setLightElev] = useState(0.6);
  const [grain, setGrain] = useState(true);
  const [edgeWear, setEdgeWear] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load default papers once on start
  useEffect(() => {
    if (board.size === 0) {
      const receipt = createReceiptSample();
      board.addPaper({
        image: receipt.front,
        size: { w: 260, h: 440 },
        transform: { x: 300, y: 340, rotation: -4, scale: 1 },
        meta: { title: receipt.title },
      });

      const letter = createLetterSample();
      board.addPaper({
        image: letter.front,
        size: { w: 340, h: 440 },
        transform: { x: 580, y: 320, rotation: 3, scale: 1 },
        curl: { corner: 'tr', amount: 0.25 },
        meta: { title: letter.title },
      });

      const postcard = createPostcardSample();
      board.addPaper({
        image: { front: postcard.front, back: postcard.back },
        size: { w: 360, h: 250 },
        transform: { x: 920, y: 360, rotation: -7, scale: 1 },
        meta: { title: postcard.title },
      });
    }
  }, [board]);

  const handleLightChange = (angle: number, elevation: number) => {
    setLightAngle(angle);
    setLightElev(elevation);
    board.setLight({ angle, elevation });
  };

  const handleTextureToggle = (nextGrain: boolean, nextEdgeWear: boolean) => {
    setGrain(nextGrain);
    setEdgeWear(nextEdgeWear);
    board.setTexture({ grain: nextGrain, edgeWear: nextEdgeWear });
  };

  const processOcrAndOpenTemplate = async (imageBlob: Blob, fileName: string) => {
    setIsScanning(true);
    setScanStatus('Reading text with 100% Client-Side OCR...');

    try {
      const ocrResult = await performOcr(imageBlob, {
        onProgress: ({ status, progress }) => {
          const pct = Math.round(progress * 100);
          setScanStatus(`OCR ${status}: ${pct}%`);
        },
      });

      const parsedDoc = parseDocument(ocrResult.text);
      if (parsedDoc.kind === 'receipt' && parsedDoc.merchant === 'STORE RECEIPT' && fileName) {
        parsedDoc.merchant = fileName.replace(/\.[^/.]+$/, '').toUpperCase();
      }

      setPendingTemplateDoc(parsedDoc);
      setPendingRawOcrText(ocrResult.text);
      setScanStatus('');
    } catch (err) {
      console.error('OCR error, using default template:', err);
      const fallbackDoc = parseDocument('NOTE\n' + fileName);
      setPendingTemplateDoc(fallbackDoc);
      setPendingRawOcrText('');
      setScanStatus('');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanStatus('Scanning document & detecting paper edges...');

    try {
      const result = await scanImage(file);

      if (result.fallback) {
        // Low confidence fallback: prompt manual corner adjustment first
        setPendingFile(file);
        setPendingCorners(result.corners);
        setScanStatus('');
      } else {
        // Run OCR and open template customizer (replacing the raw screenshot!)
        await processOcrAndOpenTemplate(result.blob, file.name);
      }
    } catch (err) {
      console.error('Scan error:', err);
      // Fallback: run OCR on original image directly
      await processOcrAndOpenTemplate(file, file.name);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualCornerConfirm = async (corners: ScanCorners) => {
    if (!pendingFile) return;
    setIsScanning(true);
    setScanStatus('Applying perspective warp & crop...');

    try {
      const result = await deskewWithCorners(pendingFile, corners);
      await processOcrAndOpenTemplate(result.blob, pendingFile.name);
    } catch (err) {
      console.error(err);
      await processOcrAndOpenTemplate(pendingFile, pendingFile.name);
    } finally {
      setPendingFile(null);
      setPendingCorners(null);
    }
  };

  const handleTemplateConfirm = (rendered: RenderedTemplate) => {
    const aspect = rendered.width / rendered.height;
    const targetWidth = rendered.kind === 'receipt' ? 240 : rendered.kind === 'bill' ? 320 : 280;
    const targetHeight = Math.round(targetWidth / aspect);

    board.addPaper({
      image: {
        src: rendered.dataUrl,
        width: rendered.width,
        height: rendered.height,
      },
      size: { w: targetWidth, h: targetHeight },
      transform: {
        x: 460 + (Math.random() - 0.5) * 80,
        y: 350 + (Math.random() - 0.5) * 60,
        rotation: (Math.random() - 0.5) * 6,
        scale: 1,
      },
      meta: { title: rendered.title, templateKind: rendered.kind },
    });

    setPendingTemplateDoc(null);
    setPendingRawOcrText(undefined);
    setScanStatus('✨ Placed styled template paper on desk!');
    setTimeout(() => setScanStatus(''), 3500);
  };

  const handleOpenBlankTemplate = () => {
    const sample = parseDocument(
      `
ATELIER CAFE & BAKERY
140 Hayes St, San Francisco
Order #8942 • 10:42 AM
1x Cortado (Oat) $5.50
1x Cardamom Bun $6.00
1x Hand-drip Geisha $8.50
Subtotal $20.00
Tax $1.73
Total $21.73
THANK YOU FOR VISITING!
    `.trim(),
    );
    setPendingTemplateDoc(sample);
    setPendingRawOcrText('Sample template preset');
  };

  const handleStressTest50 = () => {
    const receipt = createReceiptSample();
    const memo = createMemoSample();
    for (let i = 0; i < 50; i++) {
      const sample = i % 2 === 0 ? receipt : memo;
      board.addPaper({
        image: sample.front,
        size: { w: 180, h: 260 },
        transform: {
          x: 150 + (i % 10) * 110,
          y: 120 + Math.floor(i / 10) * 90,
          rotation: (Math.random() - 0.5) * 14,
          scale: 0.85,
        },
        meta: { title: `Stress Paper #${i + 1}` },
      });
    }
  };

  const handleExportJSON = () => {
    const json = board.toJSON();
    setJsonText(JSON.stringify(json, null, 2));
    setShowJsonModal(true);
  };

  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(jsonText);
      board.load(parsed);
      setShowJsonModal(false);
    } catch (err) {
      alert('Invalid Paperkit JSON: ' + (err as Error).message);
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#131418',
        color: '#f3f4f6',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Top Header / Toolbar */}
      <header
        style={{
          height: '62px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#1b1d24',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              fontSize: '18px',
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                fontWeight: 900,
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
              }}
            >
              P
            </span>
            <span>Paperkit</span>
          </div>
          <span
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              color: '#94a3b8',
            }}
          >
            v0.1.0
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.heic,.heif"
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isScanning ? 'wait' : 'pointer',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
            }}
          >
            <span>📷✨</span>
            <span>{isScanning ? 'Processing...' : 'Upload & OCR Template'}</span>
          </button>

          <button
            onClick={handleOpenBlankTemplate}
            style={{
              ...btnStyle,
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              borderColor: 'rgba(59, 130, 246, 0.4)',
              color: '#93c5fd',
              fontWeight: 600,
            }}
          >
            ✨ + Custom Template
          </button>

          {/* Add Sample Papers Dropdown */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => {
                const s = createReceiptSample();
                board.addPaper({ image: s.front, meta: { title: s.title } });
              }}
              style={btnStyle}
            >
              + Receipt
            </button>
            <button
              onClick={() => {
                const s = createLetterSample();
                board.addPaper({
                  image: s.front,
                  meta: { title: s.title },
                  curl: { corner: 'tr', amount: 0.2 },
                });
              }}
              style={btnStyle}
            >
              + Letter
            </button>
            <button
              onClick={() => {
                const s = createPostcardSample();
                board.addPaper({
                  image: { front: s.front, back: s.back },
                  meta: { title: s.title },
                });
              }}
              style={btnStyle}
            >
              + Postcard
            </button>
            <button
              onClick={() => {
                const s = createMemoSample();
                board.addPaper({ image: s.front, meta: { title: s.title } });
              }}
              style={btnStyle}
            >
              + Memo
            </button>
          </div>

          <div
            style={{
              width: '1px',
              height: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              margin: '0 4px',
            }}
          />

          {/* Book Preview */}
          <button onClick={() => setBookMode(true)} style={btnStyle}>
            📖 Book View
          </button>

          {/* Lighting & Textures */}
          <button
            onClick={() => setShowLightingMenu(!showLightingMenu)}
            style={{
              ...btnStyle,
              backgroundColor: showLightingMenu ? '#334155' : 'rgba(255, 255, 255, 0.06)',
            }}
          >
            💡 Light & Textures
          </button>

          {/* Save / Load JSON */}
          <button onClick={handleExportJSON} style={btnStyle}>
            💾 JSON
          </button>

          {/* 50 Papers Stress test */}
          <button
            onClick={handleStressTest50}
            style={btnStyle}
            title="Stress test 50+ papers at 60fps"
          >
            ⚡ 50 Papers
          </button>

          {/* Clear */}
          <button
            onClick={() => board.clear()}
            style={{ ...btnStyle, color: '#f87171' }}
            title="Remove all papers"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Lighting Popover */}
      {showLightingMenu && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            right: '24px',
            width: '280px',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
            Lighting & Surface
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            >
              <span>Sun Angle</span>
              <span>{lightAngle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={lightAngle}
              onChange={(e) => handleLightChange(Number(e.target.value), lightElev)}
              style={{ width: '100%', marginTop: '6px' }}
            />
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            >
              <span>Sun Elevation</span>
              <span>{Math.round(lightElev * 100)}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={Math.round(lightElev * 100)}
              onChange={(e) => handleLightChange(lightAngle, Number(e.target.value) / 100)}
              style={{ width: '100%', marginTop: '6px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Paper Grain Texture</span>
            <input
              type="checkbox"
              checked={grain}
              onChange={(e) => handleTextureToggle(e.target.checked, edgeWear)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Aged Edge Wear</span>
            <input
              type="checkbox"
              checked={edgeWear}
              onChange={(e) => handleTextureToggle(grain, e.target.checked)}
            />
          </div>
        </div>
      )}

      {/* Main Board Canvas */}
      <main
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#18191f',
          backgroundImage:
            'radial-gradient(#282a36 1px, transparent 1px), radial-gradient(#282a36 1px, #18191f 1px)',
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px',
        }}
      >
        <PaperBoard
          board={board}
          onPaperSelect={(p) => setSelectedPaper(p)}
          style={{ width: '100%', height: '100%' }}
        />

        {/* Scanning status banner */}
        {scanStatus && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              borderRadius: '24px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              zIndex: 50,
            }}
          >
            <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
            <span>{scanStatus}</span>
          </div>
        )}

        {/* Selected Paper Floating Quick Actions */}
        {selectedPaper && (
          <div
            style={{
              position: 'absolute',
              bottom: '50px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              backdropFilter: 'blur(10px)',
              padding: '8px 16px',
              borderRadius: '30px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              zIndex: 80,
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
              {(selectedPaper.meta?.title as string) || 'Paper'}
            </span>
            <div
              style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
            />
            <button
              onClick={() => board.flipPaper(selectedPaper.id)}
              style={pillBtnStyle}
              title="Flip [F]"
            >
              🔄 Flip
            </button>
            <button
              onClick={() => board.bringToFront(selectedPaper.id)}
              style={pillBtnStyle}
              title="Raise to top [PgUp]"
            >
              ⬆ To Front
            </button>
            <button
              onClick={() => board.sendToBack(selectedPaper.id)}
              style={pillBtnStyle}
              title="Lower to bottom [PgDn]"
            >
              ⬇ To Back
            </button>
            <button
              onClick={() => {
                const current = selectedPaper.curl?.amount ? 0 : 0.35;
                board.setCurl(selectedPaper.id, current ? { corner: 'tr', amount: current } : null);
              }}
              style={pillBtnStyle}
              title="Toggle Dog-Ear Curl"
            >
              📐 Curl
            </button>
            <button
              onClick={() => {
                board.removePaper(selectedPaper.id);
                setSelectedPaper(null);
              }}
              style={{ ...pillBtnStyle, color: '#f87171' }}
              title="Delete paper"
            >
              🗑 Delete
            </button>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <footer
        style={{
          height: '32px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#171920',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '12px',
          color: '#94a3b8',
        }}
      >
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>
            Papers on board: <strong>{papers.length}</strong>
          </span>
          <span>
            Light:{' '}
            <strong>
              {lightAngle}° / {Math.round(lightElev * 100)}%
            </strong>
          </span>
        </div>
        <div>
          <span>Drag to move • Double-click to flip • Drag corner to curl • [Q]/[E] to rotate</span>
        </div>
      </footer>

      {/* Manual 4-Corner Adjustment Modal */}
      {pendingFile && pendingCorners && (
        <CornerAdjustModal
          imageFile={pendingFile}
          initialCorners={pendingCorners}
          onConfirm={handleManualCornerConfirm}
          onCancel={() => {
            setPendingFile(null);
            setPendingCorners(null);
          }}
        />
      )}

      {/* Tactile Template Customizer & Preview Modal */}
      {pendingTemplateDoc && (
        <TemplateModal
          initialDocument={pendingTemplateDoc}
          rawOcrText={pendingRawOcrText}
          onConfirm={handleTemplateConfirm}
          onCancel={() => {
            setPendingTemplateDoc(null);
            setPendingRawOcrText(undefined);
          }}
        />
      )}

      {/* Book Mode Preview */}
      {bookMode && <BookPreview papers={papers} onClose={() => setBookMode(false)} />}

      {/* JSON Export / Import Modal */}
      {showJsonModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '640px',
              backgroundColor: '#1e293b',
              borderRadius: '14px',
              padding: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#f8fafc' }}>
              Serialized Board JSON
            </h3>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              style={{
                width: '100%',
                height: '320px',
                backgroundColor: '#0f172a',
                color: '#38bdf8',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />
            <div
              style={{
                marginTop: '14px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button onClick={() => setShowJsonModal(false)} style={btnStyle}>
                Cancel
              </button>
              <button
                onClick={handleImportJSON}
                style={{ ...btnStyle, backgroundColor: '#2563eb', color: '#fff' }}
              >
                Apply & Restore Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
  color: '#e2e8f0',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const pillBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: '16px',
  border: 'none',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: '#e2e8f0',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
};
