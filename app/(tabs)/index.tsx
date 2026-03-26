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

  // Используем ref чтобы значение всегда было актуальным внутри колбэков
  const currentUserIdRef = useRef<string | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [enrollingIds, setEnrollingIds] = useState<Set<string>>(new Set());
  const [slotModalCourse, setSlotModalCourse] = useState<any | null>(null);

  // Refs для закрытия свайпа после действия
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  // Роли
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLecturer, setIsLecturer] = useState(false);

  // Новое состояние: карта преподавателей id -> full_name
  const [lecturersMap, setLecturersMap] = useState<Record<string, string>>({});

  // Модалки и состояния для предложений
  const [proposeModalCourse, setProposeModalCourse] = useState<any | null>(null);
  const [newSlotText, setNewSlotText] = useState<string>('');
  const [proposingIds, setProposingIds] = useState<Set<string>>(new Set());

  // Админ: список предложений
  const [proposals, setProposals] = useState<any[]>([]);
  const [proposalsModalVisible, setProposalsModalVisible] = useState(false);
  const [processingProposalIds, setProcessingProposalIds] = useState<Set<string>>(new Set());

 useEffect(() => {
  (async () => {
    setLoading(true);
    
    // Сначала получаем ID пользователя — это MUST BE FIRST
    await fetchCurrentUser(); // ← здесь currentUserIdRef.current устанавливается
    
    // Затем проверяем роль
    await checkRole();
    
    // Только после этого загружаем курсы (с учётом роли)
    if (isLecturer && currentUserIdRef.current) {
      await fetchCourses(); // ← в этом блоке используется currentUserIdRef.current
    } else {
      await fetchCourses(); // и для других ролей тоже — но внутри fetchCourses уже есть фильтрация
    }

    // Остальные данные (записи, преподаватели и т.д.)
    await Promise.all([
      fetchMyEnrollments(),
      fetchLecturers()
    ]);

    if (isAdmin) {
      await fetchProposals();
    }

    setLoading(false);
  })();
}, []);


  async function getUserRole() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Role fetch error:', error);
      return null;
    }

    return data.role;
  }

  // Получаем auth.uid()
  async function fetchCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      currentUserIdRef.current = session.user.id;
    }
  }

  // Устанавливаем isAdmin и isLecturer
  async function checkRole() {
    const role = await getUserRole();
    setIsAdmin(role === 'admin');
    setIsLecturer(role === 'lecturer');
  }

  /**
   * Основное изменение: если пользователь — преподаватель,
   * делаем серверный запрос только по его lecturer_id.
   */
  async function fetchCourses() {
    try {
      // Если преподаватель — фильтруем на сервере
      if (isLecturer && currentUserIdRef.current) {
        const { data, error } = await supabase
          .from('courses')
          .select(`
            id,
            title,
            description,
            available_slots,
            lecturer_id
          `)
          .eq('lecturer_id', currentUserIdRef.current)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('fetchCourses (lecturer) error:', error);
          Alert.alert("Ошибка", "Не удалось загрузить ваши курсы");
        } else {
          setCourses(data || []);
        }
        return;
      }

      // Для остальных ролей (admin, student и т.д.) — обычный запрос
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          available_slots,
          lecturer_id
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('fetchCourses:', error);
        Alert.alert("Ошибка", "Не удалось загрузить курсы");
      } else {
        setCourses(data || []);
      }
    } catch (e) {
      console.error('fetchCourses unexpected error:', e);
      Alert.alert("Ошибка", "Не удалось загрузить курсы");
    }
  }

  async function fetchMyEnrollments() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await supabase
      .from('enrollments')
      .select('course_id, selected_slot')
      .eq('student_id', session.user.id);

    let rows: any[] = [];
    if (res.error?.message?.includes('selected_slot') || res.error?.code === '42703') {
      const fallback = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', session.user.id);
      if (fallback.error) {
        console.error('fetchMyEnrollments fallback error:', JSON.stringify(fallback.error));
        return;
      }
      rows = fallback.data || [];
    } else if (res.error) {
      console.error('fetchMyEnrollments error:', JSON.stringify(res.error));
      return;
    } else {
      rows = res.data || [];
    }

    setEnrolledCourseIds(new Set(rows.map((e: any) => e.course_id)));

    const slots: Record<string, string> = {};
    rows.forEach((e: any) => {
      if (e.selected_slot) slots[e.course_id] = e.selected_slot;
    });
    setSelectedSlots(slots);
  }

  // Загрузка преподавателей (id -> full_name)
  async function fetchLecturers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name');

    if (error) {
      console.error('fetchLecturers error:', error);
      return;
    }

    const map: Record<string, string> = {};
    data?.forEach((l: any) => {
      map[l.id] = l.full_name;
    });

    setLecturersMap(map);
  }

  // Админ: загрузка предложений
  async function fetchProposals() {
    const { data, error } = await supabase
      .from('slot_proposals')
      .select('id, course_id, proposer_id, slot, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchProposals error:', error);
      return;
    }
    setProposals(data || []);
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
    if (enrolledCourseIds.has(course.id)) return;

    if (!course.lecturer_id) {
      Alert.alert("Запись недоступна", "На этот курс пока не назначен преподаватель.");
      return;
    }

    const slots: string[] = course.available_slots || [];
    if (slots.length > 0) {
      setSlotModalCourse(course);
    } else {
      doEnroll(course.id, null);
    }
  }

  function handleSlotConfirm(slot: string) {
    if (!slotModalCourse) return;
    const courseId = slotModalCourse.id;
    setSlotModalCourse(null);
    doEnroll(courseId, slot);
  }

  async function doEnroll(courseId: string, slot: string | null) {
    const userId = currentUserIdRef.current;
    if (!userId) {
      Alert.alert("Ошибка", "Не удалось определить пользователя. Войдите снова.");
      router.replace('/(auth)/login');
      return;
    }

    setEnrollingIds(prev => new Set(prev).add(courseId));

    let err: any = null;
    const r1 = await supabase.from('enrollments').insert({
      student_id: userId,
      course_id: courseId,
      selected_slot: slot ?? null,
    });

    if (r1.error?.message?.includes('selected_slot') || r1.error?.code === '42703') {
      const r2 = await supabase.from('enrollments').insert({
        student_id: userId,
        course_id: courseId,
      });
      err = r2.error;
    } else {
      err = r1.error;
    }

    setEnrollingIds(prev => {
      const n = new Set(prev);
      n.delete(courseId);
      return n;
    });

    if (err) {
      console.error('doEnroll error:', JSON.stringify(err));
      if (err.code === '23505') {
        Alert.alert("Уже записаны", "Вы уже зарегистрированы на этот курс.");
        setEnrolledCourseIds(prev => new Set(prev).add(courseId));
      } else if (err.code === '42501' || err.message?.includes('policy')) {
        Alert.alert("Доступ запрещён", `RLS заблокировал.\n\nКод: ${err.code}\n${err.message}\n\nВыполните rls_policies.sql в Supabase.`);
      } else {
        Alert.alert("Ошибка записи", `${err.code}: ${err.message}`);
      }
    } else {
      setEnrolledCourseIds(prev => new Set(prev).add(courseId));
      if (slot) setSelectedSlots(prev => ({ ...prev, [courseId]: slot }));
      const course = courses.find(c => c.id === courseId);
      Alert.alert("Готово! ✓", `Вы записались на «${course?.title}».${slot ? `\nВремя: ${slot}` : ''}`);
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
    const { error, data } = await supabase
      .from('enrollments')
      .delete()
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .select();

    if (error) {
      Alert.alert("Ошибка", error.message);
    } else if (!data || data.length === 0) {
      Alert.alert("Не удалилось", "Запись не найдена (или ты опять где-то накосячил)");
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
      Alert.alert("Готово", "Удалено 🎉");
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  // Преподаватель открывает модалку предложения времени
  function openProposeModal(course: any) {
    setNewSlotText('');
    setProposeModalCourse(course);
  }

  // Подтверждение предложения времени — создаём запись в slot_proposals со статусом pending
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

    const { data, error } = await supabase
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
      if (error.code === '42501' || error.message?.includes('policy')) {
        Alert.alert("Доступ запрещён", `RLS заблокировал.\n\nКод: ${error.code}\n${error.message}`);
      } else {
        Alert.alert("Ошибка", "Не удалось отправить предложение");
      }
      return;
    }

    Alert.alert("Готово", "Предложение отправлено на модерацию администратору");
    if (isAdmin) await fetchProposals();
  }

  // Админ: утвердить предложение — добавляем слот в courses.available_slots и обновляем статус proposal -> approved
  async function approveProposal(proposal: any) {
    const proposalId = proposal.id;
    const courseId = proposal.course_id;
    const slot = proposal.slot;

    setProcessingProposalIds(prev => new Set(prev).add(proposalId));

    try {
      const { data: courseData, error: selErr } = await supabase
        .from('courses')
        .select('available_slots')
        .eq('id', courseId)
        .single();

      if (selErr) {
        console.error('approveProposal fetch course error:', selErr);
        Alert.alert("Ошибка", "Не удалось получить курс");
        return;
      }

      const currentSlots: string[] = courseData?.available_slots || [];
      if (!currentSlots.includes(slot)) {
        const newSlots = [...currentSlots, slot];

        const { error: updErr } = await supabase
          .from('courses')
          .update({ available_slots: newSlots })
          .eq('id', courseId);

        if (updErr) {
          console.error('approveProposal update course error:', updErr);
          Alert.alert("Ошибка", "Не удалось добавить слот в курс");
          return;
        }

        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, available_slots: newSlots } : c));
      }

      const { error: propErr } = await supabase
        .from('slot_proposals')
        .update({ status: 'approved' })
        .eq('id', proposalId);

      if (propErr) {
        console.error('approveProposal update proposal error:', propErr);
        Alert.alert("Ошибка", "Не удалось обновить статус предложения");
        return;
      }

      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: 'approved' } : p));
      Alert.alert("Готово", "Предложение утверждено и опубликовано");
    } finally {
      setProcessingProposalIds(prev => {
        const n = new Set(prev);
        n.delete(proposalId);
        return n;
      });
    }
  }

  // Админ: отклонить предложение — обновляем статус proposal -> rejected
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

      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: 'rejected' } : p));
      Alert.alert("Готово", "Предложение отклонено");
    } finally {
      setProcessingProposalIds(prev => {
        const n = new Set(prev);
        n.delete(proposalId);
        return n;
      });
    }
  }

  // Админ: открыть модалку предложений (и обновить список)
  async function openProposalsModal() {
    setProposalsModalVisible(true);
    await fetchProposals();
  }

  // Красная кнопка удаления — появляется при свайпе влево
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
    const slots: string[] = item.available_slots || [];
    const chosenSlot = selectedSlots[item.id];

    // Получаем имя преподавателя из карты
    const lecturerName = item.lecturer_id ? lecturersMap[item.lecturer_id] : null;

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
                👤 {lecturerName || 'Преподаватель назначен'}
              </Text>
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
                {slots.map((slot, i) => (
                  <View key={i} style={styles.slotChip}>
                    <Text style={styles.slotChipText}>{slot}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isEnrolled && chosenSlot && (
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
          ListEmptyComponent={<Text style={styles.emptyText}>Курсы не найдены.</Text>}
        />
      )}

      {/* МОДАЛКИ (slot selection, propose, proposals) — как в предыдущей версии */}
      <Modal
        visible={!!slotModalCourse}
        animationType="slide"
        transparent
        onRequestClose={() => setSlotModalCourse(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.slotModalContent}>
            <Text style={styles.modalTitle}>Выберите время</Text>
            {slotModalCourse && (
              <Text style={styles.slotModalSubtitle}>{slotModalCourse.title}</Text>
            )}
            {(slotModalCourse?.available_slots || []).map((slot: string, i: number) => (
              <TouchableOpacity
                key={i}
                style={styles.slotOption}
                onPress={() => handleSlotConfirm(slot)}
              >
                <Text style={styles.slotOptionText}>{slot}</Text>
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
              <Text style={styles.slotModalSubtitle}>{proposeModalCourse.title}</Text>
            )}
            <TextInput
              value={newSlotText}
              onChangeText={setNewSlotText}
              placeholder="Например: Пн 18:00"
              style={{
                borderWidth: 1,
                borderColor: '#E5E5EA',
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
                fontSize: 16,
              }}
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
            <Text style={{ textAlign: 'center', color: '#888', marginBottom: 12 }}>
              Здесь админ может утвердить или отклонить предложения преподавателей
            </Text>

            <FlatList
              data={proposals}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
  <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
    {/* Заголовок — слот */}
    <Text style={{ fontWeight: '700', fontSize: 16 }}>{item.slot}</Text>
    
    {/* Инфо о курсе и преподавателе */}
    {isLecturer && (
      <Text style={{ color: '#888', fontSize: 13 }}>
        От: {lecturersMap[item.proposer_id] || item.proposer_id}
      </Text>
    )}
    
    {!isLecturer && isAdmin && (
      <View>
        <Text style={{ color: '#666', fontSize: 14, marginTop: 2 }}>
          Курс ID: <Text style={{ fontWeight: '500' }}>{item.course_id}</Text>
        </Text>
        <Text style={{ color: '#666', fontSize: 14 }}>
          Преподаватель ID: <Text style={{ fontWeight: '500' }}>{item.proposer_id}</Text>
        </Text>
        
        {/* Если есть имя преподавателя, можно подтянуть его через lecturersMap */}
        {lecturersMap[item.proposer_id] && (
          <Text style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
            👤 {lecturersMap[item.proposer_id]}
          </Text>
        )}
      </View>
    )}

    {/* Статус */}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <Text>Статус:</Text>
      <Text
        style={{
          fontWeight: '600',
          color: item.status === 'pending' ? '#FF3B30'
            : item.status === 'approved' ? '#34C759'
            : '#8E8E93'
        }}
      >
        {item.status}
      </Text>
    </View>

    {/* Кнопки управления */}
    <View style={{ flexDirection: 'row', marginTop: 10 }}>
      {item.status === 'pending' && (
        <>
          <TouchableOpacity
            style={[styles.enrollBtn, { marginRight: 8 }]}
            onPress={() => approveProposal(item)}
            disabled={processingProposalIds.has(item.id)}
          >
            {processingProposalIds.has(item.id) ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.enrollBtnText}>Утвердить</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { justifyContent: 'center' }]}
            onPress={() => rejectProposal(item)}
            disabled={processingProposalIds.has(item.id)}
          >
            {processingProposalIds.has(item.id) ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.cancelBtnText}>Отклонить</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Для approved/rejected — просто кнопка закрытия или nothing */}
      {item.status !== 'pending' && (
        <View style={{ paddingVertical: 4, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>
            {item.status === 'approved' ? '✅ Утверждено' : '❌ Отклонено'}
          </Text>
        </View>
      )}
    </View>
  </View>
)}

              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Нет предложений</Text>}
            />

            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={() => setProposalsModalVisible(false)}>
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
    gap: 6,
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
  // Свайп
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
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
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
  slotModalSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
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
});
