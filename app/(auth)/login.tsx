import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../src/supabase/supabaseClient";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Required", "Please provide both email and password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) Alert.alert("Authentication Failed", error.message);
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoInitial}>ZW</Text>
            </View>
            <Text style={styles.universityName}>ZAPISY NA WYZSZYCH</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.card}>
            <Text style={styles.loginHeader}>Sign In</Text>
            <Text style={styles.loginSubheader}>Access your academic resources</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Institutional Email</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. student@university.edu"
                placeholderTextColor="#A0AEC0"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#A0AEC0"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "AUTHENTICATING..." : "LOGIN"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>
                New student? <Text style={styles.linkBold}>Create an account</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 25,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoBadge: {
    width: 65,
    height: 65,
    backgroundColor: "#1A202C",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    // Soft shadow for the logo
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoInitial: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "300",
  },
  universityName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1A202C",
    letterSpacing: 1.5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: "#1A202C",
    marginTop: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderRadius: 4, // Slightly rounder for a cleaner feel
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  loginHeader: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1A202C",
  },
  loginSubheader: {
    fontSize: 14,
    color: "#718096",
    marginBottom: 35,
    marginTop: 6,
  },
  inputWrapper: {
    marginBottom: 22,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4A5568",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#2D3748",
    backgroundColor: "#F8FAFC",
    borderRadius: 4,
  },
  button: {
    backgroundColor: "#1A202C",
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    borderRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: "#A0AEC0",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
  },
  linkContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  linkText: {
    color: "#718096",
    fontSize: 14,
  },
  linkBold: {
    color: "#1A202C",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});