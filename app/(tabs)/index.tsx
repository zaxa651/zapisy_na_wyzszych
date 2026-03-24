import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../src/supabase/supabaseClient';

export default function CoursesScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Admin Access States
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const ADMIN_SECRET = "1234"; 

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    setLoading(true);
    // ??????????? ????? ?????? ? ??????? ???????? ????? ????? lecturer_id
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        lecturers (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      Alert.alert("Error", "Could not fetch courses");
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const handleAdminAccess = () => {
    if (adminPassword === ADMIN_SECRET) {
      setAdminModalVisible(false);
      setAdminPassword('');
      router.push('/admin'); 
    } else {
      Alert.alert("Access Denied", "Incorrect password");
    }
  };

  // ???? ??????????? ?????? ???????? ?????
  const renderCourseItem = ({ item }: { item: any }) => (
    <View style={styles.courseCard}>
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        <Text style={styles.courseDescription}>{item.description}</Text>
        
        {/* ?????????? ???????, ???? ?? ???????? ? ?? */}
        {item.lecturers?.name && (
          <View style={styles.lecturerBadge}>
            <Text style={styles.lecturerText}>Teacher: {item.lecturers.name}</Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.enrollBtn} 
        onPress={() => Alert.alert("Registration", `Sign up for ${item.title}?`)}
      >
        <Text style={styles.enrollBtnText}>Enroll Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER ? ??????? Admin */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Courses</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => setAdminModalVisible(true)} 
            style={styles.adminBtn}
          >
            <Text style={styles.adminBtnText}>Admin</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Exit</Text>
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
          ListEmptyComponent={<Text style={styles.emptyText}>No courses available.</Text>}
        />
      )}

      {/* MODAL ??? ?????? ?????? */}
      <Modal
        visible={adminModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Admin Access</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              secureTextEntry
              value={adminPassword}
              onChangeText={setAdminPassword}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => { setAdminModalVisible(false); setAdminPassword(''); }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.loginBtn} 
                onPress={handleAdminAccess}
              >
                <Text style={{color: '#fff', fontWeight: 'bold'}}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  adminBtn: { backgroundColor: '#5856D6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, marginRight: 15 },
  adminBtnText: { color: '#fff', fontWeight: 'bold' },
  logoutBtn: { padding: 5 },
  logoutBtnText: { color: '#FF3B30', fontSize: 16 },
  listContent: { padding: 20 },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  courseInfo: { marginBottom: 20 },
  courseTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  courseDescription: { fontSize: 15, color: '#666', lineHeight: 22 },
  lecturerBadge: { marginTop: 12, backgroundColor: '#F2F2F7', padding: 8, borderRadius: 8, alignSelf: 'flex-start' },
  lecturerText: { color: '#5856D6', fontWeight: '600', fontSize: 13 },
  enrollBtn: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  enrollBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  passwordInput: { backgroundColor: '#F2F2F7', padding: 15, borderRadius: 10, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { flex: 0.45, padding: 15, alignItems: 'center', backgroundColor: '#E5E5EA', borderRadius: 10 },
  loginBtn: { flex: 0.45, padding: 15, alignItems: 'center', backgroundColor: '#007AFF', borderRadius: 10 }
});