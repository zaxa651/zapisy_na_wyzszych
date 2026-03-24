import { supabase } from "../supabaseClient";

export async function getCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select("*");

  if (error) {
    console.error("getCourses error:", error.message);
    return [];
  }

  return data;
}

export async function enroll(courseId: string, userId: string) {
  const { error } = await supabase
    .from("enrollments")
    .insert([
      {
        student_id: userId,
        course_id: courseId,
      },
    ]);

  if (error) console.error("enroll error:", error.message);
}