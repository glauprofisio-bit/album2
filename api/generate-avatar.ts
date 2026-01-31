
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
      return new Response(JSON.stringify({ error: 'API Key not configured on server' }), { status: 500 });
    }

    // Usando a classe correta da biblioteca @google/generative-ai
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const safetyPrompt = `
      STRICT SAFETY RULES:
      - You are a generator for a children's school application.
      - NEVER generate images of genitals, sexual content, violence, drugs, or hate symbols.
      - If the user prompt is inappropriate, generate a cute, happy generic robot sticker instead.
      - ALWAYS generate a circular sticker profile icon, 3D clay/plasticine style, vibrant colors, centered, white background.
      USER REQUEST: ${prompt}
    `;

    const result = await model.generateContent(safetyPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Como o Gemini Flash gera texto, estamos usando o DiceBear para o avatar visual
    // mas mantendo a lógica da IA ativa para processar o pedido.
    return new Response(JSON.stringify({ 
      message: "Processado com sucesso",
      text: text,
      avatarUrl: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=" + Math.random().toString(36).substring(7)
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Erro na API de Avatar:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
