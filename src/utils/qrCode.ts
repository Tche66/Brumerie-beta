// src/utils/qrCode.ts — v17
// Génération QR via api.qrserver.com (zéro dépendance)
// Scanner QR via jsQR chargé dynamiquement

// ── Générer URL image QR pour un payload ────────────────────────
export function getQRCodeUrl(data: string, size = 240): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=png&margin=16&color=0f172a&bgcolor=ffffff`;
}

// ── Payload QR Brumerie ──────────────────────────────────────────
// Format : brumerie://{type}/{orderId}/{code}
// type: 'pickup' (livreur scanne chez vendeur) | 'delivery' (acheteur scanne chez lui)
export function buildQRPayload(type: 'pickup' | 'delivery', orderId: string, code: string): string {
  return `brumerie://${type}/${orderId}/${code}`;
}

export function parseQRPayload(raw: string): { type: 'pickup' | 'delivery'; orderId: string; code: string } | null {
  const match = raw.match(/^brumerie:\/\/(pickup|delivery)\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { type: match[1] as 'pickup' | 'delivery', orderId: match[2], code: match[3] };
}

// ── Scanner QR via caméra ────────────────────────────────────────
// Utilise jsQR depuis CDN (pas de npm install)
let jsQRLoaded = false;

async function loadJsQR(): Promise<any> {
  if ((window as any).jsQR) return (window as any).jsQR;
  if (jsQRLoaded) return (window as any).jsQR;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.onload = () => { jsQRLoaded = true; resolve((window as any).jsQR); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function startQRScanner(
  videoEl: HTMLVideoElement,
  onResult: (data: string) => void,
  onError: (err: string) => void,
): Promise<() => void> {
  let stream: MediaStream | null = null;
  let animId = 0;
  let stopped = false;

  try {
    const jsQR = await loadJsQR();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
    });
    videoEl.srcObject = stream;
    await videoEl.play();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const scan = () => {
      if (stopped) return;
      if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
        canvas.width  = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code) {
          onResult(code.data);
          return; // Stop scanning after first result
        }
      }
      animId = requestAnimationFrame(scan);
    };

    animId = requestAnimationFrame(scan);
  } catch (e: any) {
    onError(e.message || 'Impossible d\'accéder à la caméra');
  }

  return () => {
    stopped = true;
    cancelAnimationFrame(animId);
    stream?.getTracks().forEach(t => t.stop());
    videoEl.srcObject = null;
  };
}
