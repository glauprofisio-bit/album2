import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bumcjbjnkblzvrjpvafn.supabase.co';
const supabaseKey = 'sb_publishable_8jjRyS4uqL9yLU6JdpHx9A_l-UgLSYW';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { professors, students, stickers, currentWeek } = req.body;
    console.log('Recebendo dados para salvamento:', { 
      profs: professors?.length, 
      students: students?.length, 
      stickers: stickers?.length, 
      week: currentWeek 
    });

    // 1. SEMANA ATUAL
    if (currentWeek !== undefined) {
      await supabase.from('app_settings').upsert({ id: 'global', current_week: currentWeek });
    }

    // 2. PROFESSORES (Sincronização por exclusão e upsert)
    if (professors) {
      const validProfs = professors.filter(p => p.id !== 'admin');
      const profLogins = validProfs.map(p => p.login);
      
      // Deleta quem não está na lista (exceto admin que não está na tabela de profs geralmente)
      if (profLogins.length > 0) {
        const { error: delError } = await supabase.from('professors').delete().not('login', 'in', `(${profLogins.map(l => `"${l}"`).join(',')})`);
        if (delError) console.error('Erro ao deletar profs:', delError);
      } else {
        await supabase.from('professors').delete().neq('login', 'admin');
      }

      // Upsert dos atuais
      for (const prof of validProfs) {
        await supabase.from('professors').upsert({
          name: prof.name,
          email: prof.email || `${prof.login}@escola.com`,
          login: prof.login,
          password: prof.password,
          role: 'PROFESSOR',
          avatar_url: prof.avatarUrl,
          avatar_seed: prof.avatarSeed
        }, { onConflict: 'login' });
      }
    }

    // 3. ALUNOS
    if (students) {
      const studentLogins = students.map(s => s.login);
      if (studentLogins.length > 0) {
        await supabase.from('students').delete().not('login', 'in', `(${studentLogins.map(l => `"${l}"`).join(',')})`);
      } else {
        await supabase.from('students').delete();
      }

      const { data: dbProfs } = await supabase.from('professors').select('id, login');

      for (const student of students) {
        const prof = dbProfs?.find(p => p.login === student.professorLogin) || dbProfs?.find(p => p.id === student.professorId);
        await supabase.from('students').upsert({
          name: student.name,
          email: student.email || `${student.login}@aluno.com`,
          login: student.login,
          password: student.password,
          professor_id: prof?.id,
          avatar_url: student.avatarUrl,
          avatar_seed: student.avatarSeed,
          serie: student.serie,
          ciclo: student.ciclo
        }, { onConflict: 'login' });
      }
    }

    // 4. FIGURINHAS
    if (stickers) {
      for (const s of stickers) {
        if (s.imageUrl || s.name) {
          await supabase.from('stickers').upsert({
            week: s.week,
            name: s.name,
            image_url: s.imageUrl,
            rarity: s.rarity
          }, { onConflict: 'week' });
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Dados sincronizados com sucesso' });
  } catch (error) {
    console.error('Erro fatal no save-data:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
