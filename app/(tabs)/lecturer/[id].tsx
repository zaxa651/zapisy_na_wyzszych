import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../../src/supabase/supabaseClient';

type LecturerFull = {
  id: string;
  full_name: string;
  avatar_url?: string;
  academic_title?: string;
  bio?: string;
};

export default function LecturerProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  let lecturerId: string | null = null;
  
  if (params.id) {
    if (Array.isArray(params.id)) {
      lecturerId = params.id[0];
    } else {
      lecturerId = params.id;
    }
  }
  
  console.log("ID преподавателя:", lecturerId);
  
  const [lecturer, setLecturer] = useState<LecturerFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lecturerId) {
      setLoading(false);
      return;
    }

    async function loadLecturer() {
      try {
        setLoading(true);
        
        // Пробуем найти в lecturers
        const { data: lectData } = await supabase
          .from('lecturers')
          .select('*')
          .eq('id', lecturerId)
          .maybeSingle();
        
        let profileData = null;
        
        if (lectData) {
          // Если нашли в lecturers, ищем профиль
          const userId = lectData.user_id || lectData.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          
          profileData = profile;
        } else {
          // Если не нашли в lecturers, ищем в profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', lecturerId)
            .maybeSingle();
          
          profileData = profile;
        }
        
        if (lectData || profileData) {
          const lecturerData: LecturerFull = {
            id: lecturerId,
            full_name: (lectData?.full_name || lectData?.name || profileData?.full_name || 'Без имени') as string,
            avatar_url: lectData?.avatar_url || profileData?.avatar_url || undefined,
            academic_title: lectData?.academic_title || undefined,
            bio: lectData?.bio || undefined,
          };
          
          setLecturer(lecturerData);
          console.log("✅ Преподаватель загружен:", lecturerData.full_name);
        } else {
          setLecturer(null);
        }
        
      } catch (error) {
        console.error("❌ Ошибка:", error);
        setLecturer(null);
      } finally {
        setLoading(false);
      }
    }
    
    loadLecturer();
  }, [lecturerId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5856D6" />
        <Text style={styles.loadingText}>Загрузка профиля...</Text>
      </View>
    );
  }

  if (!lecturer) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Преподаватель не найден</Text>
        <Text style={styles.errorSubText}>ID: {lecturerId || 'не указан'}</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Вернуться назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: lecturer.full_name }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Image 
          source={{ uri: lecturer.avatar_url || 'https://via.placeholder.com/400' }} 
          style={styles.avatar}
        />
        <Text style={styles.name}>{lecturer.full_name}</Text>
        {lecturer.academic_title && (
          <Text style={styles.title}>{lecturer.academic_title}</Text>
        )}
        {lecturer.bio && (
          <Text style={styles.bioText}>{lecturer.bio}</Text>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F2F2F7',
    marginBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    color: '#5856D6',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  bioText: {
    fontSize: 16,
    color: '#3A3A3C',
    lineHeight: 24,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});