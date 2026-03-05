// src/components/ImageLightbox.tsx
// Visionneuse plein écran — zoom pinch, swipe, double-tap
import React, { useState, useRef, useEffect } from 'react';

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);

  // Touch state refs
  const lastDist = useRef<number | null>(null);
  const lastTranslate = useRef({ x: 0, y: 0 });
  const startTouch = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  // Fermer avec Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    lastTranslate.current = { x: 0, y: 0 };
  };

  const goTo = (idx: number) => {
    resetZoom();
    setCurrentIndex(Math.max(0, Math.min(images.length - 1, idx)));
  };

  // Double-tap pour zoom
  const handleTap = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap
      if (scale > 1) { resetZoom(); }
      else { setScale(2.5); }
      setLastTap(0);
    } else {
      setLastTap(now);
    }
  };

  // Pinch to zoom + pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isDragging.current = false;
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastDist.current !== null) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.min(Math.max(scale * (dist / lastDist.current), 1), 4);
      setScale(newScale);
      lastDist.current = dist;
    } else if (e.touches.length === 1 && startTouch.current) {
      const dx = e.touches[0].clientX - startTouch.current.x;
      const dy = e.touches[0].clientY - startTouch.current.y;
      isDragging.current = Math.abs(dx) > 5 || Math.abs(dy) > 5;
      if (scale > 1) {
        // Pan quand zoomé
        setTranslate({
          x: lastTranslate.current.x + dx,
          y: lastTranslate.current.y + dy,
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastDist.current = null;
    if (scale < 1.1) resetZoom();

    if (!isDragging.current && e.changedTouches.length === 1) {
      handleTap(e as any);
    }

    // Swipe pour changer d'image (seulement si pas zoomé)
    if (scale <= 1 && startTouch.current && isDragging.current) {
      const dx = e.changedTouches[0].clientX - startTouch.current.x;
      if (Math.abs(dx) > 60) {
        if (dx < 0 && currentIndex < images.length - 1) goTo(currentIndex + 1);
        if (dx > 0 && currentIndex > 0) goTo(currentIndex - 1);
      }
    }

    lastTranslate.current = translate;
    startTouch.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.96)', touchAction: 'none' }}
    >
      {/* Bouton fermer */}
      <button onClick={onClose}
        className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-white/10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Compteur */}
      {images.length > 1 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
          <p className="text-white text-[11px] font-black uppercase tracking-widest">{currentIndex + 1} / {images.length}</p>
        </div>
      )}

      {/* Image principale */}
      <div className="w-full h-full flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: lastDist.current ? 'none' : 'transform 0.15s ease',
            cursor: scale > 1 ? 'grab' : 'default',
          }}
          draggable={false}
        />
      </div>

      {/* Hint double-tap */}
      {scale === 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
          <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">Double-tap pour zoomer · Swipe pour naviguer</p>
        </div>
      )}

      {/* Dots navigation */}
      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white w-5 h-2' : 'bg-white/30 w-2 h-2'}`} />
          ))}
        </div>
      )}

      {/* Flèches navigation desktop */}
      {currentIndex > 0 && (
        <button onClick={() => goTo(currentIndex - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-white/10 hidden md:flex">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
      {currentIndex < images.length - 1 && (
        <button onClick={() => goTo(currentIndex + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center active:scale-90 transition-all border border-white/10 hidden md:flex">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
    </div>
  );
}
