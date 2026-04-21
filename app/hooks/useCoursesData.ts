import { useCallback, useRef, useState } from 'react';
import { supabase } from '../../src/supabase/supabaseClient';

export type UserRole = 'admin' | 'lecturer' | 'student' | null;

export interface CourseSlot {
  id: string;
  course_id: string;
  lecturer_id: string;
  slot: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  lecturer_id: string | null;
  created_at: string;
  course_slots: CourseSlot[];
}

export interface LecturerInfo {
  full_name: string;
  email: string;
  academic_title: string;
  bio: string;
  avatar_url: string | null;
}

export interface Proposal {
  id: string;
  course_id: string;
  proposer_id: string;
  slot: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function useCoursesData() {
  const currentUserIdRef = useRef<string | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturersMap, setLecturersMap] = useState<Record<string, LecturerInfo>>({});
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCurrentUser = useCallback(async (): Promise<string | null> => {
    const session = await getSession();
    if (session?.user?.id) {
      currentUserIdRef.current = session.user.id;
      return session.user.id;
    }
    return null;
  }, []);

  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Role fetch error:', error);
      return 'student';
    }
    return (data?.role as UserRole) ?? 'student';
  }, []);

  const fetchCourses = useCallback(async (userRole: UserRole, userId: string | null): Promise<void> => {
    let query = supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        lecturer_id,
        created_at,
        course_slots (id, course_id, lecturer_id, slot)
      `)
      .order('created_at', { ascending: false });

    if (userRole === 'lecturer' && userId) {
      query = query.eq('lecturer_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    setCourses((data as Course[]) ?? []);
  }, []);

  const fetchEnrollments = useCallback(async (userId: string): Promise<void> => {
    const { data, error } = await supabase
      .from('enrollments')
      .select('course_id, selected_slot')
      .eq('student_id', userId);

    if (error) {
      console.error('Enrollments fetch error:', error);
      return;
    }

    const rows = data ?? [];
    setEnrolledCourseIds(new Set(rows.map((e: any) => e.course_id)));
    const slots: Record<string, string> = {};
    rows.forEach((e: any) => {
      if (e.selected_slot) slots[e.course_id] = e.selected_slot;
    });
    setSelectedSlots(slots);
  }, []);

  const fetchLecturers = useCallback(async (): Promise<void> => {
    const [{ data: profiles, error: profilesErr }, { data: lecturers, error: lecturersErr }] =
      await Promise.all([
        supabase.from('profiles').select('id, full_name, email').eq('role', 'lecturer'),
        supabase.from('lecturers').select('id, academic_title, bio, avatar_url'),
      ]);

    if (profilesErr) { console.error('fetchLecturers profiles error:', profilesErr); return; }
    if (lecturersErr) console.error('fetchLecturers lecturers error:', lecturersErr);

    const map: Record<string, LecturerInfo> = {};
    profiles?.forEach((profile: any) => {
      const extra = lecturers?.find((l: any) => l.id === profile.id);
      map[profile.id] = {
        full_name: profile.full_name ?? 'Преподаватель',
        email: profile.email,
        academic_title: extra?.academic_title ?? '',
        bio: extra?.bio ?? '',
        avatar_url: extra?.avatar_url ?? null,
      };
    });
    setLecturersMap(map);
  }, []);

  const fetchProposals = useCallback(async (): Promise<void> => {
    const { data, error } = await supabase
      .from('slot_proposals')
      .select('id, course_id, proposer_id, slot, status, created_at')
      .order('created_at', { ascending: false });

    if (error) { console.error('fetchProposals error:', error); return; }
    setProposals((data as Proposal[]) ?? []);
  }, []);

  const initialize = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const userId = await fetchCurrentUser();
      if (!userId) {
        setError('Пользователь не авторизован');
        return;
      }

      const userRole = await fetchUserRole(userId);
      setRole(userRole);

      const tasks: Promise<void>[] = [
        fetchCourses(userRole, userId),
        fetchEnrollments(userId),
        fetchLecturers(),
      ];
      if (userRole === 'admin') tasks.push(fetchProposals());

      await Promise.all(tasks);
    } catch (err: any) {
      console.error('Initialization error:', err);
      setError(err.message ?? 'Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentUser, fetchUserRole, fetchCourses, fetchEnrollments, fetchLecturers, fetchProposals]);

  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      const userId = currentUserIdRef.current;
      if (!userId) return;
      const userRole = await fetchUserRole(userId);
      const tasks: Promise<void>[] = [fetchCourses(userRole, userId), fetchEnrollments(userId)];
      if (userRole === 'admin') tasks.push(fetchProposals());
      await Promise.all(tasks);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUserRole, fetchCourses, fetchEnrollments, fetchProposals]);

  const enroll = useCallback(async (
    courseId: string,
    slot: string | null,
    lecturerId?: string,
  ): Promise<void> => {
    const userId = currentUserIdRef.current;
    if (!userId) throw new Error('Пользователь не найден');

    const payload: Record<string, string> = { student_id: userId, course_id: courseId };
    if (slot) payload.selected_slot = slot;
    if (lecturerId) payload.lecturer_id = lecturerId;

    const { error } = await supabase.from('enrollments').insert(payload);
    if (error) throw error;

    setEnrolledCourseIds(prev => new Set(prev).add(courseId));
    if (slot) setSelectedSlots(prev => ({ ...prev, [courseId]: slot }));

    const userRole = await fetchUserRole(userId);
    await fetchCourses(userRole, userId);
  }, [fetchUserRole, fetchCourses]);

  const unenroll = useCallback(async (courseId: string): Promise<void> => {
    const session = await getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error('Пользователь не найден');

    const { data, error } = await supabase
      .from('enrollments')
      .delete()
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .select();

    if (error) throw error;
    if (!data?.length) throw new Error('Запись не найдена');

    setEnrolledCourseIds(prev => { const n = new Set(prev); n.delete(courseId); return n; });
    setSelectedSlots(prev => { const n = { ...prev }; delete n[courseId]; return n; });

    const userRole = await fetchUserRole(userId);
    await fetchCourses(userRole, userId);
  }, [fetchUserRole, fetchCourses]);

  const proposeSlot = useCallback(async (courseId: string, slot: string): Promise<void> => {
    const proposerId = currentUserIdRef.current;
    if (!proposerId) throw new Error('Пользователь не найден');

    const { error } = await supabase.from('slot_proposals').insert({
      course_id: courseId,
      proposer_id: proposerId,
      slot,
      status: 'pending',
    });
    if (error) throw error;
  }, []);

  const approveProposal = useCallback(async (proposal: Proposal): Promise<void> => {
    const { error: slotError } = await supabase.from('course_slots').insert({
      course_id: proposal.course_id,
      lecturer_id: proposal.proposer_id,
      slot: proposal.slot,
    });
    if (slotError) throw slotError;

    const { error: propError } = await supabase
      .from('slot_proposals')
      .update({ status: 'approved' })
      .eq('id', proposal.id);
    if (propError) throw propError;

    setProposals(prev => prev.map(p => p.id === proposal.id ? { ...p, status: 'approved' } : p));
    const userId = currentUserIdRef.current;
    if (userId) {
      const userRole = await fetchUserRole(userId);
      await fetchCourses(userRole, userId);
    }
  }, [fetchUserRole, fetchCourses]);

  const rejectProposal = useCallback(async (proposalId: string): Promise<void> => {
    const { error } = await supabase
      .from('slot_proposals')
      .update({ status: 'rejected' })
      .eq('id', proposalId);
    if (error) throw error;
    setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: 'rejected' } : p));
  }, []);

  return {
    // state
    currentUserIdRef,
    role,
    courses,
    lecturersMap,
    enrolledCourseIds,
    selectedSlots,
    proposals,
    loading,
    error,
    refreshing,
    // actions
    initialize,
    refresh,
    enroll,
    unenroll,
    proposeSlot,
    approveProposal,
    rejectProposal,
    fetchProposals,
  };
}