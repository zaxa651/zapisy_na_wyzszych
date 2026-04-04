import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLecturerProfile } from '../../hooks/useLecturerProfile';

// ─── Sub-components ──────────────────────────────────────────────────────────

const Avatar = ({
  uri,
  onPress,
  canEdit,
}: {
  uri?: string;
  onPress: () => void;
  canEdit: boolean;
}) => (
  <TouchableOpacity onPress={canEdit ? onPress : undefined} disabled={!canEdit}>
    <Image
      source={{ uri: uri || 'https://via.placeholder.com/400' }}
      style={styles.avatar}
    />
    {canEdit && (
      <View style={styles.avatarOverlay}>
        <Text style={styles.avatarOverlayText}>✎</Text>
      </View>
    )}
  </TouchableOpacity>
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
          placeholder="Расскажите о себе..."
          placeholderTextColor="#A9A9A9"
        />
        <TouchableOpacity style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>Сохранить</Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <>
      {bio ? (
        <Text style={styles.bioText}>{bio}</Text>
      ) : (
        canEdit && <Text style={styles.emptyBio}>Описание не добавлено</Text>
      )}
      {canEdit && (
        <TouchableOpacity style={styles.button} onPress={onStartEdit}>
          <Text style={styles.buttonText}>Изменить описание</Text>
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
      <Text style={styles.notFoundText}>Преподаватель не найден</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

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

  if (loading) return <LoadingScreen />;
  if (!lecturer) return <NotFoundScreen />;

  return (
    <>
      <Stack.Screen options={{ title: lecturer.full_name }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Avatar
          uri={lecturer.avatar_url}
          onPress={uploadAvatar}
          canEdit={canEdit}
        />

        <Text style={styles.name}>{lecturer.full_name}</Text>

        {!!lecturer.academic_title && (
          <Text style={styles.academicTitle}>{lecturer.academic_title}</Text>
        )}

        <BioSection
          bio={lecturer.bio}
          editing={editingBio}
          value={bioInput}
          onChange={setBioInput}
          onSave={saveBio}
          onStartEdit={() => setEditingBio(true)}
          canEdit={canEdit}
        />

        {canEdit && !editingBio && (
          <TouchableOpacity
            style={[styles.button, styles.avatarBtn]}
            onPress={uploadAvatar}
          >
            <Text style={styles.buttonText}>Изменить аватар</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:          { padding: 20, backgroundColor: '#fff', alignItems: 'center' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText:       { fontSize: 16, color: '#8E8E93' },
  avatar:             { width: 150, height: 150, borderRadius: 75, marginBottom: 4 },
  avatarOverlay:      { position: 'absolute', bottom: 8, right: 0, backgroundColor: '#5856D6', borderRadius: 14, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  avatarOverlayText:  { color: '#fff', fontSize: 14 },
  name:               { fontSize: 28, fontWeight: 'bold', marginTop: 12, textAlign: 'center' },
  academicTitle:      { color: '#5856D6', marginBottom: 20, marginTop: 4, fontSize: 15 },
  bioText:            { textAlign: 'center', color: '#3A3A3C', lineHeight: 22, marginBottom: 12 },
  emptyBio:           { color: '#C7C7CC', fontSize: 14, marginBottom: 12 },
  button:             { backgroundColor: '#5856D6', padding: 14, borderRadius: 10, marginTop: 10, alignItems: 'center', width: '100%' },
  avatarBtn:          { marginTop: 6 },
  buttonText:         { color: '#fff', fontWeight: '600', fontSize: 16 },
  input:              { borderWidth: 1, borderColor: '#ccc', width: '100%', borderRadius: 10, padding: 10, marginTop: 10, minHeight: 100, textAlignVertical: 'top', fontSize: 15 },
});