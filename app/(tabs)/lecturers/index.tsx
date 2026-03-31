import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { supabase } from '../../../src/supabase/supabaseClient';
import LecturerCard from '../../components/LecturerCard';

type Lecturer = {
  id: string;
  full_name: string;
  avatar_url?: string;
  academic_title?: string;
  bio?: string;
};

export default function LecturersListScreen() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLecturers = async () => {
    try {
      setLoading(true);
      console.log("📚 Загружаем список преподавателей...");
      
      // Получаем данные из lecturers
      const { data: lecturersData, error: lecturersError } = await supabase
        .from('lecturers')
        .select('*');
      
      if (lecturersError) {
        console.error("Ошибка загрузки lecturers:", lecturersError);
        throw lecturersError;
      }
      
      console.log("Данные из lecturers:", lecturersData);
      
      let formattedLecturers: Lecturer[] = [];
      
      if (lecturersData && lecturersData.length > 0) {
        // Для каждого преподавателя получаем данные из profiles
        for (const lecturer of lecturersData) {
          // Получаем профиль по user_id или id
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', lecturer.user_id || lecturer.id)
            .single();
          
          formattedLecturers.push({
            id: lecturer.id,
            full_name: profileData?.full_name || lecturer.name || 'Без имени',
            avatar_url: lecturer.avatar_url || profileData?.avatar_url,
            academic_title: lecturer.academic_title,
            bio: lecturer.bio,
          });
        }
        
        console.log(`✅ Загружено ${formattedLecturers.length} преподавателей`);
      } else {
        // Если в lecturers нет данных, ищем в profiles с ролью lecturer
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'lecturer');
        
        if (profilesError) {
          console.error("Ошибка загрузки profiles:", profilesError);
          throw profilesError;
        }
        
        if (profilesData && profilesData.length > 0) {
          formattedLecturers = profilesData.map(profile => ({
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            academic_title: undefined,
            bio: undefined,
          }));
          console.log(`✅ Загружено ${formattedLecturers.length} преподавателей из profiles`);
        }
      }
      
      setLecturers(formattedLecturers);
      
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
      setLecturers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLecturers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLecturers();
  };

  const renderLecturerCard = ({ item }: { item: Lecturer }) => (
    <LecturerCard lecturer={item} />
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5856D6" />
        <Text style={styles.loadingText}>Загрузка преподавателей...</Text>
      </View>
    );
  }

  if (lecturers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>Нет преподавателей</Text>
        <Text style={styles.emptyText}>
          В базе данных пока нет зарегистрированных преподавателей.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lecturers}
        renderItem={renderLecturerCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#5856D6']}
            tintColor="#5856D6"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});