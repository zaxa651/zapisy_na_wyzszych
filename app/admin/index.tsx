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
  
  // ?????? ?? ??
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ????????? ??? ?????????????? ?????
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [selectedLecturerId, setSelectedLecturerId] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState('');
  const [courseSlots, setCourseSlots] = useState<string[]>([]);

  // ????????? ??? ?????? ?????????????
  const [newLecturerName, setNewLecturerName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [lectRes, courseRes] = await Promise.all([
        supabase.from('lecturers').select('*').order('name', { ascending: true }),
        supabase.from('courses').select('*').order('title', { ascending: true })
      ]);
      setLecturers(lectRes.data || []);
      setCourses(courseRes.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveCourseSettings() {
    if (!editingCourse) return;

    const { data, error } = await supabase
      .from('courses')
      .update({
        lecturer_id: selectedLecturerId,
        available_slots: courseSlots
      })
      .eq('id', editingCourse.id)
      .select();

    if (error) {
      Alert.alert("Database Error", "Make sure you added lecturer_id and available_slots columns in Supabase!\n\n" + error.message);
    } else {
      Alert.alert("Success", "Course updated!");
      setEditingCourse(null);
      fetchData();
    }
  }

  async function addLecturer() {
    if (!newLecturerName.trim()) return;
    const { error } = await supabase.from('lecturers').insert([{ name: newLecturerName.trim() }]);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setNewLecturerName('');
      fetchData();
    }
  }

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backBtn}>? Back to App</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Admin Panel</Text>

        {/* ?????? ?????? */}
        <Text style={styles.subtitle}>Course Management</Text>
        {courses.map((course) => (
          <View key={course.id} style={styles.courseMiniCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.courseSubtitle}>
                {course.available_slots?.length || 0} time slots set
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
              <Text style={styles.editBtnText}>Manage</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.divider} />

        {/* ?????????? ????????????? */}
        <Text style={styles.subtitle}>Add New Lecturer</Text>
        <View style={styles.inputGroup}>
          <TextInput 
            style={styles.input} 
            value={newLecturerName} 
            onChangeText={setNewLecturerName}
            placeholder="Full Name (e.g. Dr. Smith)"
            placeholderTextColor="#A9A9A9"
          />
          <TouchableOpacity style={styles.addBtn} onPress={addLecturer}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ????????? ???? ?????????????? */}
      <Modal visible={!!editingCourse} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Editing: {editingCourse?.title}</Text>

            <Text style={styles.label}>Assign Lecturer</Text>
            <View style={styles.lecturerList}>
              <TouchableOpacity 
                style={[styles.lecturerChip, !selectedLecturerId && styles.selectedChip]}
                onPress={() => setSelectedLecturerId(null)}
              >
                <Text style={!selectedLecturerId && {color: 'white'}}>None</Text>
              </TouchableOpacity>
              {lecturers.map((l) => (
                <TouchableOpacity 
                  key={l.id} 
                  style={[styles.lecturerChip, selectedLecturerId === l.id && styles.selectedChip]}
                  onPress={() => setSelectedLecturerId(l.id)}
                >
                  <Text style={selectedLecturerId === l.id && {color: 'white'}}>{l.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Time Slots</Text>
            <View style={styles.inputGroup}>
              <TextInput 
                style={styles.input} 
                placeholder="Add time (e.g. 14:00)" 
                placeholderTextColor="#A9A9A9"
                value={newSlot} 
                onChangeText={setNewSlot}
              />
              <TouchableOpacity 
                style={styles.addBtn} 
                onPress={() => {
                  if(newSlot.trim()) { 
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
                    <Text style={styles.deleteSlotText}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveCourseSettings}>
              <Text style={styles.saveBtnText}>Save All Changes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setEditingCourse(null)} style={styles.cancelLink}>
              <Text style={{color: '#FF3B30', fontSize: 16, fontWeight: '600'}}>Cancel</Text>
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
  divider: { height: 1, backgroundColor: '#D1D1D6', marginVertical: 25 },
  
  // ???????????? ???? ??????
  inputGroup: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  input: { 
    flex: 1, 
    backgroundColor: '#fff', 
    height: 50,
    paddingHorizontal: 15, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#D1D1D6',
    fontSize: 16,
    color: '#000'
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

  // ???????
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginTop: 25, marginBottom: 10, textTransform: 'uppercase' },
  lecturerList: { flexDirection: 'row', flexWrap: 'wrap' },
  lecturerChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#E5E5EA', borderRadius: 20, marginRight: 8, marginBottom: 8 },
  selectedChip: { backgroundColor: '#007AFF' },
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
  deleteSlotText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  saveBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 35 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelLink: { marginTop: 25, alignItems: 'center', paddingBottom: 50 }
});