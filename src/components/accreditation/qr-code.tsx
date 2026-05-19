'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  token: string;
  size?: number;
}

export function QRCodeDisplay({ token, size = 200 }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const verifyUrl = `${window.location.origin}/verify/${token}`;
    QRCode.toDataURL(verifyUrl, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    }).then(setQrDataUrl);
  }, [token, size]);

  if (!qrDataUrl) {
    return (
      <div
        className="animate-pulse bg-gray-200 rounded"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt="Verification QR Code"
      width={size}
      height={size}
      className="rounded border"
    />
  );
}
