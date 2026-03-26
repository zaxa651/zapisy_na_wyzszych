import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../src/supabase/supabaseClient';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'lecturer' | 'admin'>('student'); // по умолчанию студент
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !fullName) {
      Alert.alert("Ошибка", "Заполните все поля");
      return;
    }

    setLoading(true);
    
    // 1. Создаём пользователя в Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (signUpError) {
      Alert.alert("Ошибка", signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Создаём запись в public.profiles с выбранной ролью
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: data.user.id, 
            email: email, 
            full_name: fullName,
            role: selectedRole   // ← сохраняем выбранную роль
          }
        ]);

      if (profileError) {
        console.error("Profile creation error:", profileError.message);
        Alert.alert("Ошибка", "Не удалось создать профиль");
      } else {
        Alert.alert("Готово!", "Аккаунт создан!\nПроверьте почту для подтверждения.");
        router.replace('/(auth)/login');
      }
    }
    
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Создать аккаунт</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder="ФИО" 
          value={fullName} 
          onChangeText={setFullName} 
        />
        
        {/* === ВЫБОР РОЛИ === */}
        <Text style={styles.roleLabel}>Кем вы являетесь?</Text>
        
        <View style={styles.roleOptions}>
          {/* Студент (по умолчанию с галочкой) */}
          <TouchableOpacity
            style={[
              styles.roleOption,
              selectedRole === 'student' && styles.roleOptionSelected
            ]}
            onPress={() => setSelectedRole('student')}
          >
            <Text style={styles.roleEmoji}>👨‍🎓</Text>
            <Text style={styles.roleText}>Студент</Text>
            {selectedRole === 'student' && <Text style={styles.check}>✅</Text>}
          </TouchableOpacity>

          {/* Преподаватель */}
          <TouchableOpacity
            style={[
              styles.roleOption,
              selectedRole === 'lecturer' && styles.roleOptionSelected
            ]}
            onPress={() => setSelectedRole('lecturer')}
          >
            <Text style={styles.roleEmoji}>👨‍🏫</Text>
            <Text style={styles.roleText}>Преподаватель</Text>
            {selectedRole === 'lecturer' && <Text style={styles.check}>✅</Text>}
          </TouchableOpacity>

        </View>

        <TextInput 
          style={styles.input} 
          placeholder="Email" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none" 
          keyboardType="email-address"
        />
        
        <TextInput 
          style={styles.input} 
          placeholder="Пароль" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
        />
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSignUp} 
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.replace('/(auth)/login')}
          style={styles.linkContainer}
        >
          <Text style={styles.linkText}>
            Уже есть аккаунт? <Text style={styles.linkBold}>Войти</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa', 
    justifyContent: 'center', 
    padding: 20 
  },
  card: { 
    backgroundColor: '#fff', 
    padding: 30, 
    borderRadius: 20, 
    elevation: 5 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 25, 
    textAlign: 'center' 
  },
  input: { 
    backgroundColor: '#f1f3f5', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 15, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: '#e9ecef' 
  },
  
  // === Стили для выбора роли ===
  roleLabel: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 12 
  },
  roleOptions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  roleOption: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  roleEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 18,
  },
  
  button: { 
    backgroundColor: '#007AFF', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  linkContainer: { 
    marginTop: 25, 
    alignItems: 'center', 
    padding: 10 
  },
  linkText: { 
    color: '#666', 
    fontSize: 15 
  },
  linkBold: { 
    color: '#007AFF', 
    fontWeight: 'bold' 
  }
});