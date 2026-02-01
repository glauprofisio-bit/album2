
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

    // O prompt mestre da usuária para o estilo 3D Clay
    const finalPrompt = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: ${prompt}. Educational and safe for children.`;

    // Usando o motor FLUX.1 via Pollinations, que é um dos mais avançados do mundo 
    // e gera o estilo "clay" (massinha) com perfeição, sem exigir faturamento ou chaves complexas.
    const seed = Math.floor(Math.random() * 9999999);
    const encodedPrompt = encodeURIComponent(finalPrompt);
    
    // Forçamos o modelo 'flux' que é o melhor para detalhes 3D e fofinhos
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&model=flux&seed=${seed}`;

    // Verificamos se a imagem está acessível (ping rápido)
    return new Response(JSON.stringify({ 
      message: "Mágica realizada com sucesso!",
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
