import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { professors, students, stickers, studentStickers, currentWeek } = req.body;

    // 1) Semana global
    if (currentWeek !== undefined && currentWeek !== null) {
      await supabase.from('app_settings').upsert({ id: 'global', current_week: currentWeek });
    }

    // 2) Professores
    if (Array.isArray(professors)) {
      for (const p of professors) {
        if (!p?.login) continue;
        if (p.id === 'admin' || p.login === 'admin') continue;

        await supabase.from('professors').upsert(
          {
            name: p.name || '',
            login: p.login,
            password: p.password || '',
            avatar_url: p.avatarUrl || '',
            avatar_seed: p.avatarSeed || ''
          },
          { onConflict: 'login' }
        );
      }
    }

    // 3) Alunos (inclui professor_id!)
    if (Array.isArray(students)) {
      for (const s of students) {
        if (!s?.login) continue;

        await supabase.from('students').upsert(
          {
            name: s.name || '',
            login: s.login,
            password: s.password || '',
            professor_id: s.professorId || null,
            avatar_url: s.avatarUrl || '',
            avatar_seed: s.avatarSeed || '',
            serie: s.serie || '',
            ciclo: s.ciclo || null
          },
          { onConflict: 'login' }
        );
      }
    }

    // 4) Figurinhas (upsert por week)
    if (Array.isArray(stickers)) {
      for (const st of stickers) {
        if (!st?.week) continue;

        await supabase.from('stickers').upsert(
          {
            week: st.week,
            name: st.name || `Semana ${st.week}`,
            image_url: st.imageUrl || '',
            rarity: st.rarity || 'NORMAL'
          },
          { onConflict: 'week' }
        );
      }
    }

    // 5) Estado da raspadinha (liberada/revelada/falta/reconquistada)
    if (Array.isArray(studentStickers) && studentStickers.length > 0) {
      for (const ss of studentStickers) {
        if (!ss?.week) continue;

        // Regra: se vier UUID em alunoId, usa direto. Se não vier, tenta achar por login.
        let studentId = null;

        if (ss.alunoId && typeof ss.alunoId === 'string' && ss.alunoId.includes('-')) {
          studentId = ss.alunoId; // parece UUID
        } else {
          const login = ss.alunoLogin || ss.alunoId;
          if (login) {
            const { data: st } = await supabase
              .from('students')
              .select('id')
              .eq('login', login)
              .single();
            if (st?.id) studentId = st.id;
          }
        }

        if (!studentId) continue;

        await supabase.from('student_stickers').upsert(
          {
            student_id: studentId,
            week: ss.week,
            liberada: !!ss.liberada,
            revelada: !!ss.revelada,
            is_falta: !!ss.isFalta,
            reconquistada: !!ss.reconquistada
          },
          { onConflict: 'student_id, week' }
        );
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
