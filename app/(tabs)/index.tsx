import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { enroll, getCourses } from "../../src/supabase/services/courses";
import { supabase } from "../../src/supabase/supabaseClient";

export default function CoursesList() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      setLoading(true);
      const data = await getCourses();
      setCourses(data || []);
    } catch (error) {
      console.error("Loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  // ??????? ??????
  async function handleSignOut() {
  try {
    console.log("Logout button pressed");

    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Logout error", error.message);
      return;
    }

    // ??????????????? ?? login
    router.replace("/(auth)/login");

  } catch (err) {
    console.error("Logout failed:", err);
  }
}

  
  async function handleEnroll(courseId: string) {
    const { data } = await supabase.auth.getUser();
    if (!data?.user?.id) {
      alert("Please log in to enroll.");
      return;
    }
    setEnrolling(courseId);
    try {
      await enroll(courseId, data.user.id);
      alert("Enrolled successfully!");
    } catch (e) {
      alert("Enrollment failed.");
    } finally {
      setEnrolling(null);
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
    <SafeAreaView style={styles.mainContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Courses</Text>
        {/* ?????? LOGOUT */}
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {courses.map((course, idx) => (
          <View key={course.id ?? idx} style={styles.courseCard}>
            <Text style={styles.title}>{course.title}</Text>
            <TouchableOpacity
              style={[styles.button, enrolling === course.id && styles.buttonDisabled]}
              onPress={() => handleEnroll(course.id)}
              disabled={enrolling === course.id}
            >
              {enrolling === course.id
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Enroll</Text>
              }
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1a1a1a" },
  logoutButton: { padding: 8, borderRadius: 8, backgroundColor: '#fff0f0' },
  logoutText: { color: '#FF3B30', fontWeight: '600' },
  contentContainer: { padding: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  courseCard: { 
    backgroundColor: "#fff", 
    marginBottom: 16, 
    borderRadius: 12, 
    padding: 20, 
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 15 },
  button: { backgroundColor: "#007AFF", padding: 14, borderRadius: 10, alignItems: "center" },
  buttonDisabled: { backgroundColor: "#b0c4de" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});