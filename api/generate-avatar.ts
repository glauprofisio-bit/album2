
import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { prompt, animal, projetoVida } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Chave da IA não configurada.' }), { status: 500 });
    }

    // Se o usuário enviou os campos separados, usamos eles. Caso contrário, usamos o prompt genérico.
    let subject = prompt;
    if (animal && projetoVida) {
      subject = `A ${animal} dressed and working as a ${projetoVida}`;
    }

    // Prompt mestre para o estilo 3D Clay - Focado na combinação solicitada
    const finalPrompt = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: ${subject}. Educational and safe for children. High quality, detailed 3D render.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`;
    
    // Adicionando um timeout manual para a requisição ao Google
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 segundos (limite da Vercel Pro é 60s)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        prompt: finalPrompt,
        numberOfImages: 1,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ]
      })
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro na API do Google:", data);
      throw new Error(data.error?.message || 'Falha na geração de imagem pelo Google');
    }

    const base64Image = data.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/png;base64,${base64Image}`;

    return new Response(JSON.stringify({ 
      message: "Mágica realizada diretamente pelo Google Imagen 3!",
      avatarUrl: imageUrl
    }), { 
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

  } catch (error: any) {
    console.error("Erro na geração:", error);
    return new Response(JSON.stringify({ error: error.message || "O Google Gemini está demorando. Tente novamente!" }), { status: 500 });
  }
}
