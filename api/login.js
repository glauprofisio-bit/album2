import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseKey = 'sb_publishable_t01dpjzy6r1Qdag45eAMvQ_dJtOBG23';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { login, password, role } = req.body;

    if (!login || !password || !role) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Admin login
    if (role === 'admin') {
      if (login === 'Glau' && password === 'Smart200#') {
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
          success: true,
          user: {
            id: 'admin',
            name: 'Administrador Glau',
            email: 'admin@escola.com',
            login: 'Glau',
            role: 'admin'
          }
        });
      } else {
        res.setHeader('Content-Type', 'application/json');
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    // Professor login
    if (role === 'professor') {
      const { data, error } = await supabase
        .from('professors')
        .select('*')
        .eq('login', login)
        .eq('password', password)
        .single();

      if (error || !data) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        user: {
          id: data.id,
          name: data.name,
          email: data.email,
          login: data.login,
          role: 'professor'
        }
      });
    }

    // Student login
    if (role === 'student') {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('login', login)
        .eq('password', password)
        .single();

      if (error || !data) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({
        success: true,
        user: {
          id: data.id,
          name: data.name,
          email: data.email,
          login: data.login,
          role: 'student',
          professorId: data.professor_id
        }
      });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'Invalid role' });
  } catch (error) {
    console.error('Login error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
