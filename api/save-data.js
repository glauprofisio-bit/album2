import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    const dataPath = path.join(__dirname, '..', 'public', 'data.json');
    
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    
    return res.status(200).json({ success: true, message: 'Dados salvos com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    return res.status(500).json({ error: 'Erro ao salvar dados' });
  }
}
