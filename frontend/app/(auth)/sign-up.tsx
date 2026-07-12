import { useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { createElement, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, TextInput, TouchableOpacity } from "react-native";

import { authStyles, PLACEHOLDER_COLOR } from "../../components/auth/authStyles";
import OceanAuthLayout from "../../components/auth/OceanAuthLayout";
import SocialSignInButtons from "../../components/auth/SocialSignInButtons";

// Clerk's bot-protection (Smart CAPTCHA) looks for this element by id on web
// during custom sign-up flows; without it, it silently falls back to a
// lower-trust invisible widget. Native platforms don't render it.
const CaptchaSlot = () =>
  Platform.OS === "web" ? createElement("div", { id: "clerk-captcha" }) : null;

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await signUp.create({
        emailAddress: emailAddress.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? "Unable to sign up.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        // Not "/onboarding" directly - (auth)/_layout.tsx's own redirect fires
        // the instant isSignedIn flips true and would win the race against
        // this call anyway, so it's the single source of truth for whether a
        // freshly-signed-in user lands on "/" or "/onboarding".
        router.replace("/");
      } else {
        setError("Verification is incomplete. Double-check the code.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? "Unable to verify email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingVerification) {
    return (
      <OceanAuthLayout
        title="Check your email"
        subtitle={`Enter the verification code we sent to ${emailAddress}`}
      >
        <TextInput
          style={authStyles.input}
          placeholder="Verification code"
          placeholderTextColor={PLACEHOLDER_COLOR}
          accessibilityLabel="Verification code"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          returnKeyType="done"
          onSubmitEditing={onVerifyPress}
        />

        {error ? (
          <Text style={authStyles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[authStyles.button, isSubmitting && authStyles.buttonDisabled]}
          onPress={onVerifyPress}
          disabled={isSubmitting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Verify email"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#04202D" />
          ) : (
            <Text style={authStyles.buttonText}>Verify Email</Text>
          )}
        </TouchableOpacity>
      </OceanAuthLayout>
    );
  }

  return (
    <OceanAuthLayout
      title="Svel"
      subtitle="Create an account to get started"
      footer={
        <>
          <Text style={authStyles.footerText}>Already have an account?</Text>
          <Link href="/sign-in" replace>
            <Text style={authStyles.footerLink}> Sign in</Text>
          </Link>
        </>
      }
    >
      <TextInput
        style={authStyles.input}
        placeholder="Email"
        placeholderTextColor={PLACEHOLDER_COLOR}
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={emailAddress}
        onChangeText={setEmailAddress}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordInputRef.current?.focus()}
      />
      <TextInput
        ref={passwordInputRef}
        style={authStyles.input}
        placeholder="Password"
        placeholderTextColor={PLACEHOLDER_COLOR}
        accessibilityLabel="Password"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={onSignUpPress}
      />

      {error ? (
        <Text style={authStyles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <CaptchaSlot />

      <TouchableOpacity
        style={[authStyles.button, isSubmitting && authStyles.buttonDisabled]}
        onPress={onSignUpPress}
        disabled={isSubmitting}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Sign up"
        accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#04202D" />
        ) : (
          <Text style={authStyles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <SocialSignInButtons onError={setError} />
    </OceanAuthLayout>
  );
}
