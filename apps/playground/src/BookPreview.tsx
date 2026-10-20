import React, { useState } from 'react';
import type { Paper } from '@paperkit/core';

interface BookPreviewProps {
  papers: Paper[];
  onClose: () => void;
}

export const BookPreview: React.FC<BookPreviewProps> = ({ papers, onClose }) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [turning, setTurning] = useState<'next' | 'prev' | null>(null);

  const totalSheets = papers.length;

  const handleNext = () => {
    if (currentPage + 2 < totalSheets && !turning) {
      setTurning('next');
      setTimeout(() => {
        setCurrentPage((p) => p + 2);
        setTurning(null);
      }, 400);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0 && !turning) {
      setTurning('prev');
      setTimeout(() => {
        setCurrentPage((p) => Math.max(0, p - 2));
        setTurning(null);
      }, 400);
    }
  };

  const leftPaper = papers[currentPage];
  const rightPaper = papers[currentPage + 1];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        backgroundColor: '#18181b',
        backgroundImage: 'radial-gradient(circle at 50% 30%, #27272a 0%, #09090b 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(24, 24, 27, 0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.05em',
            }}
          >
            BOOK PREVIEW
          </div>
          <span style={{ color: '#e4e4e7', fontSize: '14px', fontWeight: 500 }}>
            {totalSheets === 0
              ? 'No papers available'
              : `Spread ${Math.floor(currentPage / 2) + 1} of ${Math.ceil(totalSheets / 2)}`}
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f4f4f5',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          Exit Book Mode
        </button>
      </div>

      {/* Main Book Display */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          perspective: '1800px',
        }}
      >
        {totalSheets === 0 ? (
          <div style={{ color: '#71717a', textAlign: 'center' }}>
            <p style={{ fontSize: '16px' }}>
              Add some papers to the board first to read them in book mode!
            </p>
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              display: 'flex',
              width: '920px',
              height: '620px',
              backgroundColor: '#fbfaf8',
              borderRadius: '6px',
              boxShadow:
                '0 30px 60px -12px rgba(0, 0, 0, 0.7), 0 18px 36px -18px rgba(0, 0, 0, 0.8), inset 0 0 40px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            {/* Center Spine Crease */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: '36px',
                transform: 'translateX(-50%)',
                background:
                  'linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.02) 60%, rgba(0,0,0,0.18) 100%)',
                zIndex: 30,
                pointerEvents: 'none',
              }}
            />

            {/* Left Page */}
            <div
              style={{
                flex: 1,
                borderRight: '1px solid rgba(0, 0, 0, 0.08)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                backgroundColor: '#fbf9f5',
                overflow: 'hidden',
              }}
            >
              {leftPaper ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={leftPaper.image.front.src}
                    alt="Left Page"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                      borderRadius: '2px',
                    }}
                  />
                </div>
              ) : (
                <div style={{ color: '#a1a1aa', fontSize: '13px' }}>Blank Endpaper</div>
              )}
              <span
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '24px',
                  fontSize: '11px',
                  color: '#a1a1aa',
                  fontFamily: 'monospace',
                }}
              >
                {currentPage + 1}
              </span>
            </div>

            {/* Right Page */}
            <div
              style={{
                flex: 1,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                backgroundColor: '#fbf9f5',
                overflow: 'hidden',
              }}
            >
              {rightPaper ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={rightPaper.image.front.src}
                    alt="Right Page"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                      borderRadius: '2px',
                    }}
                  />
                </div>
              ) : (
                <div style={{ color: '#a1a1aa', fontSize: '13px' }}>Blank Endpaper</div>
              )}
              <span
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '24px',
                  fontSize: '11px',
                  color: '#a1a1aa',
                  fontFamily: 'monospace',
                }}
              >
                {currentPage + 2 <= totalSheets ? currentPage + 2 : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div
        style={{
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <button
          onClick={handlePrev}
          disabled={currentPage === 0}
          style={{
            padding: '10px 24px',
            backgroundColor: currentPage === 0 ? 'rgba(255, 255, 255, 0.05)' : '#2563eb',
            color: currentPage === 0 ? '#52525b' : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
            boxShadow: currentPage === 0 ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.3)',
          }}
        >
          ← Previous Spread
        </button>
        <button
          onClick={handleNext}
          disabled={currentPage + 2 >= totalSheets}
          style={{
            padding: '10px 24px',
            backgroundColor:
              currentPage + 2 >= totalSheets ? 'rgba(255, 255, 255, 0.05)' : '#2563eb',
            color: currentPage + 2 >= totalSheets ? '#52525b' : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: currentPage + 2 >= totalSheets ? 'not-allowed' : 'pointer',
            boxShadow: currentPage + 2 >= totalSheets ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.3)',
          }}
        >
          Next Spread →
        </button>
      </div>
    </div>
  );
};
