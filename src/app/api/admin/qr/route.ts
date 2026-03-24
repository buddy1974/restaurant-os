import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const tableNumber = searchParams.get('table');
  const baseUrl = searchParams.get('baseUrl') || 'https://restaurant-os-one.vercel.app';

  if (!slug || !tableNumber) {
    return NextResponse.json({ error: 'slug and table required' }, { status: 400 });
  }

  try {
    const url = `${baseUrl}/${slug}/menu/${tableNumber}`;

    // Generate QR as PNG buffer
    const qrBuffer = await QRCode.toBuffer(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1a1a1a',
        light: '#ffffff',
      },
    });

    return new NextResponse(qrBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="table-${tableNumber}-qr.png"`,
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR' }, { status: 500 });
  }
}
