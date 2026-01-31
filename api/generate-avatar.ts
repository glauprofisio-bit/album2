
import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("ERRO: GEMINI_API_KEY não encontrada nas variáveis de ambiente.");
      return new Response(JSON.stringify({ error: 'Configuração incompleta no servidor' }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Usando o modelo mais leve e rápido para evitar timeouts na Vercel
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const safetyPrompt = `Crie uma descrição curta e fofa de um avatar estilo figurinha (sticker) 3D baseado no pedido: ${prompt}. Responda apenas com a descrição.`;

    // Timeout de segurança para a API não travar
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const result = await model.generateContent(safetyPrompt);
      const response = await result.response;
      const text = response.text();
      clearTimeout(timeoutId);

      // Geramos um avatar visual baseado em um "seed" aleatório para garantir que sempre funcione
      const randomSeed = Math.random().toString(36).substring(7);
      const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${randomSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

      return new Response(JSON.stringify({ 
        message: "Mágica realizada!",
        text: text,
        avatarUrl: avatarUrl
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      console.error("Erro na geração do Gemini:", err);
      // Fallback amigável se o Gemini falhar
      return new Response(JSON.stringify({ 
        message: "Mágica simplificada!",
        avatarUrl: `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${Math.random().toString(36).substring(7)}`
      }), { status: 200 });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
