import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { supabase } from '../../src/supabase/supabaseClient';
import { Course, CourseSlot, Proposal, useCoursesData } from '../hooks/useCoursesData';

// ─── Reusable components ────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: Proposal['status'] }) => {
  const config: Record<Proposal['status'], { label: string; style: object }> = {
    pending:  { label: 'На рассмотрении', style: styles.statusPending },
    approved: { label: 'Утверждено',       style: styles.statusApproved },
    rejected: { label: 'Отклонено',        style: styles.statusRejected },
  };
  const { label, style } = config[status];
  return <Text style={[styles.statusText, style]}>{label}</Text>;
};

const LecturerBadge = ({
  name,
  academicTitle,
}: {
  name: string | null;
  academicTitle?: string;
}) => {
  if (!name) {
    return (
      <View style={[styles.lecturerBadge, styles.noLecturerBadge]}>
        <Text style={styles.noLecturerText}>⚠ Преподаватель не назначен</Text>
      </View>
    );
  }
  return (
    <View style={styles.lecturerBadge}>
      <Text style={styles.lecturerText}>👤 {name}</Text>
      {!!academicTitle && <Text style={styles.academicTitle}>{academicTitle}</Text>}
    </View>
  );
};

const SlotChips = ({ slots }: { slots: CourseSlot[] }) => (
  <View style={styles.slotsPreview}>
    <Text style={styles.slotsLabel}>Доступное время:</Text>
    <View style={styles.slotsList}>
      {slots.map((s, i) => (
        <View key={i} style={styles.slotChip}>
          <Text style={styles.slotChipText}>{s.slot}</Text>
        </View>
      ))}
    </View>
  </View>
);

// ─── Slot modal ─────────────────────────────────────────────────────────────

interface SlotModalProps {
  course: Course | null;
  onConfirm: (slot: string, lecturerId?: string) => void;
  onClose: () => void;
}
const SlotModal = ({ course, onConfirm, onClose }: SlotModalProps) => (
  <Modal visible={!!course} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Записаться</Text>
        <Text style={styles.modalSubtitle}>{course?.title}</Text>
        <Text style={styles.modalSectionLabel}>Доступные слоты:</Text>
        {(course?.course_slots ?? []).map(slotObj => (
          <TouchableOpacity
            key={slotObj.id}
            style={styles.slotOption}
            onPress={() => onConfirm(slotObj.slot, slotObj.lecturer_id)}
          >
            <Text style={styles.slotOptionText}>{slotObj.slot}</Text>
            <Text style={styles.slotOptionArrow}>→</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Отмена</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Propose slot modal ──────────────────────────────────────────────────────

interface ProposeModalProps {
  course: Course | null;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}
const ProposeModal = ({ course, value, onChange, onConfirm, onClose }: ProposeModalProps) => (
  <Modal visible={!!course} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Предложить время</Text>
        {course && <Text style={styles.modalSubtitle}>{course.title}</Text>}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Например: Пн 18:00"
          style={styles.input}
        />
        <TouchableOpacity style={[styles.primaryBtn, { marginBottom: 8 }]} onPress={onConfirm}>
          <Text style={styles.primaryBtnText}>Отправить предложение</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Отмена</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Proposals modal ─────────────────────────────────────────────────────────

interface ProposalsModalProps {
  visible: boolean;
  proposals: Proposal[];
  lecturersMap: Record<string, any>;
  processingIds: Set<string>;
  onApprove: (p: Proposal) => void;
  onReject: (p: Proposal) => void;
  onClose: () => void;
}
const ProposalsModal = ({
  visible, proposals, lecturersMap, processingIds, onApprove, onReject, onClose,
}: ProposalsModalProps) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { maxHeight: '80%' }]}>
        <Text style={styles.modalTitle}>Предложения времени</Text>
        <Text style={styles.modalSubtitle}>
          Утвердите или отклоните предложения преподавателей
        </Text>
        <FlatList
          data={proposals}
          keyExtractor={p => p.id}
          ListEmptyComponent={<Text style={styles.emptyProposalsText}>Нет предложений</Text>}
          renderItem={({ item }) => {
            const isProcessing = processingIds.has(item.id);
            const lecturerName = lecturersMap[item.proposer_id]?.full_name ?? item.proposer_id.slice(0, 8);
            return (
              <View style={styles.proposalItem}>
                <Text style={styles.proposalSlot}>{item.slot}</Text>
                <View style={styles.proposalDetails}>
                  <Text style={styles.proposalText}>Курс: {item.course_id.slice(0, 8)}…</Text>
                  <Text style={styles.proposalText}>Преподаватель: {lecturerName}</Text>
                </View>
                <View style={styles.proposalStatus}>
                  <Text>Статус: </Text>
                  <StatusBadge status={item.status} />
                </View>
                {item.status === 'pending' && (
                  <View style={styles.proposalActions}>
                    <TouchableOpacity
                      style={[styles.approveBtn, isProcessing && styles.disabledBtn]}
                      onPress={() => onApprove(item)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.approveBtnText}>✓ Утвердить</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rejectBtn, isProcessing && styles.disabledBtn]}
                      onPress={() => onReject(item)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.rejectBtnText}>✗ Отклонить</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
        <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Закрыть</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// ─── Course card ─────────────────────────────────────────────────────────────

interface CourseCardProps {
  item: Course;
  isEnrolled: boolean;
  isEnrolling: boolean;
  isProposing: boolean;
  isCurrentLecturer: boolean;
  chosenSlot?: string;
  lecturerInfo?: any;
  onEnroll: () => void;
  onUnenroll: () => void;
  onManage: () => void;
  onPropose: () => void;
  swipeRef: (ref: Swipeable | null) => void;
}

const CourseCard = React.memo(({
  item,
  isEnrolled,
  isEnrolling,
  isProposing,
  isCurrentLecturer,
  chosenSlot,
  lecturerInfo,
  onEnroll,
  onUnenroll,
  onManage,
  onPropose,
  swipeRef,
}: CourseCardProps) => {
  const hasLecturer = !!item.lecturer_id;
  const slots = item.course_slots ?? [];

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    return (
      <Animated.View style={[styles.swipeAction, { transform: [{ translateX: trans }] }]}>
        <TouchableOpacity style={styles.swipeDeleteBtn} onPress={onUnenroll}>
          <Text style={styles.swipeDeleteIcon}>🗑</Text>
          <Text style={styles.swipeDeleteText}>Отменить</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const card = (
    <View style={[styles.courseCard, isEnrolled && styles.courseCardEnrolled]}>
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        {!!item.description && (
          <Text style={styles.courseDescription}>{item.description}</Text>
        )}

        <LecturerBadge
          name={hasLecturer ? (lecturerInfo?.full_name ?? 'Преподаватель') : null}
          academicTitle={lecturerInfo?.academic_title}
        />

        {!isEnrolled && hasLecturer && slots.length > 0 && <SlotChips slots={slots} />}

        {isEnrolled && chosenSlot && (
          <View style={styles.enrolledSlot}>
            <Text style={styles.enrolledSlotText}>🕐 Ваше время: {chosenSlot}</Text>
          </View>
        )}

        {isEnrolled && <Text style={styles.swipeHint}>← свайп влево для отмены</Text>}
      </View>

      <View style={styles.cardActions}>
        {isCurrentLecturer ? (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#5856D6', marginBottom: 8 }]}
              onPress={onPropose}
              disabled={isProposing}
            >
              {isProposing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.primaryBtnText}>Предложить время</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#34C759' }]}
              onPress={onManage}
            >
              <Text style={styles.primaryBtnText}>Управлять</Text>
            </TouchableOpacity>
          </>
        ) : isEnrolled ? (
          <View style={styles.enrolledActions}>
            <View style={[styles.primaryBtn, { backgroundColor: '#34C759', flex: 1, marginRight: 10 }]}>
              <Text style={styles.primaryBtnText}>✓ Записан</Text>
            </View>
            <TouchableOpacity
              style={styles.unenrollBtn}
              onPress={onUnenroll}
              disabled={isEnrolling}
            >
              {isEnrolling
                ? <ActivityIndicator size="small" color="#FF3B30" />
                : <Text style={styles.unenrollBtnText}>Отменить</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              isEnrolling && styles.primaryBtnLoading,
              !hasLecturer && styles.primaryBtnDisabled,
            ]}
            onPress={onEnroll}
            disabled={isEnrolling || !hasLecturer}
            activeOpacity={0.8}
          >
            {isEnrolling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {!hasLecturer ? 'Недоступно' : slots.length > 0 ? 'Выбрать время →' : 'Записаться'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (isEnrolled) {
    return (
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
      >
        {card}
      </Swipeable>
    );
  }
  return card;
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CoursesScreen() {
  const router = useRouter();
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const {
    currentUserIdRef, role, courses, lecturersMap,
    enrolledCourseIds, selectedSlots, proposals,
    loading, error, refreshing,
    initialize, refresh, enroll, unenroll,
    proposeSlot, approveProposal, rejectProposal, fetchProposals,
  } = useCoursesData();

  const [enrollingIds, setEnrollingIds] = useState<Set<string>>(new Set());
  const [proposingIds, setProposingIds] = useState<Set<string>>(new Set());
  const [processingProposalIds, setProcessingProposalIds] = useState<Set<string>>(new Set());

  const [slotModalCourse, setSlotModalCourse] = useState<Course | null>(null);
  const [proposeModalCourse, setProposeModalCourse] = useState<Course | null>(null);
  const [newSlotText, setNewSlotText] = useState('');
  const [proposalsModalVisible, setProposalsModalVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => {
  if (!searchQuery.trim()) {
    setFilteredCourses(courses);
    setSuggestions([]);
    return;
  }

  const q = searchQuery.toLowerCase();

  const filtered = courses.filter(course => {
    const lecturer = course.lecturer_id
      ? lecturersMap[course.lecturer_id]
      : null;

    return (
      course.title.toLowerCase().includes(q) ||
      lecturer?.academic_title?.toLowerCase().includes(q) ||
      lecturer?.full_name?.toLowerCase().includes(q)
    );
  });

  setFilteredCourses(filtered);

  // 🔥 suggestions
  const suggSet = new Set<string>();

    courses.forEach(course => {
      if (course.title.toLowerCase().includes(q)) {
        suggSet.add(course.title);
      }

      const lecturer = course.lecturer_id
        ? lecturersMap[course.lecturer_id]
        : null;

      if (lecturer?.full_name?.toLowerCase().includes(q)) {
        suggSet.add(lecturer.full_name);
      }

      if (lecturer?.academic_title?.toLowerCase().includes(q)) {
        suggSet.add(lecturer.academic_title);
      }
    });

    setSuggestions(Array.from(suggSet).slice(0, 5));
  }, [searchQuery, courses, lecturersMap]);
    
  
  // ── handlers ──────────────────────────────────────────────────────────────

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }, [router]);

  const handleAdminAccess = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    data?.role === 'admin' ? router.push('/admin') : Alert.alert('Отказано', 'Ты не админ, дружок ;)');
  }, [router]);

  const handleEnrollPress = useCallback((course: Course) => {
    const slots = course.course_slots ?? [];
    if (slots.length === 0) {
      if (course.lecturer_id) {
        handleDoEnroll(course.id, null, course.lecturer_id);
      } else {
        Alert.alert('Ошибка', 'Нет доступных слотов для записи');
      }
      return;
    }
    if (slots.length === 1) {
      const s = slots[0];
      handleDoEnroll(course.id, s.slot, s.lecturer_id);
      return;
    }
    setSlotModalCourse(course);
  }, []);

  const handleDoEnroll = useCallback(async (
    courseId: string,
    slot: string | null,
    lecturerId?: string,
  ) => {
    setEnrollingIds(prev => new Set(prev).add(courseId));
    try {
      await enroll(courseId, slot, lecturerId);
      Alert.alert('Успешно', 'Вы записаны на курс!');
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setEnrollingIds(prev => { const n = new Set(prev); n.delete(courseId); return n; });
    }
  }, [enroll]);

  const handleSlotConfirm = useCallback((slot: string, lecturerId?: string) => {
    const courseId = slotModalCourse?.id;
    setSlotModalCourse(null);
    if (courseId) handleDoEnroll(courseId, slot, lecturerId);
  }, [slotModalCourse, handleDoEnroll]);

  const handleUnenroll = useCallback(async (courseId: string) => {
    swipeableRefs.current[courseId]?.close();
    try {
      await unenroll(courseId);
      Alert.alert('Готово', 'Вы отписались от курса 🎉');
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    }
  }, [unenroll]);

  const handleProposeConfirm = useCallback(async () => {
    const course = proposeModalCourse;
    if (!course) return;
    const slot = newSlotText.trim();
    if (!slot) { Alert.alert('Ошибка', 'Введите время'); return; }

    setProposeModalCourse(null);
    setProposingIds(prev => new Set(prev).add(course.id));
    try {
      await proposeSlot(course.id, slot);
      Alert.alert('Готово', 'Предложение отправлено на модерацию администратору');
      if (role === 'admin') await fetchProposals();
    } catch (err: any) {
      Alert.alert('Ошибка', 'Не удалось отправить предложение: ' + err.message);
    } finally {
      setProposingIds(prev => { const n = new Set(prev); n.delete(course.id); return n; });
    }
  }, [proposeModalCourse, newSlotText, proposeSlot, role, fetchProposals]);

  const handleApproveProposal = useCallback(async (proposal: Proposal) => {
    setProcessingProposalIds(prev => new Set(prev).add(proposal.id));
    try {
      await approveProposal(proposal);
      Alert.alert('Готово', 'Предложение утверждено и опубликовано');
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setProcessingProposalIds(prev => { const n = new Set(prev); n.delete(proposal.id); return n; });
    }
  }, [approveProposal]);

  const handleRejectProposal = useCallback(async (proposal: Proposal) => {
    setProcessingProposalIds(prev => new Set(prev).add(proposal.id));
    try {
      await rejectProposal(proposal.id);
      Alert.alert('Готово', 'Предложение отклонено');
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setProcessingProposalIds(prev => { const n = new Set(prev); n.delete(proposal.id); return n; });
    }
  }, [rejectProposal]);

  const openProposalsModal = useCallback(async () => {
    setProposalsModalVisible(true);
    await fetchProposals();
  }, [fetchProposals]);

  // ── render ────────────────────────────────────────────────────────────────

  const renderCourseItem = useCallback(({ item }: { item: Course }) => (
    <CourseCard
      item={item}
      isEnrolled={enrolledCourseIds.has(item.id)}
      isEnrolling={enrollingIds.has(item.id)}
      isProposing={proposingIds.has(item.id)}
      isCurrentLecturer={role === 'lecturer' && currentUserIdRef.current === item.lecturer_id}
      chosenSlot={selectedSlots[item.id]}
      lecturerInfo={item.lecturer_id ? lecturersMap[item.lecturer_id] : undefined}
      onEnroll={() => handleEnrollPress(item)}
      onUnenroll={() => handleUnenroll(item.id)}
      onManage={() => Alert.alert('Инфо', 'Здесь можно открыть список студентов курса')}
      onPropose={() => { setNewSlotText(''); setProposeModalCourse(item); }}
      swipeRef={ref => { swipeableRefs.current[item.id] = ref; }}
    />
  ), [
    enrolledCourseIds, enrollingIds, proposingIds,
    role, currentUserIdRef, selectedSlots, lecturersMap,
    handleEnrollPress, handleUnenroll,
  ]);

  const isAdmin = role === 'admin';

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Курсы" isAdmin={false} onSignOut={handleSignOut} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={initialize}>
            <Text style={styles.retryBtnText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Курсы"
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
        onAdminAccess={handleAdminAccess}
        onOpenProposals={openProposalsModal}
      />

      {/* 🔍 ДОДАЙТЕ ЦЕЙ БЛОК СЮДИ */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Пошук курсів або викладачів..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Підказки пошуку */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {suggestions.map((s, i) => (
            <TouchableOpacity key={i} onPress={() => setSearchQuery(s)}>
              <Text style={styles.suggestionItem}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={searchQuery ? filteredCourses : courses}
          keyExtractor={item => item.id}
          renderItem={renderCourseItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={refresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? "Нічого не знайдено за вашим запитом." : "Курсы не найдены."}
              </Text>
            </View>
          }
        />
      )}

      <SlotModal
        course={slotModalCourse}
        onConfirm={handleSlotConfirm}
        onClose={() => setSlotModalCourse(null)}
      />

      <ProposeModal
        course={proposeModalCourse}
        value={newSlotText}
        onChange={setNewSlotText}
        onConfirm={handleProposeConfirm}
        onClose={() => setProposeModalCourse(null)}
      />

      <ProposalsModal
        visible={proposalsModalVisible}
        proposals={proposals}
        lecturersMap={lecturersMap}
        processingIds={processingProposalIds}
        onApprove={handleApproveProposal}
        onReject={handleRejectProposal}
        onClose={() => setProposalsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

interface HeaderProps {
  title: string;
  isAdmin: boolean;
  onSignOut: () => void;
  onAdminAccess?: () => void;
  onOpenProposals?: () => void;
}
const Header = ({ title, isAdmin, onSignOut, onAdminAccess, onOpenProposals }: HeaderProps) => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerButtons}>
      {isAdmin && (
        <>
          <TouchableOpacity onPress={onOpenProposals} style={[styles.adminBtn, { marginRight: 10 }]}>
            <Text style={styles.adminBtnText}>Предложения</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onAdminAccess} style={styles.adminBtn}>
            <Text style={styles.adminBtnText}>Admin</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity onPress={onSignOut} style={styles.logoutBtn}>
        <Text style={styles.logoutBtnText}>Выйти</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#F2F2F7' },
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTitle:       { fontSize: 28, fontWeight: 'bold' },
  headerButtons:     { flexDirection: 'row', alignItems: 'center' },
  adminBtn:          { backgroundColor: '#5856D6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8 },
  adminBtnText:      { color: '#fff', fontWeight: 'bold' },
  logoutBtn:         { padding: 5 },
  logoutBtnText:     { color: '#FF3B30', fontSize: 16 },
  listContent:       { padding: 20 },
  courseCard:        { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 4, flexDirection: 'row', justifyContent: 'space-between' },
  courseCardEnrolled:{ borderLeftWidth: 4, borderLeftColor: '#34C759' },
  courseInfo:        { flex: 1, paddingRight: 12, marginBottom: 16 },
  courseTitle:       { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  courseDescription: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 8 },
  lecturerBadge:     { backgroundColor: '#F0EEFF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  lecturerText:      { color: '#5856D6', fontWeight: '600', fontSize: 13 },
  academicTitle:     { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  noLecturerBadge:   { backgroundColor: '#FFF3E0' },
  noLecturerText:    { color: '#E65100', fontWeight: '600', fontSize: 13 },
  slotsPreview:      { marginTop: 4 },
  slotsLabel:        { fontSize: 13, color: '#888', marginBottom: 6 },
  slotsList:         { flexDirection: 'row', flexWrap: 'wrap' },
  slotChip:          { backgroundColor: '#E8F4FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 6, marginBottom: 6 },
  slotChipText:      { color: '#007AFF', fontSize: 13, fontWeight: '500' },
  enrolledSlot:      { marginTop: 8, backgroundColor: '#E8F9EE', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start' },
  enrolledSlotText:  { color: '#1B8A3E', fontSize: 13, fontWeight: '600' },
  swipeHint:         { fontSize: 11, color: '#C7C7CC', marginTop: 6 },
  cardActions:       { minWidth: 120, justifyContent: 'center' },
  primaryBtn:        { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  primaryBtnLoading: { opacity: 0.7 },
  primaryBtnDisabled:{ backgroundColor: '#C7C7CC' },
  primaryBtnText:    { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  enrolledActions:   { flexDirection: 'row', alignItems: 'center' },
  unenrollBtn:       { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  unenrollBtnText:   { color: '#FF3B30', fontWeight: '600', fontSize: 14 },
  swipeAction:       { justifyContent: 'center', marginBottom: 20 },
  swipeDeleteBtn:    { backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', width: 80, borderTopRightRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 10, flex: 1 },
  swipeDeleteIcon:   { fontSize: 20, marginBottom: 4 },
  swipeDeleteText:   { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyContainer:    { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyText:         { textAlign: 'center', color: '#999', fontSize: 16 },
  emptySubtext:      { textAlign: 'center', color: '#C7C7CC', fontSize: 14, marginTop: 8 },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent:      { width: '88%', backgroundColor: '#fff', padding: 25, borderRadius: 24 },
  modalTitle:        { fontSize: 22, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  modalSubtitle:     { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  modalSectionLabel: { marginTop: 16, fontWeight: 'bold', marginBottom: 8 },
  input:             { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16 },
  slotOption:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 },
  slotOptionText:    { fontSize: 16, fontWeight: '500', color: '#1C1C1E' },
  slotOptionArrow:   { fontSize: 18, color: '#007AFF' },
  cancelBtn:         { padding: 14, alignItems: 'center', backgroundColor: '#E5E5EA', borderRadius: 10, marginTop: 8 },
  cancelBtnText:     { fontWeight: '600', color: '#3C3C43' },
  errorContainer:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText:         { fontSize: 16, color: '#FF3B30', textAlign: 'center', marginBottom: 20 },
  retryBtn:          { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryBtnText:      { color: '#fff', fontWeight: 'bold' },
  proposalItem:      { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  proposalSlot:      { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  proposalDetails:   { marginTop: 4, marginBottom: 4 },
  proposalText:      { color: '#666', fontSize: 13, marginBottom: 2 },
  proposalStatus:    { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 8 },
  statusText:        { fontWeight: '600' },
  statusPending:     { color: '#FF9500' },
  statusApproved:    { color: '#34C759' },
  statusRejected:    { color: '#8E8E93' },
  proposalActions:   { flexDirection: 'row', marginTop: 8 },
  approveBtn:        { backgroundColor: '#34C759', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  approveBtnText:    { color: '#fff', fontWeight: '600' },
  rejectBtn:         { backgroundColor: '#FF3B30', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  rejectBtnText:     { color: '#fff', fontWeight: '600' },
  disabledBtn:       { opacity: 0.6 },
  emptyProposalsText:{ textAlign: 'center', marginTop: 20, color: '#999' },
    searchContainer: {

  flexDirection: 'row',

  alignItems: 'center',

  backgroundColor: '#fff',

  marginHorizontal: 20,

  marginTop: 10,

  borderRadius: 12,

  paddingHorizontal: 12,

  },



  searchInput: {

    flex: 1,

    paddingVertical: 10,

    fontSize: 16,

  },



  clearBtn: {

    fontSize: 18,

    color: '#999',

    paddingHorizontal: 8,

  },



  suggestionsBox: {

    backgroundColor: '#fff',

    marginHorizontal: 20,

    borderRadius: 12,

    marginTop: 5,

    paddingVertical: 5,

  },



  suggestionItem: {

    padding: 10,

    fontSize: 14,

    borderBottomWidth: 1,

    borderBottomColor: '#eee',

  },

});
