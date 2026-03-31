import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LecturerProps {
  lecturer: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    academic_title?: string;
    bio?: string;
  };
}

export default function LecturerCard({ lecturer }: LecturerProps) {
  const router = useRouter();

  const avatarUrl = lecturer?.avatar_url || 'https://via.placeholder.com/100';

  const handlePress = () => {
    if (!lecturer?.id) {
      console.error("ID лектора не найден!");
      return;
    }

    // Переходим в папку (tabs)/lecturers к файлу [id]
    router.push({
      pathname: "/(tabs)/lecturers/[id]",
      params: { id: lecturer.id }
    });
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress} 
      activeOpacity={0.7}
    >
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />

      <View style={styles.info}>
        {!!lecturer?.academic_title && (
          <Text style={styles.title}>{lecturer.academic_title}</Text>
        )}
        <Text style={styles.name}>{lecturer?.full_name || 'Без имени'}</Text>
        {!!lecturer?.bio && (
          <Text numberOfLines={2} style={styles.bio}>{lecturer.bio}</Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F0EEFF',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#DDD' },
  info: { flex: 1, marginLeft: 12 },
  title: { fontSize: 12, fontWeight: '700', color: '#5856D6', textTransform: 'uppercase' },
  name: { fontSize: 17, fontWeight: 'bold', color: '#1C1C1E' },
  bio: { fontSize: 13, color: '#666', marginTop: 4 },
  chevron: { color: '#C7C7CC', fontSize: 24, marginLeft: 8 }
});