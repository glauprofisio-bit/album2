
import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('requestId');

  if (!requestId) {
    return new Response(JSON.stringify({ error: 'requestId is required' }), { status: 400 });
  }

  try {
    const data = await kv.get(requestId);
    
    if (!data) {
      return new Response(JSON.stringify({ status: 'not_found' }), { status: 404 });
    }

    return new Response(JSON.stringify(data), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
