import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const filename = `menu/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const blob = await put(filename, file, { access: 'public' });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
