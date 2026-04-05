import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../src/supabase/supabaseClient';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  lecturer_id: string | null;
  available_slots: string[] | null;
}

export interface Lecturer {
  id: string;
  full_name: string;
  role: string;
}

export interface CourseSlot {
  id: string;
  slot: string;
  lecturer_id: string | null;
}

export function useAdminData() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Загрузка всех данных ──────────────────────────────────────────────────
  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [courseRes, lecturerRes] = await Promise.all([
        supabase.from('courses').select('*').order('title', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('role', 'lecturer')
          .order('full_name', { ascending: true }),
      ]);

      if (courseRes.error) throw courseRes.error;
      if (lecturerRes.error) throw lecturerRes.error;

      setCourses((courseRes.data as Course[]) ?? []);
      setLecturers((lecturerRes.data as Lecturer[]) ?? []);
    } catch (err: any) {
      console.error('Fetch error:', err);
      Alert.alert('Ошибка загрузки', err.message ?? 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Сохранение курса ──────────────────────────────────────────────────────
  const saveCourse = useCallback(
    async (
      courseId: string,
      lecturerId: string | null,
      availableSlots: string[],
      description: string | null,
    ): Promise<boolean> => {
      setLoading(true);
      try {
        const { error: courseError } = await supabase
          .from('courses')
          .update({
            lecturer_id: lecturerId,
            available_slots: availableSlots,
            description: description,
          })
          .eq('id', courseId);
        if (courseError) throw courseError;

        // Пересоздаём записи в course_slots
        const { error: deleteError } = await supabase
          .from('course_slots')
          .delete()
          .eq('course_id', courseId);
        if (deleteError) throw deleteError;

        if (availableSlots.length > 0) {
          const { error: insertError } = await supabase
            .from('course_slots')
            .insert(
              availableSlots.map(slot => ({
                course_id: courseId,
                lecturer_id: lecturerId,
                slot,
              })),
            );
          if (insertError) throw insertError;
        }

        Alert.alert('Готово!', 'Курс обновлён');
        await fetchData();
        return true;
      } catch (err: any) {
        console.error('Save error:', err);
        Alert.alert('Ошибка сохранения', err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchData],
  );

  // ── Создание курса ────────────────────────────────────────────────────────
  const createCourse = useCallback(
    async (title: string, description: string): Promise<boolean> => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        Alert.alert('Ошибка', 'Название курса не может быть пустым');
        return false;
      }
      setLoading(true);
      try {
        const { error } = await supabase.from('courses').insert({
          title: trimmedTitle,
          description: description.trim() || null,
          lecturer_id: null,
          available_slots: [],
        });
        if (error) throw error;

        Alert.alert('Готово!', `Курс «${trimmedTitle}» создан`);
        await fetchData();
        return true;
      } catch (err: any) {
        console.error('Create error:', err);
        Alert.alert('Ошибка создания', err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchData],
  );

  // ── Удаление курса ────────────────────────────────────────────────────────
  // course_slots удаляются автоматически через ON DELETE CASCADE
  const deleteCourse = useCallback(
    async (courseId: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('courses')
          .delete()
          .eq('id', courseId);
        if (error) throw error;

        Alert.alert('Готово!', 'Курс удалён');
        await fetchData();
        return true;
      } catch (err: any) {
        console.error('Delete error:', err);
        Alert.alert('Ошибка удаления', err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchData],
  );

  return {
    courses,
    lecturers,
    loading,
    fetchData,
    saveCourse,
    createCourse,
    deleteCourse,
  };
}