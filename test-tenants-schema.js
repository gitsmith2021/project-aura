const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nsaheksysxinemtjcako.supabase.co';
const supabaseKey = 'sb_publishable_0QZApyONjzPE8uplpbaOlA_9gdWwQZ0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('institutions').select('*').limit(1);
  console.log(data ? Object.keys(data[0]) : error);
}
test();
