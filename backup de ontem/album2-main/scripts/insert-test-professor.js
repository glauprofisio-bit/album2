import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseKey = 'sb_publishable_t01dpjzy6r1Qdag45eAMvQ_dJtOBG23';

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestProfessor() {
  try {
    console.log('Inserindo professor de teste...');

    const { data, error } = await supabase
      .from('professors')
      .insert([
        {
          name: 'Professor Teste',
          email: 'teste@escola.com',
          login: 'teste',
          password: '123456',
          role: 'professor',
          avatar_url: '',
          avatar_seed: ''
        }
      ])
      .select();

    if (error) {
      console.error('Erro ao inserir professor:', error);
    } else {
      console.log('✅ Professor inserido com sucesso!', data);
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

insertTestProfessor();
