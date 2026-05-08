const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const { data, error } = await supabase.from('departments').select(`
    id,
    name,
    students:profiles!department_id(count)
  `).eq('tenant_id', '66a15940-165e-4099-8e88-5ce8d8ac0ae7').eq('students.role', 'STUDENT');
  console.log(JSON.stringify(data, null, 2));
  console.log(error);
}
test();