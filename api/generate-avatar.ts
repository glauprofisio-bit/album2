
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

    // O prompt original da usuária para o estilo 3D Clay
    const finalPrompt = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: ${prompt}. Educational and safe for children.`;

    // Usamos o Pollinations diretamente para gerar a imagem baseada no prompt 3D da usuária.
    // Isso é instantâneo e evita os erros de timeout/processamento do Gemini que estavam travando o site.
    const encodedPrompt = encodeURIComponent(finalPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

    return new Response(JSON.stringify({ 
      message: "Mágica realizada!",
      avatarUrl: imageUrl
    }), { 
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error: any) {
    console.error("Erro na geração de avatar:", error);
    return new Response(JSON.stringify({ error: "Erro ao criar a mágica. Tente novamente!" }), { status: 500 });
  }
}
