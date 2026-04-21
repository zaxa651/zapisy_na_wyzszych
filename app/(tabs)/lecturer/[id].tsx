import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLecturerProfile } from "../../hooks/useLecturerProfile";

// --- Sub-components (?????? ? ?????? ?? ???????) ---

const Avatar = ({ uri, canEdit }: { uri?: string; canEdit: boolean }) => (
  <View style={styles.avatarFrame}>
    <Image
      source={{ uri: uri || "https://via.placeholder.com/400" }}
      style={styles.avatarImage}
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
      <View style={styles.editorWrapper}>
        <TextInput
          value={value}
          onChangeText={onChange}
          style={styles.modernInput}
          multiline
          placeholder="Describe professional experience..."
          placeholderTextColor="#94A3B8"
        />
        <TouchableOpacity style={styles.saveActionButton} onPress={onSave}>
          <Text style={styles.saveActionButtonText}>SAVE PROFILE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.bioContainer}>
      <Text style={styles.bioParagraph}>
        {bio || "This academic profile awaits a professional description."}
      </Text>
      {canEdit && (
        <TouchableOpacity style={styles.editGhostButton} onPress={onStartEdit}>
          <Text style={styles.editGhostButtonText}>EDIT BIOGRAPHY</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// --- Main Screen ---

export default function LecturerProfileScreen() {
  const params = useLocalSearchParams();
  const lecturerId = Array.isArray(params.id) ? params.id[0] : (params.id ?? null);

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

  if (loading) return (
    <View style={styles.fullCenter}><ActivityIndicator size="large" color="#4F46E5" /></View>
  );
  
  if (!lecturer) return (
    <View style={styles.fullCenter}><Text style={styles.errorText}>Profile Not Found</Text></View>
  );

  return (
    <View style={styles.mainWrapper}>
      <Stack.Screen options={{ title: lecturer.full_name, headerShown: false }} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HERO HEADER */}
        <LinearGradient
          colors={["#0F172A", "#1E293B"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroBackground}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}><Text style={styles.brandBadgeText}>ZW</Text></View>
            <Text style={styles.brandName}>Zapisy na wyzszych</Text>
          </View>
        </LinearGradient>

        <View style={styles.contentContainer}>
          <View style={styles.profileFloatingCard}>
            
            {/* SIDEBAR */}
            <View style={styles.sidebar}>
              <Avatar uri={lecturer.avatar_url} canEdit={canEdit} />
              
              <View style={styles.identityBlock}>
                <Text style={styles.lecturerName}>{lecturer.full_name}</Text>
                <View style={styles.tagContainer}>
                  <Text style={styles.tagText}>{lecturer.academic_title || "FACULTY"}</Text>
                </View>
              </View>

              {canEdit && (
                <TouchableOpacity style={styles.uploadBtn} onPress={uploadAvatar}>
                  <Text style={styles.uploadBtnText}>UPDATE PHOTO</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* MAIN CONTENT */}
            <View style={styles.mainContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PROFESSIONAL SYNOPSIS</Text>
                <View style={styles.underline} />
              </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#F1F5F9" },
  fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  
  heroBackground: {
    height: 200,
    padding: 30,
    paddingTop: 50,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandBadge: { 
    width: 44, height: 32, backgroundColor: '#4F46E5', 
    borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 12 
  },
  brandBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  brandName: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },

  contentContainer: {
    paddingHorizontal: 20,
    marginTop: -70,
    paddingBottom: 40,
  },
  profileFloatingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  
  sidebar: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    padding: 35,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  avatarFrame: {
    width: 160,
    height: 160,
    borderRadius: 80,
    padding: 4,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 80 },
  identityBlock: { alignItems: 'center', marginBottom: 25 },
  lecturerName: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  tagContainer: { 
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, 
    backgroundColor: '#EEF2FF', borderRadius: 4 
  },
  tagText: { color: '#4F46E5', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  uploadBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  uploadBtnText: { fontSize: 10, fontWeight: '700', color: '#64748B' },

  mainContent: { flex: 2, padding: 40, minHeight: 400 },
  sectionHeader: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
  underline: { width: 30, height: 3, backgroundColor: '#4F46E5', marginTop: 8 },
  
  bioParagraph: { fontSize: 15, lineHeight: 26, color: '#334155', marginBottom: 30 },
  editGhostButton: { alignSelf: 'flex-start', paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: '#4F46E5' },
  editGhostButtonText: { color: '#0F172A', fontWeight: '800', fontSize: 11 },

  editorWrapper: { width: '100%' },
  modernInput: {
    backgroundColor: '#F8FAFC', borderRadius: 8, padding: 15,
    fontSize: 15, color: '#334155', borderWidth: 1, borderColor: '#E2E8F0',
    minHeight: 250, textAlignVertical: 'top', marginBottom: 20
  },
  saveActionButton: { backgroundColor: '#0F172A', padding: 16, borderRadius: 8, alignItems: 'center' },
  saveActionButtonText: { color: '#FFF', fontWeight: '800', fontSize: 12, letterSpacing: 1 },

  bioContainer: { width: '100%' },
  errorText: { color: '#94A3B8', fontWeight: '600' }
});