import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { enroll, getCourses } from "../services/courses";
import { supabase } from "../supabaseClient";

export default function CoursesList() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    const data = await getCourses();
    setCourses(data || []);
    setLoading(false);
  }

  async function handleEnroll(courseId: string) {
    const { data } = await supabase.auth.getUser();
    if (!data?.user?.id) {
      console.warn("Пользователь не авторизован");
      return;
    }
    setEnrolling(courseId);
    await enroll(courseId, data.user.id);
    setEnrolling(null);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (courses.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>Курсы не найдены</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {courses.map((course, idx) => (
        <View key={course.id ?? idx} style={styles.course}>
          <Text style={styles.title}>{course.title}</Text>
          <TouchableOpacity
            style={[styles.button, enrolling === course.id && styles.buttonDisabled]}
            onPress={() => handleEnroll(course.id)}
            disabled={enrolling === course.id}
          >
            {enrolling === course.id
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Записаться</Text>
            }
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  course: { marginBottom: 15, borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8, padding: 12 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  button: { backgroundColor: "#007AFF", padding: 10, borderRadius: 5 },
  buttonDisabled: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "500" },
});