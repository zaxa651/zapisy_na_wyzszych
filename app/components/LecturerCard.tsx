import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../src/supabase/supabaseClient";

interface LecturerProps {
  lecturer: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    academic_title?: string;
  };
}

export default function LecturerCard({ lecturer }: LecturerProps) {
  const router = useRouter();

  const getAvatarUrl = (path?: string) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePress = () => {
    if (!lecturer?.id) return;
    router.push({
      pathname: "/(tabs)/lecturer/[id]",
      params: { id: lecturer.id },
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: getAvatarUrl(lecturer?.avatar_url) }}
          style={styles.avatar}
          resizeMode="cover"
        />
      </View>

      <View style={styles.info}>
        {!!lecturer?.academic_title && (
          <Text style={styles.title} numberOfLines={1}>
            {lecturer.academic_title}
          </Text>
        )}
        <Text style={styles.name} numberOfLines={2}>
          {lecturer?.full_name || "No Name"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // ????? ????? ?? ?????? ????
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    
    // ????? ???????? ????, ????? ???????? "?????????" ??? ?????
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,

    // ?????? ?????
    borderWidth: 1,
    borderColor: "#E2E8F0", 
  },

  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    marginBottom: 10,
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  info: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 4,
  },

  title: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4F46E5", // Indigo ??????
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  name: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    lineHeight: 16,
  },
});