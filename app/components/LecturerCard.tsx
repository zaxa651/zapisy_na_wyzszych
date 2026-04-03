import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../src/supabase/supabaseClient";

interface LecturerProps {
  lecturer: {
    id: string;
    full_name?: string;
    avatar_url?: string; // Тут ми очікуємо шлях до файлу в бакеті, напр. "avatar1.png"
    academic_title?: string;
    bio?: string;
  };
}

export default function LecturerCard({ lecturer }: LecturerProps) {
  const router = useRouter();

  const getAvatarUrl = (path?: string) => {
    // Якщо фото немає взагалі — повертаємо заглушку
    if (!path) return "https://via.placeholder.com/100";

    // Якщо шлях уже є повним посиланням (починається з http)
    if (path.startsWith("http")) return path;

    // Створюємо пряме посилання на файл у твоєму бакеті 'avatars'
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);

    return data.publicUrl;
  };

  const handlePress = () => {
    if (!lecturer?.id) {
      console.error("ID лектора не знайдено!");
      return;
    }

    // Зверни увагу: у твоїй структурі папка називається 'lecturer' (в однині)
    // тому шлях має бути /(tabs)/lecturer/[id]
    router.push({
      pathname: "/(tabs)/lecturer/[id]",
      params: { id: lecturer.id },
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getAvatarUrl(lecturer?.avatar_url) }} // МАЄ БУТИ ТАК
        style={styles.avatar}
      />

      <View style={styles.info}>
        {!!lecturer?.academic_title && (
          <Text style={styles.title}>{lecturer.academic_title}</Text>
        )}
        <Text style={styles.name}>{lecturer?.full_name || "Без імені"}</Text>

        {!!lecturer?.bio && (
          <Text numberOfLines={2} style={styles.bio}>
            {lecturer.bio}
          </Text>
        )}
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#F0EEFF",
    padding: 14,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 12,
    // Додамо трохи тіні для об'єму
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E5E5EA",
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 11,
    fontWeight: "800",
    color: "#5856D6",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1E",
  },
  bio: {
    fontSize: 13,
    color: "#636366",
    marginTop: 4,
    lineHeight: 18,
  },
  chevron: {
    color: "#C7C7CC",
    fontSize: 28,
    marginLeft: 8,
    fontWeight: "300",
  },
});
