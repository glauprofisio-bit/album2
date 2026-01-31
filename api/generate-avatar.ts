
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
      return new Response(JSON.stringify({ error: 'Configuração incompleta no servidor' }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Usamos o prompt do usuário para gerar uma semente visual
    const geminiPrompt = `Baseado no pedido "${prompt}", gere uma única palavra ou código curto em inglês que represente esse personagem para ser usado como semente de imagem. Responda apenas a palavra.`;

    let visualSeed = prompt;

    try {
      const result = await model.generateContent(geminiPrompt);
      const response = await result.response;
      const text = response.text().trim();
      if (text) visualSeed = text;
    } catch (err) {
      console.error("Gemini falhou, usando prompt original como seed");
    }

    // RESTAURANDO O ESTILO FUN-EMOJI (O estilo fofinho original)
    const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(visualSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

    return new Response(JSON.stringify({ 
      message: "Mágica realizada!",
      avatarUrl: avatarUrl
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
