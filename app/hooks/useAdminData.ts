import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../src/supabase/supabaseClient';

export interface Course {
  id: string;
  title: string;
  lecturer_id: string | null;
  available_slots: string[] | null;
}

export interface Lecturer {
  id: string;
  full_name: string;
  role: string;
}

export function useAdminData() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [courseRes, lecturerRes] = await Promise.all([
        supabase.from('courses').select('*').order('title', { ascending: true }),
        supabase.from('profiles').select('id, full_name, role').eq('role', 'lecturer').order('full_name', { ascending: true }),
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

  const saveCourse = useCallback(async (
    courseId: string,
    lecturerId: string | null,
    slots: string[],
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error: courseError } = await supabase
        .from('courses')
        .update({ lecturer_id: lecturerId, available_slots: slots })
        .eq('id', courseId);
      if (courseError) throw courseError;

      const { error: deleteError } = await supabase
        .from('course_slots')
        .delete()
        .eq('course_id', courseId);
      if (deleteError) throw deleteError;

      if (slots.length > 0) {
        const { error: insertError } = await supabase
          .from('course_slots')
          .insert(slots.map(slot => ({ course_id: courseId, lecturer_id: lecturerId, slot })));
        if (insertError) throw insertError;
      }

      Alert.alert('Готово!', 'Курс и слоты обновлены');
      await fetchData();
      return true;
    } catch (err: any) {
      console.error('Save error:', err);
      Alert.alert('Ошибка сохранения', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  return { courses, lecturers, loading, fetchData, saveCourse };
}