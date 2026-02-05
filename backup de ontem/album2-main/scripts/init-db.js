import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcrjsvgjnbzawrnajgva.supabase.co';
const supabaseKey = 'sb_publishable_t01dpjzy6r1Qdag45eAMvQ_dJtOBG23';

const supabase = createClient(supabaseUrl, supabaseKey);

async function initializeDatabase() {
  try {
    console.log('Iniciando criação de dados...');

    // 1. Inserir professor Tati
    console.log('Verificando professor Tati...');
    const { data: existingProf, error: selectError } = await supabase
      .from('professors')
      .select('*')
      .eq('login', 'Tati')
      .maybeSingle();

    if (!existingProf) {
      console.log('Inserindo professor Tati...');
      const { error: insertError } = await supabase
        .from('professors')
        .insert([
          {
            name: 'Tati',
            email: 'tati@escola.com',
            login: 'Tati',
            password: '385126',
            role: 'professor',
            avatar_url: '',
            avatar_seed: ''
          }
        ]);

      if (insertError) {
        console.error('Erro ao inserir professor:', insertError);
      } else {
        console.log('✅ Professor Tati inserido com sucesso!');
      }
    } else {
      console.log('✅ Professor Tati já existe');
    }

    // 2. Inserir figurinhas
    console.log('Inserindo figurinhas...');
    const stickers = Array.from({ length: 45 }, (_, i) => ({
      week: i + 1,
      name: i + 1 >= 42 ? `Elo Supremo - Parte ${i - 40}` : `Semana ${i + 1}`,
      image_url: ''
    }));

    let insertedCount = 0;
    for (const sticker of stickers) {
      const { data: existingSticker } = await supabase
        .from('stickers')
        .select('*')
        .eq('week', sticker.week)
        .maybeSingle();

      if (!existingSticker) {
        const { error: insertError } = await supabase
          .from('stickers')
          .insert([sticker]);

        if (!insertError) {
          insertedCount++;
        }
      }
    }

    console.log(`✅ ${insertedCount} figurinhas inseridas!`);

    console.log('\n✅ Banco de dados inicializado com sucesso!');
    console.log('Você pode acessar o site agora!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
}

initializeDatabase();
