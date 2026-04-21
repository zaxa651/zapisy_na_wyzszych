import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Course, Lecturer, useAdminData } from "../hooks/useAdminData";

// ─── Sub-components ──────────────────────────────────────────────────────────

const CourseCard = React.memo(
  ({
    course,
    onEdit,
  }: {
    course: Course;
    onEdit: (course: Course) => void;
  }) => (
    <View style={styles.courseMiniCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.courseTitle}>{course.title}</Text>
        <Text style={styles.courseSubtitle}>
          Слотов: {course.available_slots?.length ?? 0}
          {course.lecturer_id ? " • Lecturer assigned" : ""}
        </Text>
      </View>
      <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(course)}>
        <Text style={styles.editBtnText}>Manage</Text>
      </TouchableOpacity>
    </View>
  ),
);

const LecturerPicker = ({
  lecturers,
  selectedId,
  onSelect,
  onRefresh,
}: {
  lecturers: Lecturer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRefresh: () => void;
}) => {
  if (lecturers.length === 0) {
    return (
      <View style={styles.noLecturersBox}>
        <Text style={styles.noLecturersTitle}>Lecturers are not displayed</Text>
        <Text style={styles.noLecturersText}>
          Most likely, the RLS policy on the table{" "}
          <Text style={{ fontFamily: "monospace" }}>profiles</Text> does not
          allow the administrator to read all profiles.{"\n\n"}
          Run this SQL in Supabase → SQL Editor:
        </Text>
        <View style={styles.sqlBox}>
          <Text style={styles.sqlCode}>{RLS_SQL}</Text>
        </View>
        <Text style={styles.noLecturersText}>
          After executing, refresh the list ↓
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={styles.refreshBtnText}>
            🔄 Refresh the list of lecturers
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.lecturerList}>
      <LecturerChip
        label="Not assigned"
        selected={!selectedId}
        onPress={() => onSelect(null)}
      />
      {lecturers.map((l) => (
        <LecturerChip
          key={l.id}
          label={l.full_name}
          selected={selectedId === l.id}
          onPress={() => onSelect(l.id)}
        />
      ))}
    </View>
  );
};

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
    style={[styles.lecturerChip, selected && styles.selectedChip]}
    onPress={onPress}
  >
    <Text style={selected ? styles.chipTextSelected : styles.chipText}>
      {label}
    </Text>
  </TouchableOpacity>
);

const SlotBadge = ({
  slot,
  onRemove,
}: {
  slot: string;
  onRemove: () => void;
}) => (
  <View style={styles.slotBadge}>
    <Text style={styles.slotText}>{slot}</Text>
    <TouchableOpacity style={styles.deleteSlotBtn} onPress={onRemove}>
      <Text style={styles.deleteSlotText}>✕</Text>
    </TouchableOpacity>
  </View>
);

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  course: Course | null;
  lecturers: Lecturer[];
  onSave: (lecturerId: string | null, slots: string[]) => void;
  onClose: () => void;
  onRefreshLecturers: () => void;
}

const EditModal = ({
  course,
  lecturers,
  onSave,
  onClose,
  onRefreshLecturers,
}: EditModalProps) => {
  const [selectedLecturerId, setSelectedLecturerId] = useState<string | null>(
    null,
  );
  const [slots, setSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState("");

  // Sync state when course changes
  useEffect(() => {
    if (course) {
      setSelectedLecturerId(course.lecturer_id);
      setSlots(course.available_slots ?? []);
      setNewSlot("");
    }
  }, [course]);

  const addSlot = useCallback(() => {
    const trimmed = newSlot.trim();
    if (!trimmed) return;
    setSlots((prev) => [...prev, trimmed]);
    setNewSlot("");
  }, [newSlot]);

  const removeSlot = useCallback((index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <Modal visible={!!course} animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <ScrollView style={{ padding: 20 }}>
          <Text style={styles.modalTitle}>Edit: {course?.title}</Text>

          <Text style={styles.label}>Assign lecturer</Text>
          <LecturerPicker
            lecturers={lecturers}
            selectedId={selectedLecturerId}
            onSelect={setSelectedLecturerId}
            onRefresh={onRefreshLecturers}
          />

          <Text style={styles.label}>Time slots</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="For example: 14:00"
              placeholderTextColor="#A9A9A9"
              value={newSlot}
              onChangeText={setNewSlot}
              onSubmitEditing={addSlot}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addSlot}>
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.slotsContainer}>
            {slots.map((slot, i) => (
              <SlotBadge key={i} slot={slot} onRemove={() => removeSlot(i)} />
            ))}
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => onSave(selectedLecturerId, slots)}
          >
            <Text style={styles.saveBtnText}>Save changes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────

const RLS_SQL = `CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);`;

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const router = useRouter();
  const { courses, lecturers, loading, fetchData, saveCourse } = useAdminData();
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = useCallback((course: Course) => {
    setEditingCourse(course);
  }, []);

  const handleSave = useCallback(
    async (lecturerId: string | null, slots: string[]) => {
      if (!editingCourse) return;
      const success = await saveCourse(editingCourse.id, lecturerId, slots);
      if (success) setEditingCourse(null);
    },
    [editingCourse, saveCourse],
  );

  const handleRefreshLecturers = useCallback(() => {
    setEditingCourse(null);
    fetchData();
  }, [fetchData]);

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
        <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.backBtn}>← Back to the app</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Course management</Text>

        {courses.length === 0 ? (
          <Text style={styles.emptyText}>No courses yet</Text>
        ) : (
          courses.map((course) => (
            <CourseCard key={course.id} course={course} onEdit={handleEdit} />
          ))
        )}
      </ScrollView>

      <EditModal
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
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  scrollContent: { padding: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backBtn: { color: "#007AFF", fontSize: 16, marginBottom: 15 },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3A3A3C",
    marginVertical: 15,
  },
  emptyText: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: 20,
    fontSize: 16,
  },

  courseMiniCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  courseTitle: { fontSize: 17, fontWeight: "bold" },
  courseSubtitle: { color: "#8E8E93", fontSize: 13, marginTop: 2 },
  editBtn: {
    backgroundColor: "#5856D6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },

  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8E8E93",
    marginTop: 25,
    marginBottom: 10,
    textTransform: "uppercase",
  },

  lecturerList: { flexDirection: "row", flexWrap: "wrap" },
  lecturerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#E5E5EA",
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChip: { backgroundColor: "#007AFF" },
  chipText: { color: "#1C1C1E" },
  chipTextSelected: { color: "#fff" },

  noLecturersBox: {
    backgroundColor: "#FFF3E0",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  noLecturersTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E65100",
    marginBottom: 12,
    textAlign: "center",
  },
  noLecturersText: {
    color: "#E65100",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 15,
  },
  sqlBox: {
    backgroundColor: "#1C1C1E",
    padding: 14,
    borderRadius: 12,
    marginVertical: 12,
  },
  sqlCode: {
    fontFamily: "monospace",
    color: "#34C759",
    fontSize: 13,
    lineHeight: 20,
  },
  refreshBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  refreshBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  inputGroup: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D1D6",
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: "#007AFF",
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginLeft: 10,
  },
  addBtnText: { color: "#fff", fontSize: 28, fontWeight: "300" },

  slotsContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  slotBadge: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
  },
  slotText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  deleteSlotBtn: {
    padding: 10,
    marginLeft: 5,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  deleteSlotText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  saveBtn: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 35,
  },
  saveBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cancelLink: { marginTop: 25, alignItems: "center", paddingBottom: 50 },
  cancelText: { color: "#FF3B30", fontSize: 16, fontWeight: "600" },
});
