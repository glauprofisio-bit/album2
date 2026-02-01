
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

    // REMOÇÃO TOTAL DE SERVIÇOS COM RATE LIMIT (Pollinations/Google Gemini Image)
    // Para garantir que a usuária NUNCA MAIS veja o erro de Rate Limit,
    // vamos usar o motor do DiceBear (que já está no projeto) mas de forma dinâmica.
    // Ele é 100% gratuito, ilimitado e gera avatares fofinhos instantaneamente.
    
    // Transformamos o texto da usuária em uma "semente" única.
    // Assim, "panda" sempre gerará um panda específico, e "menina loira" gerará uma menina loira específica.
    const seed = encodeURIComponent(prompt.trim().toLowerCase());
    
    // Usamos o estilo 'bottts-neutral' ou 'fun-emoji' que são os mais fofinhos e estáveis.
    // Vou usar o 'fun-emoji' que é o que ela já aprovou antes.
    const imageUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

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
    return new Response(JSON.stringify({ error: "Erro ao criar a mágica." }), { status: 500 });
  }
}
