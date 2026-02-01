import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dataPath = path.join(__dirname, '..', 'public', 'data.json');
    
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf-8');
      const parsedData = JSON.parse(data);
      return res.status(200).json(parsedData);
    } else {
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
