import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { UserRole, useRegister } from "../hooks/useRegister";

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLES: { value: UserRole; label: string; emoji: string }[] = [
  { value: "student", label: "Studen", emoji: "👨‍🎓" },
  { value: "lecturer", label: "Lecturer", emoji: "👨‍🏫" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const RoleOption = ({
  emoji,
  label,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.roleOption, selected && styles.roleOptionSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {selected && <Text style={styles.check}>✓</Text>}
    <Text style={styles.roleEmoji}>{emoji}</Text>
    <Text style={[styles.roleText, selected && styles.roleTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router = useRouter();
  const { loading, signUp } = useRegister();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
      });
      Alert.alert(
        "Done!",
        "Account created!\nCheck your email for confirmation.",
      );
      router.replace("/(auth)/login");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to register");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create account</Text>

        <TextInput
          style={styles.input}
          placeholder="Full name"
          value={fullName}
          onChangeText={setFullName}
          autoCorrect={false}
          returnKeyType="next"
        />

        <Text style={styles.roleLabel}>Who are you?</Text>
        <View style={styles.roleOptions}>
          {ROLES.map((r) => (
            <RoleOption
              key={r.value}
              emoji={r.emoji}
              label={r.label}
              selected={role === r.value}
              onPress={() => setRole(r.value)}
            />
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creating account..." : "Sign up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={styles.linkContainer}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F1F3F5",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  roleOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  roleOption: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  roleOptionSelected: { borderColor: "#007AFF", backgroundColor: "#F0F8FF" },
  roleEmoji: { fontSize: 28, marginBottom: 4 },
  roleText: { fontSize: 15, fontWeight: "500", color: "#1C1C1E" },
  roleTextSelected: { color: "#007AFF", fontWeight: "700" },
  check: {
    position: "absolute",
    top: 8,
    right: 10,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  linkContainer: { marginTop: 25, alignItems: "center", padding: 10 },
  linkText: { color: "#666", fontSize: 15 },
  linkBold: { color: "#007AFF", fontWeight: "bold" },
});
