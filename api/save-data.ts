import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseKey = 'sb_publishable_t01dpjzy6r1Qdag45eAMvQ_dJtOBG23';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { professors, students, studentStickers } = req.body;

    if (professors) {
      for (const prof of professors) {
        if (prof.id === 'admin') continue;
        await supabase.from('professors').upsert({
          id: prof.id.includes('-') ? prof.id : undefined,
          name: prof.name,
          email: prof.email || `${prof.login}@escola.com`,
          login: prof.login,
          password: prof.password,
          role: prof.role || 'professor',
          avatar_url: prof.avatarUrl,
          avatar_seed: prof.avatarSeed
        }, { onConflict: 'login' });
      }
    }

    if (students) {
      for (const student of students) {
        await supabase.from('students').upsert({
          id: student.id.includes('-') ? student.id : undefined,
          name: student.name,
          email: student.email || `${student.login}@aluno.com`,
          login: student.login,
          password: student.password,
          professor_id: student.professorId,
          avatar_url: student.avatarUrl,
          avatar_seed: student.avatarSeed
        }, { onConflict: 'login' });
      }
    }

    if (studentStickers) {
      for (const ss of studentStickers) {
        await supabase.from('student_stickers').upsert({
          student_id: ss.studentId,
          sticker_id: ss.stickerId,
          collected_at: ss.collectedAt
        }, { onConflict: 'student_id,sticker_id' });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
