import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { supabase } from '../../src/supabase/supabaseClient';

export default function CoursesScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const currentUserIdRef = useRef<string | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [enrollingIds, setEnrollingIds] = useState<Set<string>>(new Set());
  const [slotModalCourse, setSlotModalCourse] = useState<any | null>(null);

  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLecturer, setIsLecturer] = useState(false);

  const [lecturersMap, setLecturersMap] = useState<Record<string, any>>({});

  const [proposeModalCourse, setProposeModalCourse] = useState<any | null>(null);
  const [newSlotText, setNewSlotText] = useState<string>('');
  const [proposingIds, setProposingIds] = useState<Set<string>>(new Set());

  const [proposals, setProposals] = useState<any[]>([]);
  const [proposalsModalVisible, setProposalsModalVisible] = useState(false);
  const [processingProposalIds, setProcessingProposalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    initializeScreen();
  }, []);

  async function initializeScreen() {
    try {
      setLoading(true);
      setError(null);

      await fetchCurrentUser();
      
      if (!currentUserIdRef.current) {
        setError('Пользователь не авторизован');
        setLoading(false);
        return;
      }

      const role = await getUserRole();
      console.log('User role:', role);
      
      setIsAdmin(role === 'admin');
      setIsLecturer(role === 'lecturer');

      await loadAllData(role);

    } catch (err: any) {
      console.error('Initialization error:', err);
      setError(err.message || 'Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  }

  async function loadAllData(role?: string | null) {
    try {
      await Promise.all([
        fetchCourses(role),
        fetchMyEnrollments(),
        fetchLecturers()
      ]);

      if (role === 'admin') {
        await fetchProposals();
      }
    } catch (err) {
      console.error('Error loading data:', err);
      throw err;
    }
  }

  async function getUserRole() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        return null;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Role fetch error:', error);
        return null;
      }

      return profileData?.role || 'student';
    } catch (err) {
      console.error('getUserRole error:', err);
      return null;
    }
  }

  async function fetchCurrentUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        currentUserIdRef.current = session.user.id;
        console.log('Current user ID:', currentUserIdRef.current);
      }
    } catch (err) {
      console.error('fetchCurrentUser error:', err);
    }
  }

async function fetchCourses(role?: string | null) {
  try {
    const lecturerMode = role === 'lecturer';
    console.log('Fetching courses, mode:', lecturerMode ? 'lecturer' : 'student/admin');

    // 1. Делаем ОДИН запрос со вложенными данными
    let query = supabase
      .from('courses')
      .select(`
        id, 
        title, 
        description, 
        lecturer_id, 
        created_at,
        course_slots (
          id,
          course_id,
          lecturer_id,
          slot
        )
      `) // Supabase сам создаст массив course_slots внутри каждого курса
      .order('created_at', { ascending: false });

    // 2. Фильтр для лектора
    if (lecturerMode && currentUserIdRef.current) {
      query = query.eq('lecturer_id', currentUserIdRef.current);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Courses fetch error:', error);
      throw error;
    }

    console.log(`Courses loaded: ${data?.length || 0}`);
    
    // В консоли можно проверить, приходят ли слоты:
    if (data && data.length > 0) {
      console.log('Sample course slots:', data[0].course_slots);
    }

    setCourses(data || []);

  } catch (e) {
    console.error('fetchCourses error:', e);
    throw e;
  }
}
  async function fetchMyEnrollments() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const userId = session.user.id;
      
      const { data, error } = await supabase
        .from('enrollments')
        .select('course_id, selected_slot')
        .eq('student_id', userId);

      if (error) {
        console.error('Enrollments fetch error:', error);
        return;
      }

      const rows = data || [];
      setEnrolledCourseIds(new Set(rows.map((e: any) => e.course_id)));

      const slots: Record<string, string> = {};
      rows.forEach((e: any) => {
        if (e.selected_slot) slots[e.course_id] = e.selected_slot;
      });
      setSelectedSlots(slots);
      
      console.log(`Loaded ${rows.length} enrollments`);
      
    } catch (err) {
      console.error('fetchMyEnrollments error:', err);
    }
  }

  async function fetchLecturers() {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'lecturer');

      if (profilesError) {
        console.error('fetchLecturers profiles error:', profilesError);
        return;
      }

      const { data: lecturersData, error: lecturersError } = await supabase
        .from('lecturers')
        .select('id, academic_title, bio, avatar_url');

      if (lecturersError) {
        console.error('fetchLecturers lecturers error:', lecturersError);
      }

      const map: Record<string, any> = {};
      profilesData?.forEach((profile: any) => {
        const lecturerInfo = lecturersData?.find((l: any) => l.id === profile.id);
        map[profile.id] = {
          full_name: profile.full_name || 'Преподаватель',
          email: profile.email,
          academic_title: lecturerInfo?.academic_title || '',
          bio: lecturerInfo?.bio || '',
          avatar_url: lecturerInfo?.avatar_url || null
        };
      });

      setLecturersMap(map);
      console.log(`Loaded ${Object.keys(map).length} lecturers`);
      
    } catch (err) {
      console.error('fetchLecturers error:', err);
    }
  }

  async function fetchProposals() {
    try {
      const { data, error } = await supabase
        .from('slot_proposals')
        .select('id, course_id, proposer_id, slot, status, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('fetchProposals error:', error);
        return;
      }
      
      setProposals(data || []);
      console.log(`Loaded ${data?.length || 0} proposals`);
      
    } catch (err) {
      console.error('fetchProposals error:', err);
    }
  }

  async function handleAdminAccess() {
    const role = await getUserRole();
    if (role === 'admin') {
      router.push('/admin');
    } else {
      Alert.alert("Отказано", "Ты не админ, дружок ;) ");
    }
  }

  function handleEnrollPress(course: any) {
    const slots = course.course_slots || [];
    
    if (slots.length === 0) {
      if (course.lecturer_id) {
        doEnroll(course.id, null, course.lecturer_id);
      } else {
        Alert.alert("Ошибка", "Нет доступных слотов для записи");
      }
      return;
    }

    if (slots.length === 1) {
      const slot = slots[0];
      doEnroll(course.id, slot.slot, slot.lecturer_id);
      return;
    }

    setSlotModalCourse(course);
  }

  function handleSlotConfirm(slot: string, lecturerId?: string) {
    if (!slotModalCourse) return;
    const courseId = slotModalCourse.id;

    setSlotModalCourse(null);
    doEnroll(courseId, slot, lecturerId);
  }

  async function doEnroll(courseId: string, slot: string | null, lecturerId?: string) {
    const userId = currentUserIdRef.current;
    if (!userId) {
      Alert.alert("Ошибка", "Пользователь не найден");
      return;
    }

    setEnrollingIds(prev => new Set(prev).add(courseId));

    const enrollmentData: any = {
      student_id: userId,
      course_id: courseId,
    };

    if (slot) enrollmentData.selected_slot = slot;
    if (lecturerId) enrollmentData.lecturer_id = lecturerId;

    const { error } = await supabase
      .from('enrollments')
      .insert(enrollmentData);

    setEnrollingIds(prev => {
      const n = new Set(prev);
      n.delete(courseId);
      return n;
    });

    if (error) {
      console.error('Enrollment error:', error);
      Alert.alert("Ошибка", error.message);
    } else {
      // Обновляем список записанных курсов
      setEnrolledCourseIds(prev => new Set(prev).add(courseId));
      if (slot) {
        setSelectedSlots(prev => ({ ...prev, [courseId]: slot }));
      }
      
      // Обновляем список курсов, чтобы обновить отображение слотов
      const role = await getUserRole();
      await fetchCourses(role);
      
      Alert.alert("Успешно", "Вы записаны на курс!");
    }
  }

  async function doUnenroll(courseId: string) {
    swipeableRefs.current[courseId]?.close();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      Alert.alert("Ошибка", "Пользователь не найден");
      return;
    }

    const userId = session.user.id;
    const { error, data: delData } = await supabase
      .from('enrollments')
      .delete()
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .select();

    if (error) {
      console.error('Unenroll error:', error);
      Alert.alert("Ошибка", error.message);
    } else if (!delData || delData.length === 0) {
      Alert.alert("Не удалилось", "Запись не найдена");
    } else {
      setEnrolledCourseIds(prev => {
        const n = new Set(prev);
        n.delete(courseId);
        return n;
      });
      setSelectedSlots(prev => {
        const n = { ...prev };
        delete n[courseId];
        return n;
      });
      
      // Обновляем список курсов
      const role = await getUserRole();
      await fetchCourses(role);
      
      Alert.alert("Готово", "Вы отписались от курса 🎉");
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  function openProposeModal(course: any) {
    setNewSlotText('');
    setProposeModalCourse(course);
  }

  async function handleProposeConfirm() {
    if (!proposeModalCourse) return;
    const courseId = proposeModalCourse.id;
    const slot = newSlotText.trim();
    if (!slot) {
      Alert.alert("Ошибка", "Введите время");
      return;
    }

    setProposeModalCourse(null);
    await createSlotProposal(courseId, slot);
  }

  async function createSlotProposal(courseId: string, slot: string) {
    const proposerId = currentUserIdRef.current;
    if (!proposerId) {
      Alert.alert("Ошибка", "Пользователь не найден");
      return;
    }

    setProposingIds(prev => new Set(prev).add(courseId));

    const { error } = await supabase
      .from('slot_proposals')
      .insert({
        course_id: courseId,
        proposer_id: proposerId,
        slot,
        status: 'pending'
      });

    setProposingIds(prev => {
      const n = new Set(prev);
      n.delete(courseId);
      return n;
    });

    if (error) {
      console.error('createSlotProposal error:', error);
      Alert.alert("Ошибка", "Не удалось отправить предложение: " + error.message);
      return;
    }

    Alert.alert("Готово", "Предложение отправлено на модерацию администратору");
    if (isAdmin) await fetchProposals();
  }

  async function approveProposal(proposal: any) {
    const proposalId = proposal.id;
    const courseId = proposal.course_id;
    const slot = proposal.slot;

    setProcessingProposalIds(prev => new Set(prev).add(proposalId));

    try {
      const { error: slotError } = await supabase
        .from('course_slots')
        .insert({
          course_id: courseId,
          lecturer_id: proposal.proposer_id,
          slot: slot
        });

      if (slotError) {
        console.error('Error adding slot:', slotError);
        Alert.alert("Ошибка", "Не удалось добавить слот в курс");
        return;
      }

      const { error: propError } = await supabase
        .from('slot_proposals')
        .update({ status: 'approved' })
        .eq('id', proposalId);

      if (propError) {
        console.error('Error updating proposal:', propError);
        Alert.alert("Ошибка", "Не удалось обновить статус предложения");
        return;
      }

      setProposals(prev => prev.map((p: any) => p.id === proposalId ? { ...p, status: 'approved' } : p));
      
      // Обновляем курсы
      const role = await getUserRole();
      await fetchCourses(role);
      
      Alert.alert("Готово", "Предложение утверждено и опубликовано");
    } finally {
      setProcessingProposalIds(prev => {
        const n = new Set(prev);
        n.delete(proposalId);
        return n;
      });
    }
  }

  async function rejectProposal(proposal: any) {
    const proposalId = proposal.id;
    setProcessingProposalIds(prev => new Set(prev).add(proposalId));

    try {
      const { error } = await supabase
        .from('slot_proposals')
        .update({ status: 'rejected' })
        .eq('id', proposalId);

      if (error) {
        console.error('rejectProposal error:', error);
        Alert.alert("Ошибка", "Не удалось отклонить предложение");
        return;
      }

      setProposals(prev => prev.map((p: any) => p.id === proposalId ? { ...p, status: 'rejected' } : p));
      Alert.alert("Готово", "Предложение отклонено");
    } finally {
      setProcessingProposalIds(prev => {
        const n = new Set(prev);
        n.delete(proposalId);
        return n;
      });
    }
  }

  async function openProposalsModal() {
    setProposalsModalVisible(true);
    await fetchProposals();
  }

  function renderRightActions(courseId: string, progress: Animated.AnimatedInterpolation<number>) {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    return (
      <Animated.View style={[styles.swipeAction, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity
          style={styles.swipeDeleteBtn}
          onPress={() => doUnenroll(courseId)}
        >
          <Text style={styles.swipeDeleteIcon}>🗑</Text>
          <Text style={styles.swipeDeleteText}>Отменить</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const renderCourseItem = ({ item }: { item: any }) => {
    const isEnrolled = enrolledCourseIds.has(item.id);
    const isEnrolling = enrollingIds.has(item.id);
    const hasLecturer = !!item.lecturer_id;
    const slots = item.course_slots || [];
    const chosenSlot = selectedSlots[item.id];

    const lecturerInfo = item.lecturer_id ? lecturersMap[item.lecturer_id] : null;
    const lecturerName = lecturerInfo?.full_name || null;
    const isCourseOwnedByCurrentLecturer = isLecturer && currentUserIdRef.current === item.lecturer_id;

    const cardContent = (
      <View style={[styles.courseCard, isEnrolled && styles.courseCardEnrolled]}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseTitle}>{item.title}</Text>
          {!!item.description && (
            <Text style={styles.courseDescription}>{item.description}</Text>
          )}

          {hasLecturer ? (
            <View style={styles.lecturerBadge}>
              <Text style={styles.lecturerText}>
                👤 {lecturerName || 'Преподаватель'}
              </Text>
              {/* Исправлено: добавлено !! */}
              {!!lecturerInfo?.academic_title && (
                <Text style={styles.academicTitle}>{lecturerInfo.academic_title}</Text>
              )}
            </View>
          ) : (
            <View style={[styles.lecturerBadge, styles.noLecturerBadge]}>
              <Text style={styles.noLecturerText}>⚠ Преподаватель не назначен</Text>
            </View>
          )}

          {!isEnrolled && hasLecturer && slots.length > 0 && (
            <View style={styles.slotsPreview}>
              <Text style={styles.slotsLabel}>Доступное время:</Text>
              <View style={styles.slotsList}>
                {slots.map((slotObj: any, i: number) => (
                  <View key={i} style={styles.slotChip}>
                    <Text style={styles.slotChipText}>{slotObj.slot}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Исправлено: добавлено !! */}
          {!!(isEnrolled && chosenSlot) && (
            <View style={styles.enrolledSlot}>
              <Text style={styles.enrolledSlotText}>🕐 Ваше время: {chosenSlot}</Text>
            </View>
          )}

          {isEnrolled && (
            <Text style={styles.swipeHint}>← свайп влево для отмены</Text>
          )}
        </View>

        <View style={{ minWidth: 120, justifyContent: 'center' }}>
          {isCourseOwnedByCurrentLecturer ? (
            <>
              <TouchableOpacity
                style={[styles.enrollBtn, { backgroundColor: '#5856D6', marginBottom: 8 }]}
                onPress={() => openProposeModal(item)}
                disabled={proposingIds.has(item.id)}
              >
                {proposingIds.has(item.id) ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.enrollBtnText}>Предложить время</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.enrollBtn, styles.enrollBtnEnrolled]}
                onPress={() => {
                  Alert.alert("Инфо", "Здесь можно открыть список студентов курса");
                }}
              >
                <Text style={styles.enrollBtnText}>Управлять</Text>
              </TouchableOpacity>
            </>
          ) : isEnrolled ? (
            <View style={styles.enrolledActions}>
              <View style={[styles.enrollBtn, styles.enrollBtnEnrolled, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.enrollBtnText}>✓ Записан</Text>
              </View>
              <TouchableOpacity
                style={styles.unenrollBtn}
                onPress={() => doUnenroll(item.id)}
                disabled={isEnrolling}
              >
                {isEnrolling ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <Text style={styles.unenrollBtnText}>Отменить</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.enrollBtn, isEnrolling && styles.enrollBtnLoading, !hasLecturer && styles.enrollBtnDisabled]}
              onPress={() => handleEnrollPress(item)}
              disabled={isEnrolling || !hasLecturer}
              activeOpacity={0.8}
            >
              {isEnrolling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : !hasLecturer ? (
                <Text style={styles.enrollBtnText}>Недоступно</Text>
              ) : slots.length > 0 ? (
                <Text style={styles.enrollBtnText}>Выбрать время →</Text>
              ) : (
                <Text style={styles.enrollBtnText}>Записаться</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );

    if (isEnrolled) {
      return (
        <Swipeable
          ref={ref => {
            swipeableRefs.current[item.id] = ref;
          }}
          renderRightActions={(progress) => renderRightActions(item.id, progress)}
          overshootRight={false}
        >
          {cardContent}
        </Swipeable>
      );
    }

    return cardContent;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const role = await getUserRole();
      await loadAllData(role);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Курсы</Text>
          <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Выйти</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={initializeScreen}>
            <Text style={styles.retryBtnText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Курсы</Text>
        <View style={styles.headerButtons}>
          {isAdmin && (
            <>
              <TouchableOpacity onPress={openProposalsModal} style={[styles.adminBtn, { marginRight: 10 }]}>
                <Text style={styles.adminBtnText}>Предложения</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdminAccess} style={styles.adminBtn}>
                <Text style={styles.adminBtnText}>Admin</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Выйти</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={renderCourseItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Курсы не найдены.</Text>
              <Text style={styles.emptySubtext}>
                {isLecturer 
                  ? 'Создайте свой первый курс в панели преподавателя' 
                  : 'Скоро здесь появятся новые курсы'}
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={!!slotModalCourse} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.slotModalContent}>
            <Text style={styles.modalTitle}>Записаться</Text>
            <Text style={styles.modalSubtitle}>{slotModalCourse?.title}</Text>

            <Text style={{ marginTop: 16, fontWeight: 'bold', marginBottom: 8 }}>
              Доступные слоты:
            </Text>

            {(slotModalCourse?.course_slots || []).map((slotObj: any) => (
              <TouchableOpacity
                key={slotObj.id}
                style={styles.slotOption}
                onPress={() => handleSlotConfirm(slotObj.slot, slotObj.lecturer_id)}
              >
                <View>
                  <Text style={styles.slotOptionText}>{slotObj.slot}</Text>
                </View>
                <Text style={styles.slotOptionArrow}>→</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSlotModalCourse(null)}>
              <Text style={styles.cancelBtnText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!proposeModalCourse}
        animationType="slide"
        transparent
        onRequestClose={() => setProposeModalCourse(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.slotModalContent}>
            <Text style={styles.modalTitle}>Предложить время</Text>
            {proposeModalCourse && (
              <Text style={styles.modalSubtitle}>{proposeModalCourse.title}</Text>
            )}
            <TextInput
              value={newSlotText}
              onChangeText={setNewSlotText}
              placeholder="Например: Пн 18:00"
              style={styles.input}
            />
            <TouchableOpacity style={[styles.enrollBtn, { marginBottom: 8 }]} onPress={handleProposeConfirm}>
              <Text style={styles.enrollBtnText}>Отправить предложение</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setProposeModalCourse(null)}>
              <Text style={styles.cancelBtnText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={proposalsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setProposalsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.slotModalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Предложения времени</Text>
            <Text style={styles.modalSubtitle}>
              Здесь админ может утвердить или отклонить предложения преподавателей
            </Text>

            <FlatList
              data={proposals}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <View style={styles.proposalItem}>
                  <Text style={styles.proposalSlot}>{item.slot}</Text>

                  <View style={styles.proposalDetails}>
                    <Text style={styles.proposalText}>
                      Курс ID: {item.course_id.slice(0, 8)}...
                    </Text>
                    <Text style={styles.proposalText}>
                      Преподаватель: {lecturersMap[item.proposer_id]?.full_name || item.proposer_id.slice(0, 8)}
                    </Text>
                  </View>

                  <View style={styles.proposalStatus}>
                    <Text>Статус: </Text>
                    <Text
                      style={[
                        styles.statusText,
                        item.status === 'pending' && styles.statusPending,
                        item.status === 'approved' && styles.statusApproved,
                        item.status === 'rejected' && styles.statusRejected,
                      ]}
                    >
                      {item.status === 'pending' ? 'На рассмотрении' :
                       item.status === 'approved' ? 'Утверждено' : 'Отклонено'}
                    </Text>
                  </View>

                  {item.status === 'pending' && (
                    <View style={styles.proposalActions}>
                      <TouchableOpacity
                        style={[styles.approveBtn, processingProposalIds.has(item.id) && styles.disabledBtn]}
                        onPress={() => approveProposal(item)}
                        disabled={processingProposalIds.has(item.id)}
                      >
                        {processingProposalIds.has(item.id) ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.approveBtnText}>✓ Утвердить</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.rejectBtn, processingProposalIds.has(item.id) && styles.disabledBtn]}
                        onPress={() => rejectProposal(item)}
                        disabled={processingProposalIds.has(item.id)}
                      >
                        {processingProposalIds.has(item.id) ? (
                          <ActivityIndicator color="#000" size="small" />
                        ) : (
                          <Text style={styles.rejectBtnText}>✗ Отклонить</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyProposalsText}>Нет предложений</Text>
              }
            />

            <TouchableOpacity 
              style={[styles.cancelBtn, { marginTop: 12 }]} 
              onPress={() => setProposalsModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBtn: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  adminBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logoutBtn: {
    padding: 5,
  },
  logoutBtnText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  listContent: {
    padding: 20,
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  courseCardEnrolled: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  courseInfo: {
    marginBottom: 16,
    flex: 1,
    paddingRight: 12,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  courseDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
  lecturerBadge: {
    backgroundColor: '#F0EEFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  lecturerText: {
    color: '#5856D6',
    fontWeight: '600',
    fontSize: 13,
  },
  academicTitle: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 2,
  },
  noLecturerBadge: {
    backgroundColor: '#FFF3E0',
  },
  noLecturerText: {
    color: '#E65100',
    fontWeight: '600',
    fontSize: 13,
  },
  slotsPreview: {
    marginTop: 4,
  },
  slotsLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  slotsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slotChip: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  slotChipText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '500',
  },
  enrolledSlot: {
    marginTop: 8,
    backgroundColor: '#E8F9EE',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  enrolledSlotText: {
    color: '#1B8A3E',
    fontSize: 13,
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 11,
    color: '#C7C7CC',
    marginTop: 6,
  },
  enrollBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  enrollBtnEnrolled: {
    backgroundColor: '#34C759',
  },
  enrollBtnLoading: {
    opacity: 0.7,
  },
  enrollBtnDisabled: {
    backgroundColor: '#C7C7CC',
  },
  enrollBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  enrolledActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unenrollBtn: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  unenrollBtnText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 14,
  },
  swipeAction: {
    justifyContent: 'center',
    marginBottom: 20,
  },
  swipeDeleteBtn: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 10,
    flex: 1,
  },
  swipeDeleteIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#C7C7CC',
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotModalContent: {
    width: '88%',
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  slotOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  slotOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  slotOptionArrow: {
    fontSize: 18,
    color: '#007AFF',
  },
  cancelBtn: {
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    marginTop: 8,
  },
  cancelBtnText: {
    fontWeight: '600',
    color: '#3C3C43',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  proposalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  proposalSlot: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  proposalDetails: {
    marginTop: 4,
    marginBottom: 4,
  },
  proposalText: {
    color: '#666',
    fontSize: 13,
    marginBottom: 2,
  },
  proposalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  statusText: {
    fontWeight: '600',
  },
  statusPending: {
    color: '#FF3B30',
  },
  statusApproved: {
    color: '#34C759',
  },
  statusRejected: {
    color: '#8E8E93',
  },
  proposalActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  approveBtn: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  rejectBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  emptyProposalsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
});