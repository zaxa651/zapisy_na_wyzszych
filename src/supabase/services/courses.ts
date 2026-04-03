import { supabase } from "../supabaseClient";

export async function getCourses() {
  const { data, error } = await supabase.from("courses").select("*");
  if (error) {
    console.error("getCourses error:", error.message);
    return [];
  }
  return data;
}

// НОВА ФУНКЦІЯ: Отримання слотів конкретного курсу з викладачами
export async function getCourseSlots(courseId: string) {
  const { data, error } = await supabase
    .from("course_slots")
    .select(
      `
      id,
      slot,
      lecturer_id,
      lecturers (
        id,
        academic_title,
        avatar_url,
        bio
      )
    `,
    )
    .eq("course_id", courseId);

  if (error) {
    console.error("getCourseSlots error:", error.message);
    return [];
  }

  return data;
}

// ОНОВЛЕНА ФУНКЦІЯ: Запис на курс із конкретним слотом
export async function enroll(
  courseId: string,
  userId: string,
  slotId: string,
  lecturerId: string,
) {
  const { error } = await supabase.from("enrollments").insert([
    {
      student_id: userId,
      course_id: courseId,
      selected_slot: slotId, // Додаємо ID слота
      lecturer_id: lecturerId, // Додаємо ID викладача
    },
  ]);

  if (error) {
    console.error("enroll error:", error.message);
    return { success: false, message: error.message };
  }

  return { success: true };
}
