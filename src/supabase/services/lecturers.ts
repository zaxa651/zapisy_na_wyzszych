import { supabase } from "../supabaseClient";

// Отримати всіх викладачів
export async function getLecturers() {
  const { data, error } = await supabase.from("lecturers").select(`
      *,
      profiles (full_name) 
    `); // Join з профілем, якщо ім'я там. Якщо ім'я в lecturers — просто "*"

  if (error) {
    console.error("getLecturers error:", error.message);
    return [];
  }

  return data;
}

// Отримати одного викладача за ID
export async function getLecturerById(id: string) {
  const { data, error } = await supabase
    .from("lecturers")
    .select(
      `
      *,
      profiles (full_name)
    `,
    )
    .eq("id", id)
    .single(); // Очікуємо один рядок

  if (error) {
    console.error("getLecturerById error:", error.message);
    return null;
  }

  return data;
}
