import React, { useEffect, useRef, useState } from 'react';
import type { ScanCorners } from '@paperkit/scan';

interface CornerAdjustModalProps {
  imageFile: File | Blob;
  initialCorners: ScanCorners;
  onConfirm: (corners: ScanCorners) => void;
  onCancel: () => void;
}

export const CornerAdjustModal: React.FC<CornerAdjustModalProps> = ({
  imageFile,
  initialCorners,
  onConfirm,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imgDims, setImgDims] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });
  const [corners, setCorners] = useState<ScanCorners>(initialCorners);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      setImgDims({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Convert natural image coordinates to preview element coordinates
  const getScaleFactors = () => {
    const el = containerRef.current;
    if (!el || imgDims.width === 0) {
      return {
        fitScale: 1,
        left: 0,
        top: 0,
        renderW: imgDims.width || 800,
        renderH: imgDims.height || 600,
      };
    }
    const rect = el.getBoundingClientRect();
    const fitScale = Math.min(rect.width / imgDims.width, rect.height / imgDims.height);
    const renderW = imgDims.width * fitScale;
    const renderH = imgDims.height * fitScale;
    const left = (rect.width - renderW) / 2;
    const top = (rect.height - renderH) / 2;
    return { fitScale, left, top, renderW, renderH };
  };

  const handlePointerDown = (idx: number, e: React.PointerEvent) => {
    setDraggingIdx(idx);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingIdx === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { fitScale, left, top } = getScaleFactors();

    const mouseX = e.clientX - rect.left - left;
    const mouseY = e.clientY - rect.top - top;

    const naturalX = Math.max(0, Math.min(imgDims.width, Math.round(mouseX / fitScale)));
    const naturalY = Math.max(0, Math.min(imgDims.height, Math.round(mouseY / fitScale)));

    setCorners((prev) => {
      const next = [...prev] as ScanCorners;
      next[draggingIdx] = { x: naturalX, y: naturalY };
      return next;
    });
  };

  const handlePointerUp = () => {
    setDraggingIdx(null);
  };

  const { fitScale, left, top, renderW, renderH } = getScaleFactors();

  const cornerLabels = ['Top Left', 'Top Right', 'Bottom Right', 'Bottom Left'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '90vw',
          maxWidth: '900px',
          height: '85vh',
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
              Adjust Paper Corners
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Drag the 4 corner pins to align with your document’s edges.
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '20px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Interactive canvas / image area */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            flex: 1,
            position: 'relative',
            backgroundColor: '#0f172a',
            overflow: 'hidden',
            touchAction: 'none',
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Source"
              style={{
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
                width: `${renderW}px`,
                height: `${renderH}px`,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          )}

          {/* Polygon connecting the 4 corners */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            {corners.length === 4 && (
              <polygon
                points={corners
                  .map((c) => `${left + c.x * fitScale},${top + c.y * fitScale}`)
                  .join(' ')}
                fill="rgba(59, 130, 246, 0.18)"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />
            )}
          </svg>

          {/* 4 Draggable corner handles */}
          {corners.map((c, i) => {
            const screenX = left + c.x * fitScale;
            const screenY = top + c.y * fitScale;
            return (
              <div
                key={i}
                onPointerDown={(e) => handlePointerDown(i, e)}
                style={{
                  position: 'absolute',
                  left: `${screenX}px`,
                  top: `${screenY}px`,
                  transform: 'translate(-50%, -50%)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '3px solid #2563eb',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  cursor: 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                  touchAction: 'none',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '-22px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ffffff',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  {cornerLabels[i]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'transparent',
              color: '#e2e8f0',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(corners)}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
            }}
          >
            Apply Deskew & Crop
          </button>
        </div>
      </div>
    </div>
  );
};
