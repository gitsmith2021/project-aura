import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from("schedules")
    .select("id, start_time, end_time, department_id, subject_name, staff:profiles(full_name)")
    .eq("id", "9c261223-5a02-4593-bd9e-0370585beea2")
    .single();
  
  console.log("Data:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}

test();