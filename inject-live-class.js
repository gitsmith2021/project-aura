const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log("Fetching Biotechnology department...");
  const { data: dept, error: deptErr } = await supabase
    .from('departments')
    .select('id, tenant_id')
    .eq('name', 'Biotechnology')
    .limit(1)
    .single();

  if (deptErr || !dept) {
    console.error("Could not find Biotechnology department:", deptErr);
    return;
  }
  console.log("Found dept:", dept.id);

  console.log("Fetching a staff member...");
  const { data: staff, error: staffErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('department_id', dept.id)
    .eq('role', 'STAFF')
    .limit(1)
    .single();

  if (staffErr || !staff) {
    console.error("Could not find staff member:", staffErr);
    return;
  }
  console.log("Found staff:", staff.id);

  console.log("Checking for subject 'Advanced Genetic Engineering'...");
  let { data: subject, error: subErr } = await supabase
    .from('subjects')
    .select('id')
    .eq('name', 'Advanced Genetic Engineering')
    .eq('department_id', dept.id)
    .limit(1)
    .single();

  if (!subject) {
    console.log("Subject not found, creating it...");
    const { data: newSub, error: newSubErr } = await supabase
      .from('subjects')
      .insert({
        name: 'Advanced Genetic Engineering',
        department_id: dept.id,
        color: '#10b981' // Emerald
      })
      .select()
      .single();

    if (newSubErr) {
      console.error("Error creating subject:", newSubErr);
      return;
    }
    subject = newSub;
  }
  console.log("Subject ID:", subject.id);

  console.log("Inserting class schedule...");
  // Use today's day of week
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];

  // Calculate current time to make it "Live Now"
  const now = new Date();
  const startHour = String(now.getHours()).padStart(2, '0');
  const startMin = String(now.getMinutes()).padStart(2, '0');

  // End time is 2 hours from now
  const endHour = String((now.getHours() + 2) % 24).padStart(2, '0');

  const startTime = `${startHour}:${startMin}:00`;
  const endTime = `${endHour}:${startMin}:00`;

  const { data: sched, error: schedErr } = await supabase
    .from('class_schedules')
    .insert({
      department_id: dept.id,
      subject_id: subject.id,
      staff_id: staff.id,
      day_of_week: today,
      start_time: startTime,
      end_time: endTime
    })
    .select()
    .single();

  if (schedErr) {
    console.error("Error inserting schedule:", schedErr);
    return;
  }

  console.log("Successfully injected live class schedule!");
  console.log(sched);
}

run();