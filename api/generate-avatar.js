
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { animal, projetoVida } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Chave API não configurada.' }), { status: 500 });
  }

  const subject = `A cute circular profile sticker in 3D clay style, white background, centered. Subject: A ${animal} working as a ${projetoVida}. Educational and safe for children. High quality, detailed 3D render.`;
  
  // Usando o endpoint v1beta que suporta Imagen 3
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`;

  try {
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

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ error: errorData.error?.message || 'Erro no Google' }), { status: response.status });
    }

    const data = await response.json();
    
    if (data.generatedImages && data.generatedImages[0]?.image?.imageBytes) {
      const base64 = `data:image/png;base64,${data.generatedImages[0].image.imageBytes}`;
      return new Response(JSON.stringify({ avatarUrl: base64 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Imagem não gerada.' }), { status: 500 });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro na conexão: ' + error.message }), { status: 500 });
  }
}
