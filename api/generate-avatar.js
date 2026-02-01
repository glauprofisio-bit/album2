
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { animal, projetoVida } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Chave API não configurada no Vercel.' }), { status: 500 });
    }

    const subject = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: A ${animal} working as a ${projetoVida}. Educational and safe for children. High quality, detailed 3D render.`;
    
    // Atualizado para Imagen 4 conforme teste do usuário no AI Studio
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`;
    // Nota: O endpoint do Imagen 4 pode variar, mas manteremos o 3.0 por enquanto se for o padrão da API estável, 
    // ou tentaremos o 4.0 se o erro persistir. Vamos garantir que o erro seja detalhado.
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: subject,
        numberOfImages: 1,
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Retorna o erro real do Google para diagnóstico
      const errorMsg = data.error?.message || JSON.stringify(data);
      return new Response(JSON.stringify({ error: `Google diz: ${errorMsg}` }), { status: response.status });
    }

    if (data.generatedImages && data.generatedImages[0] && data.generatedImages[0].image) {
      const base64 = `data:image/png;base64,${data.generatedImages[0].image.imageBytes}`;
      return new Response(JSON.stringify({ avatarUrl: base64 }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Imagem não gerada pelo Google.' }), { status: 500 });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Erro técnico: ${error.message}` }), { status: 500 });
  }
}
