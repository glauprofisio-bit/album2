export default async function handler(req, res) {
  // Apenas POST é permitido
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Por enquanto, apenas confirma o salvamento
    // Em produção, você pode integrar com um banco de dados real
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ 
      success: true, 
      message: 'Dados sincronizados com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Erro ao salvar dados' });
  }
}
