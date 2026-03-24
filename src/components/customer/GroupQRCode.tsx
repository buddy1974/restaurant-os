'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface Props {
  groupCode: string;
  slug: string;
  onClose: () => void;
}

export default function GroupQRCode({ groupCode, slug, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${slug}/join/${groupCode}`
    : `/${slug}/join/${groupCode}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, joinUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff',
        },
      });
    }
  }, [joinUrl]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
        <h2 className="font-bold text-xl mb-1">Group QR Code</h2>
        <p className="text-sm text-gray-400 mb-4">
          Guests scan this to join your group
        </p>

        <div className="flex justify-center mb-4">
          <canvas ref={canvasRef} className="rounded-xl" />
        </div>

        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl py-3 px-4 mb-4">
          <p className="text-2xl font-black text-orange-600 tracking-widest">{groupCode}</p>
          <p className="text-xs text-gray-400 mt-1">Or type this code manually</p>
        </div>

        <p className="text-xs font-mono bg-gray-50 rounded-lg p-2 mb-4 break-all text-gray-500">
          {joinUrl}
        </p>

        <button
          onClick={onClose}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
