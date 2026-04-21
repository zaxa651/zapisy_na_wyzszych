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
import { UserRole, useRegister } from "../hooks/useRegister";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "lecturer", label: "Lecturer" },
];

const RoleOption = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.roleOption, selected && styles.roleOptionSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[styles.roleText, selected && styles.roleTextSelected]}>
      {label}
    </Text>
    {selected && <View style={styles.radioDot} />}
  </TouchableOpacity>
);

export default function RegisterScreen() {
  const router = useRouter();
  const { loading, signUp } = useRegister();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert("Required Fields", "Please complete all fields to proceed.");
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
        "Registration Successful",
        "Your account has been created. Please verify your email."
      );
      router.replace("/(auth)/login");
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message ?? "An error occurred.");
    }
  };

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
            <Text style={styles.cardHeader}>Create Account</Text>
            <Text style={styles.cardSubheader}>Join the academic management system</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#A0AEC0"
                value={fullName}
                onChangeText={setFullName}
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Account Type</Text>
              <View style={styles.roleOptions}>
                {ROLES.map((r) => (
                  <RoleOption
                    key={r.value}
                    label={r.label}
                    selected={role === r.value}
                    onPress={() => setRole(r.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Institutional Email</Text>
              <TextInput
                style={styles.input}
                placeholder="student@university.edu"
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
                placeholder="Create a strong password"
                placeholderTextColor="#A0AEC0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "PROCESSING..." : "REGISTER ACCOUNT"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>
                Already registered? <Text style={styles.linkBold}>Log in</Text>
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
    marginBottom: 35,
  },
  logoBadge: {
    width: 65,
    height: 65,
    backgroundColor: "#1A202C",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
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
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1A202C",
  },
  cardSubheader: {
    fontSize: 14,
    color: "#718096",
    marginBottom: 30,
    marginTop: 6,
  },
  inputWrapper: {
    marginBottom: 20,
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
  roleOptions: {
    flexDirection: "row",
    gap: 12,
  },
  roleOption: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
  },
  roleOptionSelected: {
    borderColor: "#1A202C",
    backgroundColor: "#EDF2F7",
    borderWidth: 2,
  },
  roleText: {
    fontSize: 14,
    color: "#718096",
    fontWeight: "500",
  },
  roleTextSelected: {
    color: "#1A202C",
    fontWeight: "700",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1A202C",
  },
  button: {
    backgroundColor: "#1A202C",
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
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
    marginTop: 25,
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