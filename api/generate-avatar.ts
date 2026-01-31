
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
    // Usando gemini-1.5-flash que é rápido e estável para processar o pedido
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // RESTAURANDO O SEU PROMPT ORIGINAL
    const finalPrompt = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: ${prompt}. Educational and safe for children.`;

    try {
      const result = await model.generateContent(finalPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Como o Gemini Flash gera texto descritivo, usamos um serviço de geração de imagem 
      // (Pollinations ou similar) que transforma esse prompt 3D em uma imagem real na hora!
      // Isso garante que o "Panda Astronauta" apareça de verdade no estilo 3D que você pediu.
      const encodedPrompt = encodeURIComponent(finalPrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

      return new Response(JSON.stringify({ 
        message: "Mágica realizada!",
        text: text,
        avatarUrl: imageUrl
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      console.error("Erro na geração:", err);
      return new Response(JSON.stringify({ error: "A IA demorou a responder. Tente novamente!" }), { status: 500 });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
