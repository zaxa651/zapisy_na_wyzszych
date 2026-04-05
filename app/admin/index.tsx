import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Course, Lecturer, useAdminData } from '../hooks/useAdminData';

// ─── RLS hint SQL ─────────────────────────────────────────────────────────────

const RLS_SQL = `CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);`;

// ─── LecturerChip ─────────────────────────────────────────────────────────────

const LecturerChip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
  >
    <Text style={selected ? styles.chipTextSelected : styles.chipText}>{label}</Text>
  </TouchableOpacity>
);

// ─── SlotBadge ────────────────────────────────────────────────────────────────

const SlotBadge = ({ slot, onRemove }: { slot: string; onRemove: () => void }) => (
  <View style={styles.slotBadge}>
    <Text style={styles.slotText}>{slot}</Text>
    <TouchableOpacity style={styles.slotRemoveBtn} onPress={onRemove}>
      <Text style={styles.slotRemoveText}>✕</Text>
    </TouchableOpacity>
  </View>
);

// ─── CourseCard ───────────────────────────────────────────────────────────────

const CourseCard = React.memo(({
  course,
  onEdit,
  onDelete,
}: {
  course: Course;
  onEdit: (c: Course) => void;
  onDelete: (c: Course) => void;
}) => (
  <View style={styles.card}>
    <View style={{ flex: 1 }}>
      <Text style={styles.cardTitle}>{course.title}</Text>
      {!!course.description && (
        <Text style={styles.cardDescription} numberOfLines={2}>{course.description}</Text>
      )}
      <Text style={styles.cardMeta}>
        Слотов: {course.available_slots?.length ?? 0}
        {course.lecturer_id ? '  •  Преподаватель назначен' : ''}
      </Text>
    </View>
    <View style={styles.cardActions}>
      <TouchableOpacity style={styles.manageBtn} onPress={() => onEdit(course)}>
        <Text style={styles.manageBtnText}>Управлять</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteCardBtn} onPress={() => onDelete(course)}>
        <Text style={styles.deleteCardBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  </View>
));

// ─── CreateCourseModal ────────────────────────────────────────────────────────

interface CreateModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string) => Promise<boolean>;
}

const CreateCourseModal = ({ visible, onClose, onCreate }: CreateModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setTitle(''); setDescription(''); }
  }, [visible]);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    const ok = await onCreate(title, description);
    setSaving(false);
    if (ok) onClose();
  }, [title, description, onCreate, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Новый курс</Text>

          <Text style={styles.fieldLabel}>Название *</Text>
          <TextInput
            style={styles.input}
            placeholder="Введите название курса"
            placeholderTextColor="#A9A9A9"
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            autoFocus
          />

          <Text style={styles.fieldLabel}>Описание (необязательно)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Краткое описание курса"
            placeholderTextColor="#A9A9A9"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.primaryBtn, (!title.trim() || saving) && { opacity: 0.5 }]}
            onPress={handleCreate}
            disabled={!title.trim() || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Создать курс</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
            <Text style={styles.cancelText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── EditCourseModal ──────────────────────────────────────────────────────────

interface EditModalProps {
  course: Course | null;
  lecturers: Lecturer[];
  onSave: (lecturerId: string | null, slots: string[], description: string | null) => Promise<void>;
  onClose: () => void;
  onRefreshLecturers: () => void;
}

const EditCourseModal = ({ course, lecturers, onSave, onClose, onRefreshLecturers }: EditModalProps) => {
  const [lecturerId, setLecturerId] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (course) {
      setLecturerId(course.lecturer_id);
      setSlots(course.available_slots ?? []);
      setDescription(course.description ?? '');
      setNewSlot('');
    }
  }, [course]);

  const addSlot = useCallback(() => {
    const trimmed = newSlot.trim();
    if (!trimmed) return;
    setSlots(prev => [...prev, trimmed]);
    setNewSlot('');
  }, [newSlot]);

  const removeSlot = useCallback((index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await onSave(lecturerId, slots, description.trim() || null);
    setSaving(false);
  }, [lecturerId, slots, description, onSave]);

  return (
    <Modal visible={!!course} animationType="slide">
      <SafeAreaView style={styles.modalFull}>
        <ScrollView contentContainerStyle={styles.modalScroll}>

          {/* Заголовок */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={2}>{course?.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Описание */}
          <Text style={styles.sectionLabel}>Описание курса</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Краткое описание курса"
            placeholderTextColor="#A9A9A9"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Преподаватель */}
          <Text style={styles.sectionLabel}>Преподаватель</Text>
          {lecturers.length === 0 ? (
            <View style={styles.rlsBox}>
              <Text style={styles.rlsTitle}>⚠️ Преподаватели не загружаются</Text>
              <Text style={styles.rlsText}>
                Добавь RLS-политику в Supabase → SQL Editor:
              </Text>
              <View style={styles.sqlBox}>
                <Text style={styles.sqlCode}>{RLS_SQL}</Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={onRefreshLecturers}>
                <Text style={styles.primaryBtnText}>🔄 Обновить</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.chipRow}>
              <LecturerChip
                label="Не назначен"
                selected={!lecturerId}
                onPress={() => setLecturerId(null)}
              />
              {lecturers.map(l => (
                <LecturerChip
                  key={l.id}
                  label={l.full_name}
                  selected={lecturerId === l.id}
                  onPress={() => setLecturerId(l.id)}
                />
              ))}
            </View>
          )}

          {/* Временные слоты */}
          <Text style={styles.sectionLabel}>Временные слоты</Text>
          <View style={styles.slotInputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Например: Пн 14:00"
              placeholderTextColor="#A9A9A9"
              value={newSlot}
              onChangeText={setNewSlot}
              onSubmitEditing={addSlot}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addSlotBtn} onPress={addSlot}>
              <Text style={styles.addSlotBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.slotsWrap}>
            {slots.length === 0
              ? <Text style={styles.emptySlots}>Слоты не добавлены</Text>
              : slots.map((s, i) => (
                  <SlotBadge key={i} slot={s} onRemove={() => removeSlot(i)} />
                ))
            }
          </View>

          {/* Кнопка сохранения */}
          <TouchableOpacity
            style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Сохранить изменения</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
            <Text style={styles.cancelText}>Отмена</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── AdminPanel (main screen) ─────────────────────────────────────────────────

export default function AdminPanel() {
  const router = useRouter();
  const {
    courses, lecturers, loading,
    fetchData, saveCourse, createCourse, deleteCourse,
  } = useAdminData();

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Удаление с подтверждением
  const handleDeletePress = useCallback((course: Course) => {
  if (window.confirm(`Удалить курс «${course.title}»?`)) {
    deleteCourse(course.id);
  }
}, [deleteCourse]);

  // Сохранение из модалки редактирования
  const handleSave = useCallback(async (
    lecturerId: string | null,
    slots: string[],
    description: string | null,
  ) => {
    if (!editingCourse) return;
    const ok = await saveCourse(editingCourse.id, lecturerId, slots, description);
    if (ok) setEditingCourse(null);
  }, [editingCourse, saveCourse]);

  const handleRefreshLecturers = useCallback(() => {
    setEditingCourse(null);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 12, color: '#8E8E93' }}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Назад */}
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backBtn}>← Назад</Text>
        </TouchableOpacity>

        {/* Шапка */}
        <Text style={styles.pageTitle}>Admin Panel</Text>

        {/* Секция курсов */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Курсы ({courses.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.addBtnText}>+ Добавить</Text>
          </TouchableOpacity>
        </View>

        {courses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Курсов пока нет</Text>
            <Text style={styles.emptyHint}>Нажмите «+ Добавить» чтобы создать первый</Text>
          </View>
        ) : (
          courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={setEditingCourse}
              onDelete={handleDeletePress}
            />
          ))
        )}

      </ScrollView>

      {/* Модалка создания */}
      <CreateCourseModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={createCourse}
      />

      {/* Модалка редактирования */}
      <EditCourseModal
        course={editingCourse}
        lecturers={lecturers}
        onSave={handleSave}
        onClose={() => setEditingCourse(null)}
        onRefreshLecturers={handleRefreshLecturers}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  container:          { flex: 1, backgroundColor: '#F2F2F7' },
  scrollContent:      { padding: 20, paddingBottom: 60 },
  centered:           { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Nav
  backBtn:            { color: '#007AFF', fontSize: 16, marginBottom: 16 },
  pageTitle:          { fontSize: 34, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 24 },

  // Section header
  sectionRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle:       { fontSize: 20, fontWeight: '700', color: '#3A3A3C' },
  addBtn:             { backgroundColor: '#34C759', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20 },
  addBtnText:         { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Empty state
  emptyBox:           { alignItems: 'center', paddingVertical: 40 },
  emptyText:          { fontSize: 17, color: '#8E8E93', fontWeight: '600' },
  emptyHint:          { fontSize: 13, color: '#C7C7CC', marginTop: 6 },

  // Course card
  card:               { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardTitle:          { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  cardDescription:    { fontSize: 13, color: '#636366', marginBottom: 6, lineHeight: 18 },
  cardMeta:           { fontSize: 12, color: '#8E8E93' },
  cardActions:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10 },
  manageBtn:          { backgroundColor: '#5856D6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  manageBtnText:      { color: '#fff', fontWeight: '700', fontSize: 13 },
  deleteCardBtn:      { backgroundColor: '#FF3B30', width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  deleteCardBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Shared inputs
  input:              { backgroundColor: '#F2F2F7', height: 50, paddingHorizontal: 16, borderRadius: 12, fontSize: 16, color: '#1C1C1E', borderWidth: 1, borderColor: '#E5E5EA', marginBottom: 12 },
  inputMultiline:     { height: 90, paddingTop: 12, textAlignVertical: 'top' },

  // Shared buttons
  primaryBtn:         { backgroundColor: '#007AFF', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  primaryBtnText:     { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelLink:         { marginTop: 20, alignItems: 'center', paddingBottom: 20 },
  cancelText:         { color: '#FF3B30', fontSize: 16, fontWeight: '600' },

  // Create modal (bottom sheet)
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:              { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 48 },
  sheetTitle:         { fontSize: 22, fontWeight: '700', color: '#1C1C1E', marginBottom: 20 },
  fieldLabel:         { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginBottom: 6, textTransform: 'uppercase' },

  // Edit modal (full screen)
  modalFull:          { flex: 1, backgroundColor: '#F2F2F7' },
  modalScroll:        { padding: 20, paddingBottom: 60 },
  modalHeader:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle:         { fontSize: 24, fontWeight: '700', color: '#1C1C1E', flex: 1, marginRight: 12 },
  modalCloseBtn:      { fontSize: 20, color: '#8E8E93', fontWeight: '600', padding: 4 },
  sectionLabel:       { fontSize: 13, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 10, marginTop: 20 },

  // Lecturer chips
  chipRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:               { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#E5E5EA', borderRadius: 20 },
  chipSelected:       { backgroundColor: '#007AFF' },
  chipText:           { color: '#1C1C1E', fontWeight: '500' },
  chipTextSelected:   { color: '#fff', fontWeight: '600' },

  // Slots
  slotInputRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  addSlotBtn:         { backgroundColor: '#007AFF', width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addSlotBtnText:     { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  slotsWrap:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  emptySlots:         { color: '#C7C7CC', fontSize: 14, marginTop: 4 },
  slotBadge:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34C759', borderRadius: 10, paddingLeft: 12, overflow: 'hidden' },
  slotText:           { color: '#fff', fontWeight: '600', fontSize: 14 },
  slotRemoveBtn:      { padding: 10, marginLeft: 4, backgroundColor: 'rgba(0,0,0,0.12)' },
  slotRemoveText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  // RLS hint
  rlsBox:             { backgroundColor: '#FFF3E0', padding: 20, borderRadius: 16, marginBottom: 8 },
  rlsTitle:           { fontSize: 16, fontWeight: '700', color: '#E65100', marginBottom: 10 },
  rlsText:            { color: '#E65100', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  sqlBox:             { backgroundColor: '#1C1C1E', padding: 14, borderRadius: 12, marginBottom: 16 },
  sqlCode:            { fontFamily: 'monospace', color: '#34C759', fontSize: 12, lineHeight: 20 },
});