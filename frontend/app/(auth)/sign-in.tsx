import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity } from "react-native";

import { authStyles, PLACEHOLDER_COLOR } from "../../components/auth/authStyles";
import OceanAuthLayout from "../../components/auth/OceanAuthLayout";
import SocialSignInButtons from "../../components/auth/SocialSignInButtons";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsSecondFactor, setNeedsSecondFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const attempt = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
      } else if (attempt.status === "needs_second_factor") {
        await signIn.prepareSecondFactor({ strategy: "email_code" });
        setNeedsSecondFactor(true);
      } else {
        setError("Additional verification is required to sign in.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const attempt = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });

      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/");
      } else {
        setError("Verification is incomplete. Double-check the code.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? "Unable to verify code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (needsSecondFactor) {
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
          accessibilityLabel="Verify"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#04202D" />
          ) : (
            <Text style={authStyles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>
      </OceanAuthLayout>
    );
  }

  return (
    <OceanAuthLayout
      title="Svel"
      subtitle="Sign in to chart your adventure"
      footer={
        <>
          <Text style={authStyles.footerText}>Don&apos;t have an account?</Text>
          <Link href="/sign-up" replace>
            <Text style={authStyles.footerLink}> Sign up</Text>
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
        onSubmitEditing={onSignInPress}
      />

      {error ? (
        <Text style={authStyles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[authStyles.button, isSubmitting && authStyles.buttonDisabled]}
        onPress={onSignInPress}
        disabled={isSubmitting}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#04202D" />
        ) : (
          <Text style={authStyles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <SocialSignInButtons onError={setError} />
    </OceanAuthLayout>
  );
}
