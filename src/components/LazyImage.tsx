// src/components/LazyImage.tsx — Image avec lazy loading natif
import React, { useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
}

export function LazyImage({ src, alt, className = '', fallback }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <>
      {!loaded && !error && (
        <div className={`${className} bg-slate-100 dark:bg-slate-800 animate-pulse`} />
      )}
      <img
        src={error && fallback ? fallback : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(true); }}
      />
    </>
  );
}
