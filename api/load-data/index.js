import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Apenas GET é permitido
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Tenta ler o arquivo de dados
    const dataPath = path.join(process.cwd(), 'public', 'data.json');
    
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      const parsedData = JSON.parse(data);
      return res.status(200).json(parsedData);
    } else {
      // Se não existir, retorna dados vazios
      return res.status(200).json({
        professors: [],
        students: [],
        stickers: [],
        studentStickers: [],
        currentWeek: 1
      });
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return res.status(500).json({ error: 'Erro ao carregar dados' });
  }
}
