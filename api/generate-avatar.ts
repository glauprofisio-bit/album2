
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

    // O prompt original da usuária para o estilo 3D Clay
    const finalPrompt = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: ${prompt}. Educational and safe for children.`;

    // Para evitar o "Rate Limit" do serviço anterior, vamos usar uma URL de fallback estável
    // que gera imagens de alta qualidade sem limites agressivos.
    // Usaremos o serviço da Cloudflare/Flux que é muito mais robusto para uso escolar.
    
    const seed = Math.floor(Math.random() * 1000000);
    // Usando uma URL de geração via Flux (via pollionations mas com modelo alternativo para evitar o limite do anterior)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=512&height=512&nologo=true&model=flux&seed=${seed}`;

    return new Response(JSON.stringify({ 
      message: "Mágica realizada!",
      avatarUrl: imageUrl
    }), { 
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

  } catch (error: any) {
    console.error("Erro na geração de avatar:", error);
    return new Response(JSON.stringify({ error: "Erro ao criar a mágica. Tente novamente!" }), { status: 500 });
  }
}
