import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const {
      professors = [],
      students = [],
      stickers = [],
      studentStickers = [],
      currentWeek
    } = req.body || {};

    // 1) Semana global
    if (currentWeek !== undefined && currentWeek !== null) {
      await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });
    }

    // =========================
    // 2) PROFESSORES (UPSERT + DELETE)
    // =========================
    const incomingProfLogins = new Set();

    if (Array.isArray(professors)) {
      for (const p of professors) {
        if (!p?.login) continue;
        if (p.id === 'admin' || p.login === 'admin') continue;

        incomingProfLogins.add(p.login);

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

    // apagar do banco os professores que não estão mais na lista
    {
      const { data: existingProfs, error } = await supabase
        .from('professors')
        .select('login');

      if (error) throw new Error(`professors select: ${error.message}`);

      for (const row of existingProfs || []) {
        const login = row.login;
        if (!login) continue;
        if (login === 'admin') continue; // segurança

        if (!incomingProfLogins.has(login)) {
          const { error: delErr } = await supabase
            .from('professors')
            .delete()
            .eq('login', login);

          if (delErr) throw new Error(`professors delete ${login}: ${delErr.message}`);
        }
      }
    }

    // =========================
    // 3) ALUNOS (UPSERT + DELETE)
    // =========================
    const incomingStudentLogins = new Set();

    if (Array.isArray(students)) {
      for (const s of students) {
        if (!s?.login) continue;

        incomingStudentLogins.add(s.login);

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

    // apagar do banco os alunos que não estão mais na lista
    {
      const { data: existingStudents, error } = await supabase
        .from('students')
        .select('login');

      if (error) throw new Error(`students select: ${error.message}`);

      for (const row of existingStudents || []) {
        const login = row.login;
        if (!login) continue;

        if (!incomingStudentLogins.has(login)) {
          const { error: delErr } = await supabase
            .from('students')
            .delete()
            .eq('login', login);

          if (delErr) throw new Error(`students delete ${login}: ${delErr.message}`);
        }
      }
    }

    // =========================
    // 4) FIGURINHAS (UPSERT por week)
    // =========================
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

    // =========================
    // 5) student_stickers (UPSERT)
    // =========================
    if (Array.isArray(studentStickers) && studentStickers.length > 0) {
      for (const ss of studentStickers) {
        if (!ss?.week) continue;

        let studentId = null;

        // se veio UUID
        if (ss.alunoId && typeof ss.alunoId === 'string' && ss.alunoId.includes('-')) {
          studentId = ss.alunoId;
        } else {
          // fallback: tenta resolver pelo login
          const login = ss.alunoLogin || ss.alunoId;
          if (login) {
            const { data: st, error } = await supabase
              .from('students')
              .select('id')
              .eq('login', login)
              .single();

            if (error) {
              // se não achou, só ignora esse registro
              continue;
            }
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
}            .from('students')
            .delete()
            .eq('login', login);

          if (delErr) throw new Error(`students delete ${login}: ${delErr.message}`);
        }
      }
    }

    // =========================
    // 4) FIGURINHAS (UPSERT por week)
    // =========================
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

    // =========================
    // 5) student_stickers (UPSERT)
    // =========================
    if (Array.isArray(studentStickers) && studentStickers.length > 0) {
      for (const ss of studentStickers) {
        if (!ss?.week) continue;

        let studentId = null;

        // se veio UUID
        if (ss.alunoId && typeof ss.alunoId === 'string' && ss.alunoId.includes('-')) {
          studentId = ss.alunoId;
        } else {
          // fallback: tenta resolver pelo login
          const login = ss.alunoLogin || ss.alunoId;
          if (login) {
            const { data: st, error } = await supabase
              .from('students')
              .select('id')
              .eq('login', login)
              .single();

            if (error) {
              // se não achou, só ignora esse registro
              continue;
            }
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
}          },
          { onConflict: 'student_id, week' }
        );
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
