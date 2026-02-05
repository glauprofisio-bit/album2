import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabase = createClient(url, serviceKey);

    const body = req.body || {};
    const professors = Array.isArray(body.professors) ? body.professors : [];
    const students = Array.isArray(body.students) ? body.students : [];
    const stickers = Array.isArray(body.stickers) ? body.stickers : [];
    const studentStickers = Array.isArray(body.studentStickers) ? body.studentStickers : [];
    const currentWeek = body.currentWeek;

    // 1) Config global
    if (currentWeek !== undefined && currentWeek !== null) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });
      if (error) throw new Error(`app_settings: ${error.message}`);
    }

    // 2) PROFESSORES (SALVA + EXCLUI MESMO SE VIER VAZIO)
    {
      const profsToUpsert = professors
        .filter(p => p?.login && p.id !== 'admin' && p.login !== 'admin')
        .map(p => ({
          name: p.name || '',
          login: p.login,
          password: p.password || '',
          avatar_url: p.avatarUrl || '',
          avatar_seed: p.avatarSeed || '',
          role: 'professor'
        }));

      if (profsToUpsert.length > 0) {
        const { error } = await supabase.from('professors').upsert(profsToUpsert, { onConflict: 'login' });
        if (error) throw new Error(`professors(upsert): ${error.message}`);
      }

      // sempre sincroniza exclusão
      const incomingProfLogins = new Set(profsToUpsert.map(p => p.login));

      const { data: existingProfs, error: eExisting } = await supabase
        .from('professors')
        .select('id,login');

      if (eExisting) throw new Error(`professors(select): ${eExisting.message}`);

      const toDelete = (existingProfs || []).filter(
        r => r.login !== 'admin' && !incomingProfLogins.has(r.login)
      );

      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(x => x.id);
        await supabase.from('students').update({ professor_id: null }).in('professor_id', idsToDelete);
        const { error: eDel } = await supabase.from('professors').delete().in('id', idsToDelete);
        if (eDel) throw new Error(`professors(delete): ${eDel.message}`);
      }
    }

    // 3) ALUNOS (SALVA + EXCLUI MESMO SE VIER VAZIO)
    {
      const { data: allProfs, error: eAllProfs } = await supabase.from('professors').select('id, login');
      if (eAllProfs) throw new Error(`professors(select ids): ${eAllProfs.message}`);

      const profLoginToId = new Map();
      (allProfs || []).forEach(p => profLoginToId.set(p.login, p.id));

      const studentsToUpsert = [];
      for (const s of students) {
        if (!s?.login) continue;

        // tenta resolver professor_id real
        let realProfId = s.professorId || null;

        // se veio um id "local", tenta achar o professor no array e mapear pelo login
        const profLocal = professors.find(p => p.id === s.professorId);
        if (profLocal?.login && profLoginToId.has(profLocal.login)) {
          realProfId = profLoginToId.get(profLocal.login);
        }

        studentsToUpsert.push({
          name: s.name || '',
          login: s.login,
          password: s.password || '',
          professor_id: realProfId || null,
          avatar_url: s.avatarUrl || '',
          avatar_seed: s.avatarSeed || '',
          serie: s.serie || '',
          ciclo: s.ciclo || null
        });
      }

      if (studentsToUpsert.length > 0) {
        const { error } = await supabase.from('students').upsert(studentsToUpsert, { onConflict: 'login' });
        if (error) throw new Error(`students(upsert): ${error.message}`);
      }

      // sempre sincroniza exclusão
      const incomingStudentLogins = new Set(studentsToUpsert.map(s => s.login));

      const { data: existingStudents, error: eExisting } = await supabase
        .from('students')
        .select('id,login');

      if (eExisting) throw new Error(`students(select): ${eExisting.message}`);

      const toDelete = (existingStudents || []).filter(r => !incomingStudentLogins.has(r.login));

      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(x => x.id);
        await supabase.from('student_stickers').delete().in('student_id', idsToDelete);
        const { error: eDel } = await supabase.from('students').delete().in('id', idsToDelete);
        if (eDel) throw new Error(`students(delete): ${eDel.message}`);
      }
    }

    // 4) FIGURINHAS (salva as com imagem; apaga as que ficaram sem imagem)
    if (stickers.length > 0) {
      const stickersToUpsert = stickers
        .filter(st => st?.week && String(st.imageUrl || '').trim())
        .map(st => ({
          week: st.week,
          name: st.name || `Semana ${st.week}`,
          image_url: st.imageUrl,
          rarity: st.rarity || 'NORMAL'
        }));

      if (stickersToUpsert.length > 0) {
        const { error } = await supabase.from('stickers').upsert(stickersToUpsert, { onConflict: 'week' });
        if (error) throw new Error(`stickers(upsert): ${error.message}`);
      }

      const weeksToEmpty = stickers
        .filter(st => st?.week && !String(st.imageUrl || '').trim())
        .map(st => st.week);

      if (weeksToEmpty.length > 0) {
        const { error } = await supabase.from('stickers').delete().in('week', weeksToEmpty);
        if (error) throw new Error(`stickers(delete): ${error.message}`);
      }
    }

    // 5) PRESENÇA/FALTA (student_stickers)
    if (studentStickers.length > 0) {
      const { data: allStudents, error: eAllStudents } = await supabase
        .from('students')
        .select('id, login');

      if (eAllStudents) throw new Error(`students(select ids): ${eAllStudents.message}`);

      const studentLoginToId = new Map();
      (allStudents || []).forEach(s => studentLoginToId.set(s.login, s.id));

      const looksLikeUuid = (v) =>
        typeof v === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

      const resolveStudentId = (alunoId) => {
        if (!alunoId) return null;
        if (looksLikeUuid(alunoId)) return alunoId;
        if (studentLoginToId.has(alunoId)) return studentLoginToId.get(alunoId);

        const local = (students || []).find(s => s.id === alunoId);
        if (local?.login && studentLoginToId.has(local.login)) return studentLoginToId.get(local.login);

        return null;
      };

      const ssToUpsert = [];
      for (const ss of studentStickers) {
        if (!ss?.week) continue;

        const realStudentId = resolveStudentId(ss.alunoId);
        if (!realStudentId) continue;

        ssToUpsert.push({
          student_id: realStudentId,
          week: ss.week,
          liberada: ss.liberada === true,
          revelada: ss.revelada === true,
          is_falta: ss.isFalta === true,
          reconquistada: ss.reconquistada === true
        });
      }

      if (ssToUpsert.length > 0) {
        const CHUNK_SIZE = 100;
        for (let i = 0; i < ssToUpsert.length; i += CHUNK_SIZE) {
          const chunk = ssToUpsert.slice(i, i + CHUNK_SIZE);

          const { error } = await supabase
            .from('student_stickers')
            .upsert(chunk, { onConflict: 'student_id,week' });

          if (error) throw new Error(`student_stickers(upsert): ${error.message}`);
        }
      }
    }

    // ✅ resposta final (isso faltava no seu arquivo)
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
