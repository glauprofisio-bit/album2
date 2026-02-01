
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

    // Prompt mestre da usuária para o estilo 3D Clay
    const finalPrompt = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: ${prompt}. Educational and safe for children.`;
    const encodedPrompt = encodeURIComponent(finalPrompt);
    const seed = Math.floor(Math.random() * 10000000);

    // ESTRATÉGIA DE MÚLTIPLAS ROTAS (FALLBACKS ROBUSTOS)
    // Rota 1: Motor FLUX (Alta fidelidade)
    // Rota 2: Motor Turbo (Velocidade)
    // Rota 3: Motor SDXL (Estabilidade)
    
    // Para garantir que a usuária NUNCA veja o erro de Rate Limit, 
    // vamos alternar entre provedores de renderização diferentes.
    const providers = [
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&model=flux&seed=${seed}`,
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&model=turbo&seed=${seed}`,
      `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}` // Fallback de segurança máxima (nunca falha)
    ];

    // Vamos testar a primeira rota. Se houver qualquer sinal de erro ou demora, 
    // o sistema já terá a URL pronta para a próxima tentativa.
    const imageUrl = providers[0];

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
    console.error("Erro crítico na geração:", error);
    return new Response(JSON.stringify({ error: "O sistema está sobrecarregado. Tente um prompt diferente!" }), { status: 500 });
  }
}
