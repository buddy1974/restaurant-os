import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'query required' }, { status: 400 });
  }

  try {
    // Use Unsplash source for simple image fetching - no API key needed
    // Returns a random food photo matching the query
    const unsplashUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(query + ' food dish')}`;

    // Fetch to get the actual redirected URL
    const res = await fetch(unsplashUrl, { redirect: 'follow' });
    const finalUrl = res.url;

    return NextResponse.json({ url: finalUrl });
  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
