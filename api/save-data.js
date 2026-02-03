const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://bumcjbjnkblzvrjpvafn.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_vv0rmziTgicFQs1v36ANjw_md444UQy';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, label) {
  const delays = [0, 300, 900]; // 3 tentativas
  let lastErr = null;

  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.error(`[${label}] tentativa ${i + 1} falhou:`, e && e.message ? e.message : e);
    }
  }
  throw lastErr || new Error(`${label} falhou`);
}

async function chunked(arr, size, fn) {
  for (let i = 0; i < arr.length; i += size) {
    await fn(arr.slice(i, i + size));
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = req.body || {};
    const has = (k) => Object.prototype.hasOwnProperty.call(body, k);

    const professors = body.professors || [];
    const students = body.students || [];
    const stickers = body.stickers || [];
    const studentStickers = body.studentStickers || [];
    const currentWeek = body.currentWeek;

    // 0) SETTINGS
    if (has('currentWeek') && currentWeek !== undefined && currentWeek !== null) {
      await withRetry(async () => {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });
        if (error) throw new Error(error.message);
      }, 'app_settings upsert');
    }

    // 1) PROFESSORS: UPSERT + DELETE (por login)
    if (has('professors')) {
      const desired = (professors || [])
        .filter((p) => p && p.login && p.login !== 'admin')
        .map((p) => ({
          name: p.name || '',
          login: p.login,
          password: p.password || '',
          avatar_url: p.avatarUrl || '',
          avatar_seed: p.avatarSeed || '',
          role: 'professor',
        }));

      if (desired.length > 0) {
        await withRetry(async () => {
          const { error } = await supabase.from('professors').upsert(desired, { onConflict: 'login' });
          if (error) throw new Error(error.message);
        }, 'professors upsert');
      }

      const desiredLogins = new Set(desired.map((p) => p.login));

      const { data: dbProfs, error: eDbProfs } = await withRetry(async () => {
        return await supabase.from('professors').select('id,login').neq('login', 'admin');
      }, 'professors select');
      if (eDbProfs) throw new Error(eDbProfs.message);

      const toDelete = (dbProfs || []).filter((p) => p.login && !desiredLogins.has(p.login));
      if (toDelete.length > 0) {
        const ids = toDelete.map((p) => p.id).filter(Boolean);
        const logins = toDelete.map((p) => p.login).filter(Boolean);

        await chunked(ids, 100, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase.from('students').update({ professor_id: null }).in('professor_id', chunk);
            if (error) throw new Error(error.message);
          }, 'students unlink professor');
        });

        await chunked(logins, 100, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase.from('professors').delete().in('login', chunk);
            if (error) throw new Error(error.message);
          }, 'professors delete');
        });
      }
    }

    // 2) STUDENTS: UPSERT + DELETE (por login)
    if (has('students')) {
      const { data: dbProfs2, error: eDbProfs2 } = await withRetry(async () => {
        return await supabase.from('professors').select('id,login');
      }, 'professors select2');
      if (eDbProfs2) throw new Error(eDbProfs2.message);

      const profLoginToId = new Map();
      (dbProfs2 || []).forEach((p) => profLoginToId.set(p.login, p.id));

      const desired = (students || [])
        .filter((s) => s && s.login)
        .map((s) => {
          let professor_id = s.professorId || null;
          if (typeof professor_id === 'string' && profLoginToId.has(professor_id)) {
            professor_id = profLoginToId.get(professor_id);
          }

          return {
            name: s.name || '',
            login: s.login,
            password: s.password || '',
            professor_id,
            avatar_url: s.avatarUrl || '',
            avatar_seed: s.avatarSeed || '',
            serie: s.serie || '',
            ciclo: s.ciclo || null,
          };
        });

      if (desired.length > 0) {
        await withRetry(async () => {
          const { error } = await supabase.from('students').upsert(desired, { onConflict: 'login' });
          if (error) throw new Error(error.message);
        }, 'students upsert');
      }

      const desiredLogins = new Set(desired.map((s) => s.login));

      const { data: dbStudents, error: eDbStudents } = await withRetry(async () => {
        return await supabase.from('students').select('id,login');
      }, 'students select');
      if (eDbStudents) throw new Error(eDbStudents.message);

      const toDelete = (dbStudents || []).filter((s) => s.login && !desiredLogins.has(s.login));
      if (toDelete.length > 0) {
        const ids = toDelete.map((s) => s.id).filter(Boolean);
        const logins = toDelete.map((s) => s.login).filter(Boolean);

        await chunked(ids, 100, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase.from('student_stickers').delete().in('student_id', chunk);
            if (error) throw new Error(error.message);
          }, 'student_stickers delete removed students');
        });

        await chunked(logins, 100, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase.from('students').delete().in('login', chunk);
            if (error) throw new Error(error.message);
          }, 'students delete');
        });
      }
    }

    // 3) STICKERS: UPSERT + DELETE (se imageUrl vazio)
    if (has('stickers')) {
      const toUpsert = (stickers || [])
        .filter((st) => st && st.week && String(st.imageUrl || '').trim())
        .map((st) => ({
          week: st.week,
          name: st.name || `Semana ${st.week}`,
          image_url: st.imageUrl,
          rarity: st.rarity || 'NORMAL',
        }));

      if (toUpsert.length > 0) {
        await withRetry(async () => {
          const { error } = await supabase.from('stickers').upsert(toUpsert, { onConflict: 'week' });
          if (error) throw new Error(error.message);
        }, 'stickers upsert');
      }

      const weeksToDelete = (stickers || [])
        .filter((st) => st && st.week && !String(st.imageUrl || '').trim())
        .map((st) => st.week);

      if (weeksToDelete.length > 0) {
        await chunked(weeksToDelete, 100, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase.from('stickers').delete().in('week', chunk);
            if (error) throw new Error(error.message);
          }, 'stickers delete');
        });
      }
    }

    // 4) PRESENÇAS: UPSERT (não deleta)
    if (has('studentStickers')) {
      const { data: dbStudents2, error: eDbStudents2 } = await withRetry(async () => {
        return await supabase.from('students').select('id');
      }, 'students select for presence');
      if (eDbStudents2) throw new Error(eDbStudents2.message);

      const validIds = new Set((dbStudents2 || []).map((s) => s.id));

      const desired = (studentStickers || [])
        .filter((ss) => ss && ss.week && ss.alunoId && validIds.has(ss.alunoId))
        .map((ss) => ({
          student_id: ss.alunoId,
          week: ss.week,
          liberada: ss.liberada === true,
          is_falta: ss.isFalta === true,
          revelada: ss.revelada === true,
        }));

      if (desired.length > 0) {
        await chunked(desired, 50, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase
              .from('student_stickers')
              .upsert(chunk, { onConflict: 'student_id,week' });
            if (error) throw new Error(error.message);
          }, 'student_stickers upsert');
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
};          }, 'students unlink professor');
        });

        // apaga professores ausentes
        await chunked(logins, 100, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase.from('professors').delete().in('login', chunk);
            if (error) throw new Error(error.message);
          }, 'professors delete');
        });
      }
    }

    // =========================
    // 2) STUDENTS: UPSERT + DELETE (pelo login)
    // =========================
    if (has('students')) {
      // mapa professor login->id (pra professor_id)
      const { data: dbProfs2, error: eDbProfs2 } = await withRetry(async () => {
        return await supabase.from('professors').select('id,login');
      }, 'professors select2');
      if (eDbProfs2) throw new Error(eDbProfs2.message);

      const profLoginToId = new Map();
      (dbProfs2 || []).forEach((p) => profLoginToId.set(p.login, p.id));

      const desired = (students || [])
        .filter((s) => s?.login)
        .map((s) => {
          let professor_id = s.professorId || null;
          if (typeof professor_id === 'string' && profLoginToId.has(professor_id)) professor_id = profLoginToId.get(professor_id);

          return {
            name: s.name || '',
            login: s.login,
            password: s.password || '',
            professor_id,
            avatar_url: s.avatarUrl || '',
            avatar_seed: s.avatarSeed || '',
            serie: s.serie || '',
            ciclo: s.ciclo || null,
          };
        });

      if (desired.length > 0) {
        await withRetry(async () => {
          const { error } = await supabase.from('students').upsert(desired, { onConflict: 'login' });
          if (error) throw new Error(error.message);
        }, 'students upsert');
      }

      const desiredLogins = new Set(desired.map((s) => s.login));

      const { data: dbStudents, error: eDbStudents } = await withRetry(async () => {
        return await supabase.from('students').select('id,login');
      }, 'students select');
      if (eDbStudents) throw new Error(eDbStudents.message);

      const toDelete = (dbStudents || []).filter((s) => s.login && !desiredLogins.has(s.login));
      if (toDelete.length > 0) {
        const ids = toDelete.map((s) => s.id).filter(Boolean);
        const logins = toDelete.map((s) => s.login).filter(Boolean);

        // limpa presenças do aluno antes de deletar (FK)
        await chunked(ids, 100, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase.from('student_stickers').delete().in('student_id', chunk);
            if (error) throw new Error(error.message);
          }, 'student_stickers delete removed students');
        });

        // apaga os alunos
        await chunked(logins, 100, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase.from('students').delete().in('login', chunk);
            if (error) throw new Error(error.message);
          }, 'students delete');
        });
      }
    }

    // =========================
    // 3) STICKERS: UPSERT + DELETE (se imageUrl vazio)
    // =========================
    if (has('stickers')) {
      const toUpsert = (stickers || [])
        .filter((st) => st?.week && String(st.imageUrl || '').trim())
        .map((st) => ({
          week: st.week,
          name: st.name || `Semana ${st.week}`,
          image_url: st.imageUrl,
          rarity: st.rarity || 'NORMAL',
        }));

      if (toUpsert.length > 0) {
        await withRetry(async () => {
          const { error } = await supabase.from('stickers').upsert(toUpsert, { onConflict: 'week' });
          if (error) throw new Error(error.message);
        }, 'stickers upsert');
      }

      const weeksToDelete = (stickers || [])
        .filter((st) => st?.week && !String(st.imageUrl || '').trim())
        .map((st) => st.week);

      if (weeksToDelete.length > 0) {
        await chunked(weeksToDelete, 100, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase.from('stickers').delete().in('week', chunk);
            if (error) throw new Error(error.message);
          }, 'stickers delete');
        });
      }
    }

    // =========================
    // 4) PRESENÇAS: só UPSERT (sem deletar para não apagar coisa por engano)
    // =========================
    if (has('studentStickers')) {
      // mapa de alunos válidos
      const { data: dbStudents2, error: eDbStudents2 } = await withRetry(async () => {
        return await supabase.from('students').select('id');
      }, 'students select for presence');
      if (eDbStudents2) throw new Error(eDbStudents2.message);

      const validIds = new Set((dbStudents2 || []).map((s) => s.id));

      const desired = (studentStickers || [])
        .filter((ss) => ss?.week && ss?.alunoId && validIds.has(ss.alunoId))
        .map((ss) => ({
          student_id: ss.alunoId,
          week: ss.week,
          liberada: ss.liberada === true,
          is_falta: ss.isFalta === true,
          revelada: ss.revelada === true,
        }));

      if (desired.length > 0) {
        await chunked(desired, 50, async (chunk) => {
          await withRetry(async () => {
            const { error } = await supabase
              .from('student_stickers')
              .upsert(chunk, { onConflict: 'student_id,week' });
            if (error) throw new Error(error.message);
          }, 'student_stickers upsert');
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
