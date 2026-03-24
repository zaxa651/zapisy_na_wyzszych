import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/supabase/supabaseClient';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !fullName) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    
    // 1. ??????? ???????????? ? Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName } // ??? ?????? ??????????? ? ?????????? ????????????
      }
    });

    if (signUpError) {
      Alert.alert("Error", signUpError.message);
      setLoading(false);
      return;
    }

    // 2. ????????? ?????? ? ???? ??????? public.profiles
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: data.user.id, 
            email: email, 
            full_name: fullName 
          }
        ]);

      if (profileError) {
        console.error("Profile creation error:", profileError.message);
      } else {
        Alert.alert("Success", "Account created! Please check your email for confirmation.");
        router.replace('/(auth)/login');
      }
    }
    
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        
        <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        
        <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Register'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
  onPress={() => router.replace('/(auth)/login')} // ?????????? ?????? ???? ? replace
  style={styles.linkContainer}
>
  <Text style={styles.linkText}>
    Already have an account? <Text style={styles.linkBold}>Log In</Text>
  </Text>
</TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ????? ????? ??, ??? ? Login (??? ???????? ???????)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', padding: 30, borderRadius: 20, elevation: 5 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  input: { backgroundColor: '#f1f3f5', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#e9ecef' },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkContainer: { marginTop: 25, alignItems: 'center', padding: 10 },
  linkText: { color: '#666', fontSize: 15 },
  linkBold: { color: '#007AFF', fontWeight: 'bold' }
});