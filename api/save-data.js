import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const url = process.env.SUPABASE_URL || 'https://bumcjbjnkblzvrjpvafn.supabase.co';
    // Fallback temporário para garantir que o app funcione enquanto o usuário configura as env vars na Vercel
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'sb_secret_vv0rmziTgicFQs1v36ANjw_md444UQy';

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

    // 5. FIGURINHAS DOS ALUNOS
    if (studentStickers.length > 0) {
      // Precisamos dos IDs reais dos alunos e das figurinhas
      const { data: allStudents } = await supabase.from('students').select('id, login');
      const { data: allStickers } = await supabase.from('stickers').select('id, week');
      
      const studentMap = new Map();
      (allStudents || []).forEach(s => studentMap.set(s.login, s.id));
      
      const stickerMap = new Map();
      (allStickers || []).forEach(s => stickerMap.set(s.week, s.id));

      const ssToUpsert = [];
      for (const ss of studentStickers) {
        if (!ss?.week) continue;

        // Tenta achar o ID do aluno pelo login ou ID enviado
        let realStudentId = ss.alunoId;
        
        // Mapeamento direto e simples: prioriza o ID que já é UUID, senão busca pelo login
        if (ss.alunoId && ss.alunoId.length > 30) { 
           realStudentId = ss.alunoId; // Provavelmente já é o UUID do banco afn
        } else {
           const studentObj = students.find(s => s.login === ss.alunoId || s.id === ss.alunoId);
           if (studentObj) realStudentId = studentObj.id;
        }

        if (realStudentId) {
          // Simplificação máxima para garantir o salvamento no banco afn
          ssToUpsert.push({
            student_id: realStudentId,
            week: ss.week,
            liberada: ss.liberada === true,
            is_falta: ss.isFalta === true,
            revelada: ss.revelada === true
          });
        }
           if (ssToUpsert.length > 0) {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < ssToUpsert.length; i += CHUNK_SIZE) {
          const chunk = ssToUpsert.slice(i, i + CHUNK_SIZE);
          console.log(`Upserting chunk of ${chunk.length} stickers...`);
          const { error: ssError } = await supabase
            .from('student_stickers')
            .upsert(chunk, { onConflict: 'student_id, week' });
          
          if (ssError) {
            console.error('Erro no upsert de student_stickers:', ssError);
            throw new Error(`Erro ao salvar figurinhas: ${ssError.message}`);
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
