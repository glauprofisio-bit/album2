export default async function handler(req, res) {
  // Apenas GET é permitido
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Dados embutidos para garantir que o login funcione
    const data = {
      professors: [
        {
          id: "prof-1",
          name: "Tati",
          email: "tati@escola.com",
          login: "Tati",
          password: "385126",
          role: "professor",
          avatarUrl: "",
          avatarSeed: ""
        }
      ],
      students: [],
      stickers: Array.from({ length: 45 }, (_, i) => ({
        id: `sticker-${i + 1}`,
        week: i + 1,
        name: i + 1 >= 42 ? `Elo Supremo - Parte ${i - 40}` : `Semana ${i + 1}`,
        imageUrl: ''
      })),
      studentStickers: [],
      currentWeek: 1
    };

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Erro ao carregar dados' });
  }
}
