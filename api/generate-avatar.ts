
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

    // Geramos um SEED único para cada clique. Isso é o que impede o navegador de ficar "preso" na imagem anterior (como o Panda).
    const uniqueSeed = Math.floor(Math.random() * 9999999);
    
    const encodedPrompt = encodeURIComponent(finalPrompt);
    // Adicionamos o seed na URL para forçar o navegador a carregar a nova imagem criada pela IA
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&enhance=true&seed=${uniqueSeed}`;

    return new Response(JSON.stringify({ 
      message: "Mágica realizada!",
      avatarUrl: imageUrl
    }), { 
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error: any) {
    console.error("Erro na geração de avatar:", error);
    return new Response(JSON.stringify({ error: "Erro ao criar a mágica. Tente novamente!" }), { status: 500 });
  }
}
