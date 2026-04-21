import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { Course, useAdminData } from "../hooks/useAdminData";

// --- Sub-components ---

const CourseCard = React.memo(
  ({ course, onEdit }: { course: Course; onEdit: (course: Course) => void }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.courseTitle}>{course.title}</Text>
        <Text style={styles.courseSubtitle}>
          Slots: {course.available_slots?.length ?? 0} | {course.lecturer_id ? "Lecturer assigned" : "Unassigned"}
        </Text>
      </View>
      <TouchableOpacity style={styles.miniButton} onPress={() => onEdit(course)}>
        <Text style={styles.miniButtonText}>MANAGE</Text>
      </TouchableOpacity>
    </View>
  ),
);

const LecturerChip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label.toUpperCase()}
    </Text>
  </TouchableOpacity>
);

const SlotBadge = ({ slot, onRemove }: { slot: string; onRemove: () => void }) => (
  <View style={styles.slotBadge}>
    <Text style={styles.slotText}>{slot}</Text>
    <TouchableOpacity style={styles.deleteSlotBtn} onPress={onRemove}>
      <Text style={styles.deleteSlotText}>X</Text>
    </TouchableOpacity>
  </View>
);

// --- Main Screen ---

export default function AdminPanel() {
  const router = useRouter();
  const { courses, lecturers, loading, fetchData, saveCourse } = useAdminData();
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [selectedLecturerId, setSelectedLecturerId] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [newSlot, setNewSlot] = useState("");

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (course: Course) => {
    setSelectedLecturerId(course.lecturer_id);
    setSlots(course.available_slots ?? []);
    setEditingCourse(course);
  };

  const handleSave = async () => {
    if (!editingCourse) return;
    const success = await saveCourse(editingCourse.id, selectedLecturerId, slots, editingCourse.description);
    if (success) setEditingCourse(null);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#1A202C" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.backButton}>
            <Text style={styles.backButtonText}>BACK TO APP</Text>
          </TouchableOpacity>
          <Text style={styles.universityName}>ADMIN PANEL</Text>
          <View style={styles.divider} />
          <Text style={styles.loginSubheader}>Course and Faculty Management</Text>
        </View>

        {courses.length === 0 ? (
          <Text style={styles.emptyText}>No academic courses found.</Text>
        ) : (
          courses.map((course) => (
            <CourseCard key={course.id} course={course} onEdit={handleEdit} />
          ))
        )}
      </ScrollView>

      <Modal visible={!!editingCourse} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.loginHeader}>Edit Course</Text>
              <Text style={styles.loginSubheader}>{editingCourse?.title}</Text>

              <Text style={styles.label}>Select Lecturer</Text>
              <View style={styles.chipContainer}>
                <LecturerChip 
                  label="None" 
                  selected={!selectedLecturerId} 
                  onPress={() => setSelectedLecturerId(null)} 
                />
                {lecturers.map((l) => (
                  <LecturerChip
                    key={l.id}
                    label={l.full_name}
                    selected={selectedLecturerId === l.id}
                    onPress={() => setSelectedLecturerId(l.id)}
                  />
                ))}
              </View>

              <Text style={styles.label}>Manage Time Slots</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="e.g. 10:30 AM"
                  placeholderTextColor="#A0AEC0"
                  value={newSlot}
                  onChangeText={setNewSlot}
                />
                <TouchableOpacity 
                  style={styles.addSlotBtn} 
                  onPress={() => {
                    if(newSlot.trim()) { setSlots([...slots, newSlot.trim()]); setNewSlot(""); }
                  }}
                >
                  <Text style={styles.buttonText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.slotsWrapper}>
                {slots.map((s, i) => (
                  <SlotBadge key={i} slot={s} onRemove={() => setSlots(slots.filter((_, idx) => idx !== i))} />
                ))}
              </View>

              <TouchableOpacity style={styles.button} onPress={handleSave}>
                <Text style={styles.buttonText}>SAVE CHANGES</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkContainer} onPress={() => setEditingCourse(null)}>
                <Text style={styles.linkBold}>CANCEL</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  scrollContainer: {
    padding: 25,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 35,
  },
  universityName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1A202C",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: "#1A202C",
    marginTop: 12,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#718096",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A202C",
  },
  courseSubtitle: {
    fontSize: 12,
    color: "#718096",
    marginTop: 4,
  },
  miniButton: {
    backgroundColor: "#1A202C",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  miniButtonText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26, 32, 44, 0.8)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 4,
    padding: 25,
    maxHeight: "80%",
  },
  loginHeader: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A202C",
  },
  loginSubheader: {
    fontSize: 14,
    color: "#718096",
    marginTop: 6,
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4A5568",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 1,
    marginTop: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 15,
    backgroundColor: "#F8FAFC",
    borderRadius: 4,
    marginBottom: 15,
    color: "#1A202C"
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addSlotBtn: {
    backgroundColor: "#1A202C",
    width: 50,
    height: 50,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#1A202C",
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
    borderRadius: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
  },
  chipSelected: {
    backgroundColor: "#1A202C",
    borderColor: "#1A202C",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4A5568",
  },
  chipTextSelected: {
    color: "#FFF",
  },
  slotsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 15,
    gap: 8,
  },
  slotBadge: {
    flexDirection: "row",
    backgroundColor: "#EDF2F7",
    paddingLeft: 10,
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  slotText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2D3748",
  },
  deleteSlotBtn: {
    padding: 8,
    marginLeft: 5,
  },
  deleteSlotText: {
    fontSize: 10,
    color: "#E53E3E",
    fontWeight: "700"
  },
  linkContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  linkBold: {
    color: "#E53E3E",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
  },
  emptyText: {
    textAlign: "center",
    color: "#A0AEC0",
    marginTop: 40,
  },
});