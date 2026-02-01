import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Apenas POST é permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    const dataPath = path.join(process.cwd(), 'public', 'data.json');
    
    // Garante que a pasta existe
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Salva os dados
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    
    return res.status(200).json({ success: true, message: 'Dados salvos com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    return res.status(500).json({ error: 'Erro ao salvar dados' });
  }
}
