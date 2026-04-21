import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../src/supabase/supabaseClient';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // ????????????? ??????
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    // ?????? ???????????????
    if (!session && !inAuthGroup) {
      // ???? ?? ?????????, ????????????? ?? ?????
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // ???? ?????????, ????????????? ?? ?????
      router.replace('/(tabs)');
    }
  }, [session, segments, isReady]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* ????????? ?????? ????, ????? ?????? "No route named" ??????? */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}