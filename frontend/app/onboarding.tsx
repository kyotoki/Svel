import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import OceanAuthLayout from "../components/auth/OceanAuthLayout";
import { authStyles, PLACEHOLDER_COLOR } from "../components/auth/authStyles";
import OceanLoadingScreen from "../components/auth/OceanLoadingScreen";
import CountryPickerModal from "../components/profile/CountryPickerModal";
import AnimatedPressable from "../components/ui/AnimatedPressable";
import { ENDPOINTS } from "../constants/api";
import { useAuthedFetch } from "../utils/api";
import { countryCodeToFlag, COUNTRIES } from "../utils/countries";
import { showAlert } from "../utils/crossPlatformAlert";
import { uploadPhoto } from "../utils/uploadPhoto";

// A standalone top-level route (outside both the (auth) and (tabs) groups),
// so neither group's auth-redirect layout logic applies to it - it needs its
// own signed-in guard instead. Reached once, right after sign-up completes.
export default function OnboardingScreen() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const authedFetch = useAuthedFetch();
  const lastNameInputRef = useRef<TextInput>(null);
  const nicknameInputRef = useRef<TextInput>(null);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [nickname, setNickname] = useState("");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoaded) {
    return <OceanLoadingScreen />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const homeCountry = COUNTRIES.find((c) => c.code === countryCode);

  const onChoosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        "Photo library access needed",
        "Enable photo library access in Settings to add a profile photo."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0]);
    }
  };

  const handleContinue = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        photoUrl = await uploadPhoto(authedFetch, ENDPOINTS.uploads, photo);
      }

      const response = await authedFetch(ENDPOINTS.profile, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          nickname: nickname.trim() ? nickname.trim() : null,
          country_code: countryCode,
          photo_url: photoUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your profile. Check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OceanAuthLayout
      title="Set Up Your Profile"
      subtitle="Tell us a bit about yourself before you dive in"
    >
      <Pressable
        style={styles.photoRow}
        onPress={onChoosePhoto}
        accessibilityRole="button"
        accessibilityLabel="Choose profile photo, optional"
      >
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="camera-outline" size={22} color="#8FB8CE" />
          </View>
        )}
        <Text style={styles.photoLabel}>Profile Photo (Optional)</Text>
      </Pressable>

      <TextInput
        style={authStyles.input}
        placeholder="First Name"
        placeholderTextColor={PLACEHOLDER_COLOR}
        accessibilityLabel="First name"
        value={firstName}
        onChangeText={setFirstName}
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => lastNameInputRef.current?.focus()}
      />
      <TextInput
        ref={lastNameInputRef}
        style={authStyles.input}
        placeholder="Last Name"
        placeholderTextColor={PLACEHOLDER_COLOR}
        accessibilityLabel="Last name"
        value={lastName}
        onChangeText={setLastName}
        autoComplete="family-name"
        textContentType="familyName"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => nicknameInputRef.current?.focus()}
      />
      <TextInput
        ref={nicknameInputRef}
        style={authStyles.input}
        placeholder="Nickname (Optional)"
        placeholderTextColor={PLACEHOLDER_COLOR}
        accessibilityLabel="Nickname, optional"
        value={nickname}
        onChangeText={setNickname}
        autoComplete="nickname"
        textContentType="nickname"
        returnKeyType="done"
      />

      <Pressable
        style={styles.countryRow}
        onPress={() => setIsCountryPickerVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={
          homeCountry ? `Country of origin, ${homeCountry.name}` : "Country of origin, not set"
        }
      >
        <Ionicons name="earth-outline" size={16} color="#8FB8CE" />
        {homeCountry ? (
          <>
            <Text style={styles.flag}>{countryCodeToFlag(homeCountry.code)}</Text>
            <Text style={styles.countryText}>{homeCountry.name}</Text>
          </>
        ) : (
          <Text style={styles.countryPlaceholder}>Country of Origin</Text>
        )}
      </Pressable>

      <View style={styles.emailRow}>
        <Ionicons name="mail-outline" size={16} color="#8FB8CE" />
        <Text style={styles.emailText}>{email}</Text>
      </View>

      {error ? (
        <Text style={authStyles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <AnimatedPressable
        style={[authStyles.button, isSubmitting && authStyles.buttonDisabled]}
        onPress={handleContinue}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#04202D" />
        ) : (
          <Text style={authStyles.buttonText}>Continue</Text>
        )}
      </AnimatedPressable>

      <CountryPickerModal
        visible={isCountryPickerVisible}
        onClose={() => setIsCountryPickerVisible(false)}
        onSelect={setCountryCode}
      />
    </OceanAuthLayout>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  photoPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8FB8CE",
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  flag: {
    fontSize: 16,
  },
  countryText: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  countryPlaceholder: {
    fontSize: 15,
    color: PLACEHOLDER_COLOR,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  emailText: {
    fontSize: 14,
    color: "#8FB8CE",
  },
});
