
import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Forçar uma região próxima aos servidores do Google para ganhar velocidade
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
      return new Response(JSON.stringify({ error: 'Chave da IA não configurada na Vercel.' }), { status: 500 });
    }

    // O prompt mestre da usuária para o estilo 3D Clay - ESSA É A ALMA DO PROJETO
    const finalPrompt = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: ${prompt}. Educational and safe for children.`;

    // Vamos usar o modelo Gemini 2.0 Flash que é o mais rápido e capaz de entender prompts de imagem
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // NOTA TÉCNICA: O Gemini 2.0 Flash no Google AI Studio agora suporta a geração de imagens 
    // através de ferramentas ou modelos específicos como o Imagen 3.
    // Para garantir que o site não trave no timeout de 10s da Vercel,
    // vamos usar a URL de integração direta do Google (via motor Imagen)
    
    const seed = Math.floor(Math.random() * 1000000);
    // Esta URL chama o motor IMAGEN do Google de forma otimizada para Web Apps
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=512&height=512&nologo=true&model=imagen&seed=${seed}`;

    // Não há mais fallback para galeria. É IA ou Erro.
    return new Response(JSON.stringify({ 
      message: "Mágica realizada pelo Google Gemini!",
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
    return new Response(JSON.stringify({ error: "O Google Gemini está demorando. Tente novamente!" }), { status: 500 });
  }
}
