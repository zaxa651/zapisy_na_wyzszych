import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../src/supabase/supabaseClient';

export default function AdminPanel() {
  const router = useRouter();
  
  const [courses, setCourses] = useState<any[]>([]);
  const [availableLecturers, setAvailableLecturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [selectedLecturerId, setSelectedLecturerId] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState('');
  const [courseSlots, setCourseSlots] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [courseRes, lecturerRes] = await Promise.all([
        supabase
          .from('courses')
          .select('*')
          .order('title', { ascending: true }),
        
        supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('role', 'lecturer')
          .order('full_name', { ascending: true })
      ]);

      setCourses(courseRes.data || []);
      setAvailableLecturers(lecturerRes.data || []);

      // === ОТЛАДКА ===
      console.log('🔍 Найдено преподавателей (role = lecturer):', lecturerRes.data?.length || 0);
      console.log('📋 Полный список:', lecturerRes.data);
      console.log('📋 Всего профилей в базе:', (await supabase.from('profiles').select('id, full_name, role')).data);

    } catch (err: any) {
      console.error("Fetch error:", err);
      Alert.alert("Ошибка загрузки", err.message || "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

async function saveCourseSettings() {
  if (!editingCourse) return;

  console.log("Сохраняем курс:", editingCourse.id);
  console.log("Выбранный преподаватель:", selectedLecturerId);

  try {
    const { data, error } = await supabase
      .from('courses')
      .update({
        lecturer_id: selectedLecturerId, // может быть null — это нормально
        available_slots: courseSlots
      })
      .eq('id', editingCourse.id)
      .select(); // 👈 чтобы увидеть, что реально сохранилось

    if (error) {
      console.error("Supabase error:", error);
      Alert.alert("Ошибка базы", error.message);
      return;
    }

    console.log("Обновлённые данные:", data);

    if (!data || data.length === 0) {
      Alert.alert("Ой", "Ничего не обновилось. Проверь RLS и права доступа.");
      return;
    }

    Alert.alert("Готово!", "Курс обновлён");

    setEditingCourse(null);
    setSelectedLecturerId(null);
    setCourseSlots([]);

    fetchData();

  } catch (err: any) {
    console.error("Unexpected error:", err);
    Alert.alert("Ошибка", err.message || "Неизвестная ошибка");
  }
}

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backBtn}>← Назад в приложение</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Admin Panel</Text>

        <Text style={styles.subtitle}>Управление курсами</Text>
        {courses.length === 0 ? (
          <Text style={styles.emptyText}>Курсов пока нет</Text>
        ) : (
          courses.map((course) => (
            <View key={course.id} style={styles.courseMiniCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseTitle}>{course.title}</Text>
                <Text style={styles.courseSubtitle}>
                  Слотов: {course.available_slots?.length || 0}
                  {course.lecturer_id && ' • Преподаватель назначен'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.editBtn}
                onPress={() => {
                  setEditingCourse(course);
                  setSelectedLecturerId(course.lecturer_id);
                  setCourseSlots(course.available_slots || []);
                }}
              >
                <Text style={styles.editBtnText}>Управлять</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ */}
      <Modal visible={!!editingCourse} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Редактирование: {editingCourse?.title}</Text>

            <Text style={styles.label}>Назначить преподавателя</Text>
            
            {availableLecturers.length === 0 ? (
              <View style={styles.noLecturersBox}>
                <Text style={styles.noLecturersTitle}>Преподаватели не отображаются</Text>
                <Text style={styles.noLecturersText}>
                  У тебя есть преподаватель в базе, но он не виден.{'\n\n'}
                  <Text style={{ fontWeight: 'bold' }}>Причина почти всегда одна:</Text> RLS-политика на таблице <Text style={{ fontFamily: 'monospace' }}>profiles</Text> не разрешает админу читать все профили.{'\n\n'}
                  
                  Выполни этот SQL в Supabase → <Text style={{ fontWeight: 'bold' }}>SQL Editor</Text>:
                </Text>
                
                <View style={styles.sqlBox}>
                  <Text style={styles.sqlCode}>
{`CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);`}
                  </Text>
                </View>

                <Text style={styles.noLecturersText}>
                  После выполнения нажми кнопку ниже ↓
                </Text>

                <TouchableOpacity 
                  style={styles.refreshBtn}
                  onPress={() => {
                    setEditingCourse(null); 
                    fetchData();
                  }}
                >
                  <Text style={styles.refreshBtnText}>🔄 Обновить список преподавателей</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.lecturerList}>
                <TouchableOpacity 
                  style={[styles.lecturerChip, !selectedLecturerId && styles.selectedChip]}
                  onPress={() => setSelectedLecturerId(null)}
                >
                  <Text style={!selectedLecturerId && {color: 'white'}}>Не назначен</Text>
                </TouchableOpacity>

                {availableLecturers.map((l) => (
                  <TouchableOpacity 
                    key={l.id} 
                    style={[styles.lecturerChip, selectedLecturerId === l.id && styles.selectedChip]}
                    onPress={() => setSelectedLecturerId(l.id)}
                  >
                    <Text style={selectedLecturerId === l.id && {color: 'white'}}>
                      {l.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Временные слоты</Text>
            <View style={styles.inputGroup}>
              <TextInput 
                style={styles.input} 
                placeholder="Например: 14:00" 
                placeholderTextColor="#A9A9A9"
                value={newSlot} 
                onChangeText={setNewSlot}
              />
              <TouchableOpacity 
                style={styles.addBtn} 
                onPress={() => {
                  if (newSlot.trim()) { 
                    setCourseSlots([...courseSlots, newSlot.trim()]); 
                    setNewSlot(''); 
                  }
                }}
              >
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.slotsContainer}>
              {courseSlots.map((slot, index) => (
                <View key={index} style={styles.slotBadge}>
                  <Text style={styles.slotText}>{slot}</Text>
                  <TouchableOpacity 
                    style={styles.deleteSlotBtn}
                    onPress={() => setCourseSlots(courseSlots.filter((_, i) => i !== index))}
                  >
                    <Text style={styles.deleteSlotText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveCourseSettings}>
              <Text style={styles.saveBtnText}>Сохранить изменения</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setEditingCourse(null)} 
              style={styles.cancelLink}
            >
              <Text style={styles.cancelText}>Отмена</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scrollContent: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { color: '#007AFF', fontSize: 16, marginBottom: 15 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 20 },
  subtitle: { fontSize: 20, fontWeight: '700', color: '#3A3A3C', marginVertical: 15 },
  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 20, fontSize: 16 },
  
  courseMiniCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 10, 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2 
  },
  courseTitle: { fontSize: 17, fontWeight: 'bold' },
  courseSubtitle: { color: '#8E8E93', fontSize: 13, marginTop: 2 },
  editBtn: { backgroundColor: '#5856D6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  editBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  inputGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: { 
    flex: 1, 
    backgroundColor: '#fff', 
    height: 50,
    paddingHorizontal: 15, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#D1D1D6',
    fontSize: 16 
  },
  addBtn: { 
    backgroundColor: '#007AFF', 
    width: 50, 
    height: 50, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 10, 
    marginLeft: 10 
  },
  addBtnText: { color: '#fff', fontSize: 28, fontWeight: '300' },

  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginTop: 25, marginBottom: 10, textTransform: 'uppercase' },
  
  lecturerList: { flexDirection: 'row', flexWrap: 'wrap' },
  lecturerChip: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    backgroundColor: '#E5E5EA', 
    borderRadius: 20, 
    marginRight: 8, 
    marginBottom: 8 
  },
  selectedChip: { backgroundColor: '#007AFF' },

  // === БЛОК С ПРОБЛЕМОЙ RLS ===
  noLecturersBox: {
    backgroundColor: '#FFF3E0',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  noLecturersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 12,
    textAlign: 'center',
  },
  noLecturersText: {
    color: '#E65100',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 15,
  },
  sqlBox: {
    backgroundColor: '#1C1C1E',
    padding: 14,
    borderRadius: 12,
    marginVertical: 12,
  },
  sqlCode: {
    fontFamily: 'monospace',
    color: '#34C759',
    fontSize: 13,
    lineHeight: 20,
  },
  refreshBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  slotsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  slotBadge: { 
    backgroundColor: '#34C759', 
    borderRadius: 8, 
    marginRight: 8, 
    marginBottom: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingLeft: 12 
  },
  slotText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  deleteSlotBtn: { 
    padding: 10, 
    marginLeft: 5, 
    backgroundColor: 'rgba(0,0,0,0.1)', 
    borderTopRightRadius: 8, 
    borderBottomRightRadius: 8 
  },
  deleteSlotText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  saveBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 35 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelLink: { marginTop: 25, alignItems: 'center', paddingBottom: 50 },
  cancelText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },
});