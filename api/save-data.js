import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

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
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });

      if (error) throw new Error(`app_settings upsert: ${error.message}`);
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

        const { error } = await supabase.from('professors').upsert(
          {
            name: p.name || '',
            login: p.login,
            password: p.password || '',
            avatar_url: p.avatarUrl || '',
            avatar_seed: p.avatarSeed || ''
          },
          { onConflict: 'login' }
        );
        if (error) throw new Error(`professors upsert ${p.login}: ${error.message}`);
      }
    }

    // delete do que não existe mais
    {
      const { data: existingProfs, error } = await supabase.from('professors').select('login');
      if (error) throw new Error(`professors select: ${error.message}`);

      const toDelete = (existingProfs || [])
        .map(r => r.login)
        .filter(l => l && l !== 'admin' && !incomingProfLogins.has(l));

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from('professors').delete().in('login', toDelete);
        if (delErr) throw new Error(`professors delete: ${delErr.message}`);
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

        const { error } = await supabase.from('students').upsert(
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
        if (error) throw new Error(`students upsert ${s.login}: ${error.message}`);
      }
    }

    // delete alunos removidos
    {
      const { data: existingStudents, error } = await supabase.from('students').select('login');
      if (error) throw new Error(`students select: ${error.message}`);

      const toDelete = (existingStudents || [])
        .map(r => r.login)
        .filter(l => l && !incomingStudentLogins.has(l));

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from('students').delete().in('login', toDelete);
        if (delErr) throw new Error(`students delete: ${delErr.message}`);
      }
    }

    // =========================
    // 4) FIGURINHAS (UPSERT)
    // =========================
    if (Array.isArray(stickers)) {
      for (const st of stickers) {
        if (!st?.week) continue;

        const { error } = await supabase.from('stickers').upsert(
          {
            week: st.week,
            name: st.name || `Semana ${st.week}`,
            image_url: st.imageUrl || '',
            rarity: st.rarity || 'NORMAL'
          },
          { onConflict: 'week' }
        );
        if (error) throw new Error(`stickers upsert week ${st.week}: ${error.message}`);
      }
    }

    // =========================
    // 5) student_stickers (UPSERT)
    // =========================
    if (Array.isArray(studentStickers) && studentStickers.length > 0) {
      for (const ss of studentStickers) {
        if (!ss?.week) continue;

        let studentId = null;

        // UUID direto
        if (ss.alunoId && typeof ss.alunoId === 'string' && ss.alunoId.includes('-')) {
          studentId = ss.alunoId;
        } else {
          const login = ss.alunoLogin || ss.alunoId;
          if (login) {
            const { data: st, error } = await supabase
              .from('students')
              .select('id')
              .eq('login', login)
              .single();

            if (error) continue;
            if (st?.id) studentId = st.id;
          }
        }

        if (!studentId) continue;

        const { error } = await supabase.from('student_stickers').upsert(
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
        if (error) throw new Error(`student_stickers upsert ${studentId}/${ss.week}: ${error.message}`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}      if (error) throw new Error(`students select: ${error.message}`);

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
