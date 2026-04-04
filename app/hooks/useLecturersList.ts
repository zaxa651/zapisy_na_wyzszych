import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../src/supabase/supabaseClient';

export interface Lecturer {
  id: string;
  full_name: string;
  avatar_url?: string;
  academic_title?: string;
  bio?: string;
}

async function fetchLecturersFromDB(): Promise<Lecturer[]> {
  const { data: lecturersData, error: lecturersError } = await supabase
    .from('lecturers')
    .select('*');

  if (lecturersError) throw lecturersError;

  if (lecturersData && lecturersData.length > 0) {
    // Batch-fetch all profiles in one query instead of N sequential requests
    const profileIds = lecturersData.map((l: any) => l.user_id || l.id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', profileIds);

    const profilesMap = Object.fromEntries(
      (profilesData ?? []).map((p: any) => [p.id, p]),
    );

    return lecturersData.map((l: any) => {
      const profile = profilesMap[l.user_id || l.id];
      return {
        id: l.id,
        full_name: profile?.full_name ?? l.name ?? 'Без имени',
        avatar_url: l.avatar_url ?? profile?.avatar_url,
        academic_title: l.academic_title,
        bio: l.bio,
      };
    });
  }

  // Fallback: query profiles with lecturer role
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'lecturer');

  if (profilesError) throw profilesError;

  return (profilesData ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    academic_title: undefined,
    bio: undefined,
  }));
}

export function useLecturersList() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false): Promise<void> => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchLecturersFromDB();
      setLecturers(data);
    } catch (err) {
      console.error('useLecturersList fetch error:', err);
      setLecturers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { lecturers, loading, refreshing, refresh };
}