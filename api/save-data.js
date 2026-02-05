import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Chaves reais forçadas para evitar erro 500 na Vercel
    const supabaseUrl = 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseKey = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcmpzdmdqbmJ6YXdybmFqZ3ZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTkxMDQzNiwiZXhwIjoyMDg1NDg2NDM2fQ.jeGMKAjhPed06OR6NlOj316Emho6YdkUSylZsS49-Fs;

    if (!url || !serviceKey) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabase = createClient(url, serviceKey);

    const {
      professors = [],
      students = [],
      stickers = [],
      studentStickers = [],
      currentWeek
    } = req.body || {};

    // 1. Configurações Globais
    if (currentWeek !== undefined && currentWeek !== null) {
      await supabase
        .from('app_settings')
        .upsert({ id: 'global', current_week: currentWeek }, { onConflict: 'id' });
    }

    // 2. PROFESSORES
    if (professors.length > 0) {
      const profsToUpsert = professors
        .filter(p => p?.login && p.id !== 'admin' && p.login !== 'admin')
        .map(p => ({
          name: p.name || '',
          login: p.login,
          password: p.password || '',
          avatar_url: p.avatarUrl || '',
          avatar_seed: p.avatarSeed || '',
          // REMOVIDO: email (para evitar erro de UNIQUE e campo inexistente)
          role: 'professor'
        }));

      if (profsToUpsert.length > 0) {
        const { error } = await supabase.from('professors').upsert(profsToUpsert, { onConflict: 'login' });
        if (error) throw new Error(`Professors: ${error.message}`);
      }

      // Sincronização de Professores
      const incomingProfLogins = new Set(profsToUpsert.map(p => p.login));
      const { data: existingProfs } = await supabase.from('professors').select('id,login');
      const toDelete = (existingProfs || []).filter(r => r.login !== 'admin' && !incomingProfLogins.has(r.login));

      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(x => x.id);
        await supabase.from('students').update({ professor_id: null }).in('professor_id', idsToDelete);
        await supabase.from('professors').delete().in('id', idsToDelete);
      }
    }

    // 3. ALUNOS
    if (students.length > 0) {
      // Precisamos pegar os IDs reais dos professores para vincular os alunos corretamente
      const { data: allProfs } = await supabase.from('professors').select('id, login');
      const profMap = new Map();
      (allProfs || []).forEach(p => profMap.set(p.login, p.id));

      const studentsToUpsert = [];
      for (const s of students) {
        if (!s?.login) continue;
        
        // Resolve o ID do professor pelo login, caso o ID enviado seja temporário
        let realProfId = s.professorId;
        const profByLogin = professors.find(p => p.id === s.professorId);
        if (profByLogin && profMap.has(profByLogin.login)) {
          realProfId = profMap.get(profByLogin.login);
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
          // REMOVIDO: email
        });
      }

      if (studentsToUpsert.length > 0) {
        const { error } = await supabase.from('students').upsert(studentsToUpsert, { onConflict: 'login' });
        if (error) throw new Error(`Students: ${error.message}`);
      }

      // Sincronização de Alunos
      const incomingStudentLogins = new Set(studentsToUpsert.map(s => s.login));
      const { data: existingStudents } = await supabase.from('students').select('id,login');
      const toDelete = (existingStudents || []).filter(r => !incomingStudentLogins.has(r.login));

      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(x => x.id);
        await supabase.from('student_stickers').delete().in('student_id', idsToDelete);
        await supabase.from('students').delete().in('id', idsToDelete);
      }
    }

    // 4. FIGURINHAS
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
        await supabase.from('stickers').upsert(stickersToUpsert, { onConflict: 'week' });
      }

      const weeksToEmpty = stickers.filter(st => st?.week && !String(st.imageUrl || '').trim()).map(st => st.week);
      if (weeksToEmpty.length > 0) {
        await supabase.from('stickers').delete().in('week', weeksToEmpty);
      }
    }

        // 5. FIGURINHAS DOS ALUNOS (presença/falta/liberação/revelação)
    if (studentStickers.length > 0) {
      const { data: allStudents, error: eAllStudents } = await supabase
        .from('students')
        .select('id, login');

      if (eAllStudents) throw new Error(`students(select): ${eAllStudents.message}`);

      const studentLoginToId = new Map();
      (allStudents || []).forEach(s => studentLoginToId.set(s.login, s.id));

      const looksLikeUuid = (v) =>
        typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

      const resolveStudentId = (alunoId) => {
        if (!alunoId) return null;

        // 1) se já veio UUID do banco
        if (looksLikeUuid(alunoId)) return alunoId;

        // 2) se veio o login do aluno
        if (studentLoginToId.has(alunoId)) return studentLoginToId.get(alunoId);

        // 3) se veio um id local (tipo "stud-1"), tenta achar no array students e usar o login
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

          const { error: ssError } = await supabase
            .from('student_stickers')
            .upsert(chunk, { onConflict: 'student_id,week' });

          if (ssError) throw new Error(`student_stickers: ${ssError.message}`);
        }
      }
    }

  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
