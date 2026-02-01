
// Removendo o config edge para evitar timeouts curtos e limitações de biblioteca
// O padrão agora é Serverless Function (Node.js) que permite até 10-60s de execução no Vercel Hobby

export default async function handler(req, res) {
  // No Node.js Serverless do Vercel, usamos (req, res) em vez de Web Response
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { animal, projetoVida } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Configuração incompleta: GEMINI_API_KEY não encontrada.' });
    }

    if (!animal || !projetoVida) {
      return res.status(400).json({ error: 'Animal e Projeto de Vida são obrigatórios.' });
    }

    // Prompt otimizado para Imagen 3.0
    const prompt = `A cute circular profile sticker, 3D claymorphism style, high quality 3D render, white background, centered. Subject: A friendly ${animal} dressed as a ${projetoVida}. Soft lighting, vibrant colors, child-friendly educational style.`;

    // Endpoint da API Gemini Imagen 3
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`;

    console.log(`Gerando avatar para: ${animal} como ${projetoVida}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
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
      console.error('Erro na API do Google:', data);
      return res.status(response.status).json({ 
        error: data.error?.message || 'O Google recusou o pedido. Tente palavras diferentes!' 
      });
    }

    // A estrutura de resposta do Gemini Imagen 3 v1beta é:
    // { "generatedImages": [ { "image": { "imageBytes": "...", "mimeType": "image/png" } } ] }
    if (data.generatedImages && data.generatedImages[0]?.image?.imageBytes) {
      const base64Image = `data:image/png;base64,${data.generatedImages[0].image.imageBytes}`;
      
      // Retornamos o Base64. 
      // NOTA: Para uma solução de produção ideal, deveríamos fazer upload para o Supabase Storage aqui.
      // Mas para garantir que funcione agora, vamos manter o retorno direto e salvar no banco via frontend.
      return res.status(200).json({ avatarUrl: base64Image });
    }

    console.error('Resposta inesperada do Google:', data);
    return res.status(500).json({ error: 'A IA não conseguiu gerar a imagem neste momento. Tente novamente!' });

  } catch (error) {
    console.error('Erro crítico na API de Avatar:', error);
    return res.status(500).json({ error: 'Erro interno: ' + error.message });
  }
}
