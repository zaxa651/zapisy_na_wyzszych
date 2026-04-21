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
        source={{ uri: getAvatarUrl(lecturer?.avatar_url) }}
        style={styles.avatar}
      />

      <View style={styles.info}>
        {!!lecturer?.academic_title && (
          <Text style={styles.title}>{lecturer.academic_title}</Text>
        )}
        <Text style={styles.name} numberOfLines={1}>
          {lecturer?.full_name || "Без імені"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "31%",
    aspectRatio: 0.9,
    backgroundColor: "#e7e7e7",
    borderRadius: 20,
    padding: 12,
    margin: "1.1%",

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  avatar: {
    width: 500,
    height: 500,
    borderRadius: 10,
    backgroundColor: "#e5e5eab9",
    marginBottom: 12,
  },

  info: {
    alignItems: "center",
  },

  title: {
    fontSize: 40,
    fontWeight: "600",
    color: "#6C5CE7",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  name: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1C1C1E",
    textAlign: "center",
  },
});
