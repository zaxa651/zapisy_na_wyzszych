import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
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
import { useLecturerProfile } from "../../hooks/useLecturerProfile";

// ─── Sub-components ──────────────────────────────────────────────────────────

const Avatar = ({ uri, canEdit }: { uri?: string; canEdit: boolean }) => (
  <View>
    <Image
      source={{ uri: uri || "https://via.placeholder.com/400" }}
      style={styles.avatar}
    />
  </View>
);

const BioSection = ({
  bio,
  editing,
  value,
  onChange,
  onSave,
  onStartEdit,
  canEdit,
}: {
  bio?: string;
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onStartEdit: () => void;
  canEdit: boolean;
}) => {
  if (editing) {
    return (
      <>
        <TextInput
          value={value}
          onChangeText={onChange}
          style={styles.input}
          multiline
          placeholder="Tell us about yourself..."
          placeholderTextColor="#A9A9A9"
        />
        <TouchableOpacity style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <>
      {bio ? (
        <Text style={styles.bioText}>{bio}</Text>
      ) : (
        canEdit && <Text style={styles.emptyBio}>Description not added</Text>
      )}
      {canEdit && (
        <TouchableOpacity style={styles.button} onPress={onStartEdit}>
          <Text style={styles.buttonText}>Edit description</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

// ─── Screens ─────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#5856D6" />
    </View>
  );
}

function NotFoundScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.notFoundText}>Instructor not found</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LecturerProfileScreen() {
  const params = useLocalSearchParams();
  const lecturerId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id ?? null);

  const {
    lecturer,
    loading,
    isOwner,
    isAdmin,
    bioInput,
    setBioInput,
    editingBio,
    setEditingBio,
    uploadAvatar,
    saveBio,
  } = useLecturerProfile(lecturerId);

  const canEdit = isOwner || isAdmin;

  if (loading) return <LoadingScreen />;
  if (!lecturer) return <NotFoundScreen />;

  return (
    <>
      <Stack.Screen options={{ title: lecturer.full_name }} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.layout}>
          {/* LEFT COLUMN */}
          <View style={styles.leftColumn}>
            {/* AVATAR CARD */}
            <View style={styles.squareCard}>
              <Avatar uri={lecturer.avatar_url} canEdit={canEdit} />
            </View>

            {/* NAME CARD */}
            <View style={styles.squareCard}>
              <Text style={styles.name}>{lecturer.full_name}</Text>

              {!!lecturer.academic_title && (
                <Text style={styles.academicTitle}>
                  {lecturer.academic_title}
                </Text>
              )}

              {canEdit && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={uploadAvatar}
                >
                  <Text style={styles.secondaryButtonText}>Change avatar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* RIGHT COLUMN */}
          <View style={styles.rightColumn}>
            <View style={styles.bioCard}>
              <Text style={styles.sectionTitle}>About the lecturer</Text>

              <BioSection
                bio={lecturer.bio}
                editing={editingBio}
                value={bioInput}
                onChange={setBioInput}
                onSave={saveBio}
                onStartEdit={() => setEditingBio(true)}
                canEdit={canEdit}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
  },

  // ─── LAYOUT ─────────────────────────
  layout: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 900,
    gap: 12,
  },

  leftColumn: {
    flex: 1,
    gap: 12,
  },

  rightColumn: {
    flex: 1.5,
  },

  squareCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    aspectRatio: 1, // квадрат
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  // ─── BIO CARD ───────────────────────
  bioCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    minHeight: 400,

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#1C1C1E",
  },

  // ─── AVATAR ────────────────────────
  avatar: {
    width: 300,
    height: 300,
    borderRadius: 12,
  },

  avatarOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#5856D6",
    borderRadius: 16,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarOverlayText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // ─── TEXT ──────────────────────────
  name: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#111",
  },

  academicTitle: {
    color: "#5856D6",
    marginTop: 6,
    fontSize: 14,
    textAlign: "center",
  },

  // ─── BIO ───────────────────────────
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#3A3A3C",
  },

  emptyBio: {
    color: "#A1A1A1",
    fontSize: 14,
    fontStyle: "italic",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 12,
    padding: 12,
    minHeight: 300,
    textAlignVertical: "top",
    fontSize: 15,
    backgroundColor: "#FAFAFA",
  },

  // ─── BUTTONS ───────────────────────
  button: {
    backgroundColor: "#5856D6",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 12,
    alignSelf: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  secondaryButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5856D6",
    backgroundColor: "#5856D6",
    alignSelf: "center",
  },

  secondaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  // ─── STATES ────────────────────────
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  notFoundText: {
    fontSize: 16,
    color: "#8E8E93",
  },
});
