import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../src/supabase/supabaseClient';

export interface LecturerFull {
  id: string;
  full_name: string;
  avatar_url?: string;
  academic_title?: string;
  bio?: string;
}

async function fetchLecturerById(lecturerId: string): Promise<LecturerFull | null> {
  const { data: lectData } = await supabase
    .from('lecturers')
    .select('*')
    .eq('id', lecturerId)
    .maybeSingle();

  let profileData = null;

  if (lectData) {
    const profileId = lectData.user_id || lectData.id;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();
    profileData = data;
  } else {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', lecturerId)
      .maybeSingle();
    profileData = data;
  }

  if (!lectData && !profileData) return null;

  return {
    id: lecturerId,
    full_name:
      lectData?.full_name ?? lectData?.name ?? profileData?.full_name ?? 'Без имени',
    avatar_url: lectData?.avatar_url ?? profileData?.avatar_url ?? undefined,
    academic_title: lectData?.academic_title ?? undefined,
    bio: lectData?.bio ?? undefined,
  };
}

export function useLecturerProfile(lecturerId: string | null) {
  const [lecturer, setLecturer] = useState<LecturerFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [bioInput, setBioInput] = useState('');
  const [editingBio, setEditingBio] = useState(false);

  // Fetch current user + role
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .single();

      setRole(profile?.role ?? null);
    });
  }, []);

  // Fetch lecturer data
  useEffect(() => {
    if (!lecturerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchLecturerById(lecturerId)
      .then(data => {
        setLecturer(data);
        setBioInput(data?.bio ?? '');
      })
      .catch(err => {
        console.error('loadLecturer error:', err);
        setLecturer(null);
      })
      .finally(() => setLoading(false));
  }, [lecturerId]);

  const uploadAvatar = useCallback(async (): Promise<void> => {
    if (!lecturerId) return;
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
        .from('avatars')
        .upload(fileName, decode(file.base64!), {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('lecturers').update({ avatar_url: data.publicUrl }).eq('id', lecturerId);
      setLecturer(prev => prev ? { ...prev, avatar_url: data.publicUrl } : prev);
    } catch (e) {
      console.error('uploadAvatar error:', e);
    }
  }, [lecturerId]);

  const saveBio = useCallback(async (): Promise<void> => {
    if (!lecturerId) return;
    try {
      await supabase.from('lecturers').update({ bio: bioInput }).eq('id', lecturerId);
      setLecturer(prev => prev ? { ...prev, bio: bioInput } : prev);
      setEditingBio(false);
    } catch (e) {
      console.error('saveBio error:', e);
    }
  }, [lecturerId, bioInput]);

  return {
    lecturer,
    loading,
    isOwner: userId === lecturerId,
    isAdmin: role === 'admin',
    bioInput,
    setBioInput,
    editingBio,
    setEditingBio,
    uploadAvatar,
    saveBio,
  };
}