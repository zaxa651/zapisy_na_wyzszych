import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../src/supabase/supabaseClient";

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
    lecturerId = Array.isArray(params.id) ? params.id[0] : params.id;
  }

  const [lecturer, setLecturer] = useState<LecturerFull | null>(null);
  const [loading, setLoading] = useState(true);

  // 👇 нове
  const [userId, setUserId] = useState<string | null>(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();

        setRole(profile?.role || null);
      }
    });
  }, []);

  const isOwner = userId === lecturerId;
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!lecturerId) {
      setLoading(false);
      return;
    }

    async function loadLecturer() {
      try {
        setLoading(true);

        const { data: lectData } = await supabase
          .from("lecturers")
          .select("*")
          .eq("id", lecturerId)
          .maybeSingle();

        let profileData = null;

        if (lectData) {
          const userId = lectData.user_id || lectData.id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

          profileData = profile;
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", lecturerId)
            .maybeSingle();

          profileData = profile;
        }

        if (lectData || profileData) {
          const lecturerData: LecturerFull = {
            id: lecturerId,
            full_name:
              lectData?.full_name ||
              lectData?.name ||
              profileData?.full_name ||
              "Без имени",
            avatar_url:
              lectData?.avatar_url || profileData?.avatar_url || undefined,
            academic_title: lectData?.academic_title || undefined,
            bio: lectData?.bio || undefined,
          };

          setLecturer(lecturerData);
          setBioInput(lecturerData.bio || "");
        } else {
          setLecturer(null);
        }
      } catch (error) {
        console.error(error);
        setLecturer(null);
      } finally {
        setLoading(false);
      }
    }

    loadLecturer();
  }, [lecturerId]);

  // 📸 upload avatar
  const pickAndUploadAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const fileName = `${lecturerId}-${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, decode(file.base64!), {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

      const publicUrl = data.publicUrl;

      await supabase
        .from("lecturers")
        .update({ avatar_url: publicUrl })
        .eq("id", lecturerId);

      setLecturer((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    } catch (e) {
      console.error(e);
    }
  };

  // ✏️ update bio
  const saveBio = async () => {
    try {
      await supabase
        .from("lecturers")
        .update({ bio: bioInput })
        .eq("id", lecturerId);

      setLecturer((prev) => (prev ? { ...prev, bio: bioInput } : prev));

      setEditingBio(false);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5856D6" />
      </View>
    );
  }

  if (!lecturer) {
    return (
      <View style={styles.center}>
        <Text>Преподаватель не найден</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: lecturer.full_name }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Image
          source={{
            uri: lecturer.avatar_url || "https://via.placeholder.com/400",
          }}
          style={styles.avatar}
        />

        <Text style={styles.name}>{lecturer.full_name}</Text>

        {lecturer.academic_title && (
          <Text style={styles.title}>{lecturer.academic_title}</Text>
        )}

        {/* BIO */}
        {editingBio ? (
          <>
            <TextInput
              value={bioInput}
              onChangeText={setBioInput}
              style={styles.input}
              multiline
            />
            <TouchableOpacity style={styles.button} onPress={saveBio}>
              <Text style={styles.buttonText}>Зберегти</Text>
            </TouchableOpacity>
          </>
        ) : (
          lecturer.bio && <Text style={styles.bioText}>{lecturer.bio}</Text>
        )}

        {/* КНОПКИ */}
        {(isOwner || isAdmin) && (
          <View style={{ width: "100%", marginTop: 20 }}>
            <TouchableOpacity
              style={styles.button}
              onPress={pickAndUploadAvatar}
            >
              <Text style={styles.buttonText}>Змінити аватар</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => setEditingBio(true)}
            >
              <Text style={styles.buttonText}>Змінити опис</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
  },
  title: {
    color: "#5856D6",
    marginBottom: 20,
  },
  bioText: {
    textAlign: "center",
  },
  button: {
    backgroundColor: "#5856D6",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    width: "100%",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
});
