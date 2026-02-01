
import { GoogleGenerativeAI } from "@google/generative-ai";

// Cache temporário em memória para armazenar o status das gerações
// Nota: Em ambiente Edge/Serverless, isso é volátil, mas para o fluxo de polling imediato costuma funcionar.
// Para uma solução 100% robusta, usaríamos o KV que já está no projeto.
import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { animal, projetoVida, userId } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Chave não configurada.' }), { status: 500 });
    }

    const requestId = `avatar_${userId || Math.random().toString(36).substring(7)}`;
    
    // 1. Avisa que começou
    await kv.set(requestId, { status: 'processing' }, { ex: 300 });

    // 2. Inicia a geração em "background" (Promise sem await para responder logo)
    const generateImage = async () => {
      try {
        const subject = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: A ${animal} working as a ${projetoVida}. Educational and safe for children.`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: subject,
            numberOfImages: 1,
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
            ]
          })
        });

        const data = await response.json();
        if (response.ok && data.generatedImages?.[0]?.image?.imageBytes) {
          const base64 = `data:image/png;base64,${data.generatedImages[0].image.imageBytes}`;
          await kv.set(requestId, { status: 'completed', url: base64 }, { ex: 300 });
        } else {
          await kv.set(requestId, { status: 'error', message: data.error?.message || 'Erro no Google' }, { ex: 300 });
        }
      } catch (e: any) {
        await kv.set(requestId, { status: 'error', message: e.message }, { ex: 300 });
      }
    };

    // Executa a geração
    generateImage();

    // 3. Responde imediatamente com o ID para o Polling
    return new Response(JSON.stringify({ requestId }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
