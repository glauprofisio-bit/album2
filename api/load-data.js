import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bumcjbjnkblzvrjpvafn.supabase.co';
const supabaseKey = 'sb_publishable_8jjRyS4uqL9yLU6JdpHx9A_l-UgLSYW';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { data: profs } = await supabase.from('professors').select('*');
    const { data: students } = await supabase.from('students').select('*');
    const { data: stickers } = await supabase.from('stickers').select('*').order('week', { ascending: true });
    const { data: studentStickers } = await supabase.from('student_stickers').select('*, stickers(week)');

    const appData = {
      professors: (profs || []).map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        login: p.login,
        password: p.password,
        role: 'PROFESSOR',
        avatarUrl: p.avatar_url,
        avatarSeed: p.avatar_seed
      })),
      students: (students || []).map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        login: s.login,
        password: s.password,
        role: 'ALUNO',
        professorId: s.professor_id,
        avatarUrl: s.avatar_url,
        avatarSeed: s.avatar_seed,
        serie: s.serie,
        ciclo: s.ciclo
      })),
      stickers: stickers && stickers.length > 0 ? stickers.map(s => ({
        id: s.id,
        week: s.week,
        name: s.name,
        imageUrl: s.image_url
      })) : Array.from({ length: 45 }, (_, i) => ({
        id: `sticker-${i + 1}`,
        week: i + 1,
        name: i + 1 >= 42 ? `Elo Supremo - Parte ${i - 40}` : `Semana ${i + 1}`,
        imageUrl: ''
      })),
      studentStickers: (studentStickers || []).map(ss => ({
        alunoId: students.find(s => s.id === ss.student_id)?.id || ss.student_id,
        week: ss.stickers?.week || 0,
        liberada: true,
        revelada: true,
        reconquistada: false,
        date: ss.collected_at
      })),
      currentWeek: 1
    };

    return res.status(200).json(appData);
  } catch (error) {
    console.error('Erro no handler load-data:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
