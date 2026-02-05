import { createClient } from '@supabase/supabase-js';

// Chaves reais forçadas para evitar erro 500 na Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    const { data: stickersRows, error: eStk } = await supabase
      .from('stickers')
      .select('*')
      .order('week', { ascending: true });
    if (eStk) throw new Error(`stickers: ${eStk.message}`);

    const { data: studentStickersRows, error: eSS } = await supabase.from('student_stickers').select('*');
    if (eSS) throw new Error(`student_stickers: ${eSS.message}`);

    const { data: settings, error: eSet } = await supabase
      .from('app_settings')
      .select('current_week')
      .eq('id', 'global')
      .single();

    const currentWeek = eSet ? 1 : (settings?.current_week || 1);

    // sempre monta as 45 semanas (mesmo se não existir linha no banco)
    const stickersMap = new Map();
    (stickersRows || []).forEach(s => stickersMap.set(s.week, s));

    const stickers = Array.from({ length: 45 }, (_, i) => {
      const week = i + 1;
      const row = stickersMap.get(week);

      return {
        id: `sticker-${week}`,
        week,
        name: row?.name || (week >= 42 ? `Elo Supremo - Parte ${week - 40}` : `Semana ${week}`),
        imageUrl: row?.image_url || '',
        rarity: row?.rarity || 'NORMAL'
      };
    });

    const appData = {
      professors: (profs || []).map(p => ({
        id: p.id,
        name: p.name,
        login: p.login,
        password: p.password,
        role: 'PROFESSOR',
        avatarUrl: p.avatar_url,
        avatarSeed: p.avatar_seed
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
        ciclo: s.ciclo
      })),
      stickers,
      studentStickers: (studentStickersRows || []).map(ss => ({
        alunoId: ss.student_id,
        week: ss.week,
        liberada: ss.liberada,
        revelada: ss.revelada,
        isFalta: ss.is_falta,
        reconquistada: ss.reconquistada
      })),
      currentWeek
    };

    return res.status(200).json(appData);
  } catch (error) {
    console.error('Erro no handler load-data:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
