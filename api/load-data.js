import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { data: profs, error: eProfs } = await supabase.from('professors').select('*');
    if (eProfs) throw new Error(`professors: ${eProfs.message}`);

    const { data: students, error: eStud } = await supabase.from('students').select('*');
    if (eStud) throw new Error(`students: ${eStud.message}`);

    const { data: stickers, error: eStk } = await supabase
      .from('stickers')
      .select('*')
      .order('week', { ascending: true });
    if (eStk) throw new Error(`stickers: ${eStk.message}`);

    const { data: studentStickers, error: eSS } = await supabase.from('student_stickers').select('*');
    if (eSS) throw new Error(`student_stickers: ${eSS.message}`);

    // semana global
    const { data: settings, error: eSet } = await supabase
      .from('app_settings')
      .select('current_week')
      .eq('id', 'global')
      .single();

    // se não existir ainda, não quebra: assume semana 1
    const currentWeek = eSet ? 1 : (settings?.current_week || 1);

    const appData = {
      professors: (profs || []).map(p => ({
        id: p.id,
        name: p.name,
        login: p.login,
        password: p.password,
        role: 'PROFESSOR',
        avatarUrl: p.avatar_url,
        avatarSeed: p.avatar_seed,
      })),
      students: (students || []).map(s => ({
        id: s.id,
        name: s.name,
        login: s.login,
        password: s.password,
        role: 'ALUNO',
        professorId: s.professor_id,
        avatarUrl: s.avatar_url,
        avatarSeed: s.avatar_seed,
        serie: s.serie,
        ciclo: s.ciclo,
      })),
      stickers: stickers && stickers.length > 0
        ? stickers.map(s => ({
            id: `sticker-${s.week}`,
            week: s.week,
            name: s.name,
            imageUrl: s.image_url,
            rarity: s.rarity,
          }))
        : Array.from({ length: 45 }, (_, i) => ({
            id: `sticker-${i + 1}`,
            week: i + 1,
            name: i + 1 >= 42 ? `Elo Supremo - Parte ${i - 40}` : `Semana ${i + 1}`,
            imageUrl: '',
            rarity: 'NORMAL',
          })),
      studentStickers: (studentStickers || []).map(ss => ({
        alunoId: ss.student_id,
        week: ss.week,
        liberada: ss.liberada,
        revelada: ss.revelada,
        isFalta: ss.is_falta,
        reconquistada: ss.reconquistada,
      })),
      currentWeek,
    };

    return res.status(200).json(appData);
  } catch (error) {
    console.error('Erro no handler load-data:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
