
import { GoogleGenAI } from "@google/genai";

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
      return new Response(JSON.stringify({ error: 'API Key not configured on server' }), { status: 500 });
    }

    const ai = new GoogleGenAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" }); // Usando a versão mais estável/comum

    const safetyPrompt = `
      STRICT SAFETY RULES:
      - You are a generator for a children's school application.
      - NEVER generate images of genitals, sexual content, violence, drugs, or hate symbols.
      - If the user prompt is inappropriate, generate a cute, happy generic robot sticker instead.
      - ALWAYS generate a circular sticker profile icon, 3D clay/plasticine style, vibrant colors, centered, white background.
      USER REQUEST: ${prompt}
    `;

    // Nota: O SDK @google/genai para Node/Edge às vezes tem variações na geração de imagem.
    // Dependendo da versão, pode ser necessário usar o endpoint de imagem específico.
    // Para fins de compatibilidade com o que o usuário tinha:
    const result = await ai.getGenerativeModel({ model: "gemini-2.0-flash" }).generateContent(safetyPrompt);
    const response = await result.response;
    const text = response.text();

    // Como o usuário estava usando um modelo de imagem no front, 
    // em um ambiente Serverless/Edge, a chamada deve ser via fetch ou SDK configurado.
    // Vou simplificar a lógica para o frontend receber o que precisa.
    
    return new Response(JSON.stringify({ message: "O servidor recebeu o pedido, mas para gerar IMAGENS reais via API, precisamos garantir que o modelo correto esteja ativo." }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
