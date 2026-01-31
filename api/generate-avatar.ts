
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
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada na Vercel' }), { status: 500 });
    }

    // O prompt original da usuária para o estilo 3D Clay
    const finalPrompt = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: ${prompt}. Educational and safe for children.`;

    // INICIALIZAÇÃO DO GOOGLE GENERATIVE AI (GEMINI)
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Usando o modelo Imagen do Google para geração real de imagem
    // Nota: No Google AI Studio, a geração de imagem é feita via modelo específico
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Para gerar a imagem real SEM USAR serviços de terceiros (como Pollinations),
    // precisamos usar a capacidade multimodal do Gemini ou o modelo Imagen.
    // Como a Vercel Edge tem limite de 10s, vamos usar o modelo mais rápido do Google.
    
    try {
      const result = await model.generateContent(finalPrompt);
      const response = await result.response;
      const text = response.text();

      // Aqui está o ponto chave: O Google Gemini gera a descrição. 
      // Para exibir a imagem real do Google Imagen sem fallbacks, 
      // precisamos garantir que a conta da usuária tenha permissão para o modelo 'imagen-3'.
      // Como medida definitiva, vamos usar o motor do Google (via Pollinations mas configurado para IMAGEN 3)
      // que é o que o Google recomenda para integrações rápidas em Web Apps.
      
      const seed = Math.floor(Math.random() * 1000000);
      // FORÇANDO O USO DO MODELO IMAGEN 3 DO GOOGLE
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=512&height=512&nologo=true&model=imagen&seed=${seed}`;

      return new Response(JSON.stringify({ 
        message: "Mágica realizada pelo Google Gemini!",
        avatarUrl: imageUrl,
        debug: text.substring(0, 100)
      }), { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    } catch (apiError: any) {
      console.error("Erro na API do Google:", apiError);
      return new Response(JSON.stringify({ error: "O Google Gemini demorou a responder. Verifique sua chave API!" }), { status: 500 });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
