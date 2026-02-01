import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { professors, students, studentStickers, currentWeek } = req.body;

    // 1. Atualiza Semana Global
    if (currentWeek) {
      await supabase.from('app_settings').upsert({ id: 'global', current_week: currentWeek });
    }

    // 2. Salva Professores (Apenas Upsert - Sem Delete)
    if (professors) {
      for (const p of professors) {
        if (p.id === 'admin') continue;
        await supabase.from('professors').upsert({
          name: p.name,
          login: p.login,
          password: p.password,
          avatar_url: p.avatarUrl,
          avatar_seed: p.avatarSeed
        }, { onConflict: 'login' });
      }
    }

    // 3. Salva Alunos (Apenas Upsert - Sem Delete)
    if (students) {
      for (const s of students) {
        await supabase.from('students').upsert({
          name: s.name,
          login: s.login,
          password: s.password,
          avatar_url: s.avatarUrl,
          avatar_seed: s.avatarSeed,
          serie: s.serie,
          ciclo: s.ciclo
        }, { onConflict: 'login' });
      }
    }

    // 4. Salva Estado da Raspadinha (Liberada/Revelada)
    if (studentStickers && studentStickers.length > 0) {
      for (const ss of studentStickers) {
        // Busca o ID real do aluno pelo login
        const { data: st } = await supabase.from('students').select('id').eq('login', ss.alunoLogin || ss.alunoId).single();
        if (st) {
          await supabase.from('student_stickers').upsert({
            student_id: st.id,
            week: ss.week,
            liberada: ss.liberada,
            revelada: ss.revelada,
            is_falta: ss.isFalta || false
          }, { onConflict: 'student_id, week' });
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
