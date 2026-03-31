import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import LecturerCard from '../../../app/components/LecturerCard';
import { supabase } from '../../../src/supabase/supabaseClient';

export default function CourseSlotsScreen() {
  const { id } = useLocalSearchParams();
  const courseId = id as string;

  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLecturer, setSelectedLecturer] = useState<string | null>(null);

  useEffect(() => {
    fetchSlots();
  }, []);

  async function fetchSlots() {
    setLoading(true);

    const { data, error } = await supabase
      .from('course_slots')
      .select(`
        id,
        slot,
        course:courses (
          id,
          title
        ),
        lecturer:lecturers (
          id,
          academic_title,
          bio,
          avatar_url,
          profiles (
            full_name
          )
        )
      `)
      .eq('course_id', courseId);

    if (error) {
      console.error(error);
      setSlots([]);
      setLoading(false);
      return;
    }

    const normalized = (data || []).map((s: any) => ({
      id: s.id,
      slot: s.slot,
      course: s.course,
      lecturer: {
        id: s.lecturer?.id,
        full_name: s.lecturer?.profiles?.full_name,
        academic_title: s.lecturer?.academic_title,
        bio: s.lecturer?.bio,
        avatar_url: s.lecturer?.avatar_url,
      },
    }));

    setSlots(normalized);
    setLoading(false);
  }

  const filteredSlots = selectedLecturer
    ? slots.filter(s => s.lecturer?.id === selectedLecturer)
    : slots;

  async function enroll(slotId: string) {
    const user = await supabase.auth.getUser();

    const { error } = await supabase.from('enrollments').insert({
      student_id: user.data.user?.id,
      course_id: courseId,
      course_slot_id: slotId,
    });

    if (error) {
      console.error(error);
    } else {
      alert('Записан, поздравляю, теперь пути назад нет ;)');
    }
  }

  function renderSlot({ item }: any) {
    return (
      <View style={styles.slotCard}>
        <Text style={styles.slotText}>{item.slot}</Text>

        <LecturerCard lecturer={item.lecturer} />

        <TouchableOpacity
          style={styles.button}
          onPress={() => enroll(item.id)}
        >
          <Text style={styles.buttonText}>Записаться</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lecturersUnique = Array.from(
    new Map(slots.map(s => [s.lecturer.id, s.lecturer])).values()
  );

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Выбери дату (и судьбу)</Text>

      {/* Фильтр */}
      <FlatList
        horizontal
        data={lecturersUnique}
        keyExtractor={(item: any) => item.id}
        style={{ marginBottom: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              setSelectedLecturer(
                selectedLecturer === item.id ? null : item.id
              )
            }
            style={[
              styles.filterBtn,
              selectedLecturer === item.id && styles.filterActive,
            ]}
          >
            <Text>{item.full_name}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filteredSlots}
        keyExtractor={(item) => item.id}
        renderItem={renderSlot}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  slotCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F7F7FA',
    borderRadius: 12,
  },
  slotText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  filterBtn: {
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginRight: 8,
  },
  filterActive: {
    backgroundColor: '#c7c7ff',
  },
});