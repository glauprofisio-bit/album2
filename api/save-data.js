import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://bumcjbjnkblzvrjpvafn.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_vv0rmziTgicFQs1v36ANjw_md444UQy';

function isUuidLike(x) {
  return typeof x === 'string' && x.includes('-') && x.length > 20;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      professors = [],
      students = [],
      stickers = [],
      studentStickers = [],
      currentWeek
    } = req.body || {};

    // =========================
    // 0) SETTINGS
    // =========================
    if (currentWeek !== undefined && currentWeek !== null) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });

      if (error) throw new Error(`app_settings: ${error.message}`);
    }

    // =========================
    // 1) PROFESSORS (UPSERT)
    // =========================
    const profsToUpsert = (professors || [])
      .filter(p => p?.login && p.login !== 'admin' && p.id !== 'admin')
      .map(p => ({
        name: p.name || '',
        login: p.login,
        password: p.password || '',
        avatar_url: p.avatarUrl || '',
        avatar_seed: p.avatarSeed || '',
        role: 'professor'
      }));

    if (profsToUpsert.length > 0) {
      const { error } = await supabase
        .from('professors')
        .upsert(profsToUpsert, { onConflict: 'login' });

      if (error) throw new Error(`professors upsert: ${error.message}`);
    }

    // mapa professor login -> uuid
    const { data: dbProfs, error: eDbProfs } = await supabase
      .from('professors')
      .select('id,login');

    if (eDbProfs) throw new Error(`professors select: ${eDbProfs.message}`);

    const profLoginToId = new Map();
    (dbProfs || []).forEach(p => profLoginToId.set(p.login, p.id));

    // =========================
    // 2) STUDENTS (UPSERT)
    // =========================
    const studentsToUpsert = (students || [])
      .filter(s => s?.login)
      .map(s => {
        // resolve professor_id
        let professor_id = s.professorId || null;

        // professorId pode ser id local, login ou uuid
        const profObj = (professors || []).find(p => p.id === s.professorId || p.login === s.professorId);
        if (profObj?.login && profLoginToId.has(profObj.login)) {
          professor_id = profLoginToId.get(profObj.login);
        }
        if (isUuidLike(s.professorId)) professor_id = s.professorId;

        return {
          name: s.name || '',
          login: s.login,
          password: s.password || '',
          professor_id,
          avatar_url: s.avatarUrl || '',
          avatar_seed: s.avatarSeed || '',
          serie: s.serie || '',
          ciclo: s.ciclo || null
        };
      });

    if (studentsToUpsert.length > 0) {
      const { error } = await supabase
        .from('students')
        .upsert(studentsToUpsert, { onConflict: 'login' });

      if (error) throw new Error(`students upsert: ${error.message}`);
    }

    // Agora pega os IDs REAIS dos alunos
    const { data: dbStudents, error: eDbStudents } = await supabase
      .from('students')
      .select('id,login');

    if (eDbStudents) throw new Error(`students select: ${eDbStudents.message}`);

    const studentLoginToId = new Map();
    const validStudentIds = new Set();
    (dbStudents || []).forEach(s => {
      studentLoginToId.set(s.login, s.id);
      validStudentIds.add(s.id);
    });

    // Mapa idLocal -> login (para quando a presença vier com id tipo "student-1")
    const localStudentIdToLogin = new Map();
    (students || []).forEach(s => {
      if (s?.id && s?.login) localStudentIdToLogin.set(s.id, s.login);
    });

    // =========================
    // 3) STICKERS (UPSERT)
    // =========================
    const stickersToUpsert = (stickers || [])
      .filter(st => st?.week && String(st.imageUrl || '').trim())
      .map(st => ({
        week: st.week,
        name: st.name || `Semana ${st.week}`,
        image_url: st.imageUrl,
        rarity: st.rarity || 'NORMAL'
      }));

    if (stickersToUpsert.length > 0) {
      const { error } = await supabase
        .from('stickers')
        .upsert(stickersToUpsert, { onConflict: 'week' });

      if (error) throw new Error(`stickers upsert: ${error.message}`);
    }

    // =========================
    // 4) PRESENÇA (student_stickers) - SEM FK NUNCA MAIS
    // =========================
    const invalidPresence = [];
    const desired = (studentStickers || [])
      .filter(ss => ss?.week)
      .map(ss => {
        let student_id = ss.alunoId;

        // 1) se já é uuid
        if (isUuidLike(student_id)) {
          // ok, mas vamos validar que existe
        }
        // 2) se veio login
        else if (typeof student_id === 'string' && studentLoginToId.has(student_id)) {
          student_id = studentLoginToId.get(student_id);
        }
        // 3) se veio id local tipo "student-1"
        else if (typeof student_id === 'string' && localStudentIdToLogin.has(student_id)) {
          const login = localStudentIdToLogin.get(student_id);
          if (studentLoginToId.has(login)) student_id = studentLoginToId.get(login);
        }

        return {
          _rawAlunoId: ss.alunoId,
          student_id,
          week: ss.week,
          liberada: ss.liberada === true,
          is_falta: ss.isFalta === true,
          revelada: ss.revelada === true
        };
      })
      .filter(x => {
        // valida FK ANTES: só deixa passar se student_id existe em students.id
        const ok = isUuidLike(x.student_id) && validStudentIds.has(x.student_id);
        if (!ok) invalidPresence.push({ alunoId: x._rawAlunoId, mapped: x.student_id, week: x.week });
        return ok;
      })
      .map(({ _rawAlunoId, ...rest }) => rest);

    if (desired.length > 0) {
      const CHUNK = 50;
      for (let i = 0; i < desired.length; i += CHUNK) {
        const chunk = desired.slice(i, i + CHUNK);
        const { error } = await supabase
          .from('student_stickers')
          .upsert(chunk, { onConflict: 'student_id,week' });

        if (error) throw new Error(`student_stickers upsert: ${error.message}`);
      }
    }

    // Se quiser deixar rastro para debugar, devolve os inválidos (não quebra o save)
    // Assim você vê quem está vindo com alunoId errado
    return res.status(200).json({
      success: true,
      presenceSaved: desired.length,
      presenceSkipped: invalidPresence.length,
      skipped: invalidPresence.slice(0, 50)
    });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
