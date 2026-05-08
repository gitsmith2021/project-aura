import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { student_id, schedule_id, tenant_id } = body;

    if (!student_id || !schedule_id || !tenant_id) {
      return NextResponse.json(
        { error: "student_id, schedule_id, and tenant_id are required" },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    // We use the service role key if available, otherwise anon key
    // For a real hardware endpoint, we'd use a service role or a specific hardware auth token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert or update attendance record
    const { data, error } = await supabase
      .from("attendance")
      .upsert(
        {
          student_id,
          schedule_id,
          status: "present",
        },
        { onConflict: "schedule_id, student_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error recording attendance:", error);
      // If table doesn't exist, return a specific error
      if (error.code === 'PGRST205') {
        return NextResponse.json(
          { error: "Attendance table does not exist. Please run the migration." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Pulse API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}