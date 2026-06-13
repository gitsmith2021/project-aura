import { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { PrimaryButton, ErrorNote } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

export default function Login() {
  const { session, signIn, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Redirect href="/(app)/home" />;

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    router.replace("/(app)/home");
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>A</Text>
        </View>
        <Text style={styles.title}>AURA</Text>
        <Text style={styles.subtitle}>Academic ERP · sign in to continue</Text>
      </View>

      <View style={styles.form}>
        {error ? <ErrorNote message={error} /> : null}
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@institution.edu"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={styles.input}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          autoComplete="password"
          style={styles.input}
        />
        <View style={{ height: spacing.md }} />
        <PrimaryButton label="Sign In" onPress={onSubmit} loading={submitting} />
        <Text style={styles.hint}>
          Use the same credentials as the Aura web portal. Your role determines what you see.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: spacing.xl },
  brand: { alignItems: "center", marginBottom: spacing.xl },
  logo: {
    width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.violet,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  logoText: { color: colors.white, fontSize: 28, fontWeight: "900" },
  title: { fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: 2 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  form: { gap: spacing.xs },
  label: { fontSize: 12, fontWeight: "600", color: colors.text, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 15, color: colors.text,
  },
  hint: { fontSize: 11, color: colors.textFaint, textAlign: "center", marginTop: spacing.md },
});
