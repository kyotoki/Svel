import { useClerk, useUser } from "@clerk/clerk-expo";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ENDPOINTS } from "../constants/api";
import { usePreferences } from "../contexts/PreferencesContext";
import { ActivityFilter, ActivityStats, Adventure } from "../types/adventure";
import { Achievement, AchievementGroups, buildAchievements } from "../utils/achievements";
import { getSeenAchievementIds, saveSeenAchievementIds } from "../utils/achievementProgress";
import { buildCombinedActivityStats } from "../utils/activityStats";
import { useAuthedFetch } from "../utils/api";
import { countryCodeToFlag, COUNTRIES } from "../utils/countries";
import { showAlert } from "../utils/crossPlatformAlert";
import {
  DEFAULT_LOCAL_PROFILE,
  loadLocalProfile,
  LocalProfileFields,
  saveLocalProfile,
} from "../utils/profileStorage";
import { useIsProUser } from "../utils/proTier";
import { uploadPhoto } from "../utils/uploadPhoto";

function flattenAchievementGroups(groups: AchievementGroups): Achievement[] {
  return [
    ...groups.streaks,
    ...groups.scuba,
    ...groups.snorkel,
    ...groups.freediving,
    ...groups.certification,
    ...groups.global,
  ];
}

// The backend's full schemas.UserProfile shape (routes/profile.py) - a
// superset of LocalProfileFields, since first_name/last_name/nickname are
// backend-only fields the main app UI never surfaces after onboarding
// (EditProfileModal writes name changes straight to Clerk instead - see its
// handleClose). Kept in a ref (not state) because every write-through PUT
// needs the CURRENT backend values for those fields so it doesn't blank
// them out - PUT is a full replace, not a patch (see routes/profile.py).
interface BackendProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  country_code: string | null;
  photo_url: string | null;
  bio: string | null;
  certifications: string[];
  gear: LocalProfileFields["gear"];
}

function backendToLocalFields(profile: BackendProfile): LocalProfileFields {
  return {
    bio: profile.bio ?? "",
    homeCountryCode: profile.country_code,
    certifications: profile.certifications,
    gear: profile.gear,
    photoUri: profile.photo_url,
  };
}

function isLocalProfileEmpty(fields: LocalProfileFields): boolean {
  return (
    !fields.bio &&
    !fields.homeCountryCode &&
    fields.certifications.length === 0 &&
    fields.gear.length === 0 &&
    !fields.photoUri
  );
}

export function useProfileData() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const authedFetch = useAuthedFetch();
  const { unitSystem, mapStyle, setUnitSystem, setMapStyle } = usePreferences();

  const [localProfile, setLocalProfile] = useState<LocalProfileFields>(DEFAULT_LOCAL_PROFILE);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const [scubaStats, setScubaStats] = useState<ActivityStats | null>(null);
  const [snorkelingStats, setSnorkelingStats] = useState<ActivityStats | null>(null);
  const [freedivingStats, setFreedivingStats] = useState<ActivityStats | null>(null);
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityFilter>("scuba");
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdventure, setSelectedAdventure] = useState<Adventure | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const [isGearModalVisible, setIsGearModalVisible] = useState(false);
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isMapStylePickerVisible, setIsMapStylePickerVisible] = useState(false);
  const [isSettingsMenuVisible, setIsSettingsMenuVisible] = useState(false);
  const [isSvelProModalVisible, setIsSvelProModalVisible] = useState(false);
  const [isCertificationsModalVisible, setIsCertificationsModalVisible] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // The backend's current view of this user's profile, used as the base
  // for every write-through PUT (see syncProfileToBackend) so a change to
  // one field (e.g. toggling a certification) doesn't blank out fields
  // this hook doesn't otherwise track, like nickname. Ref, not state - it
  // doesn't drive any render itself, only what the next PUT sends.
  const backendProfileRef = useRef<BackendProfile | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    let cancelled = false;

    (async () => {
      // Paint immediately from whatever's cached locally (works offline,
      // avoids a blank flash) - reconciled against the backend below once
      // that responds.
      const local = await loadLocalProfile(user.id);
      if (cancelled) {
        return;
      }
      setLocalProfile(local);

      try {
        const response = await authedFetch(ENDPOINTS.profile);
        if (cancelled) {
          return;
        }
        if (response.status === 404) {
          // No backend row - shouldn't normally happen (onboarding always
          // creates one before a user reaches the main app), so this is
          // treated as a genuine absence rather than something to paper
          // over by inventing first_name/last_name to create one here.
          return;
        }
        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }
        const backend: BackendProfile = await response.json();
        const backendFields = backendToLocalFields(backend);

        if (isLocalProfileEmpty(backendFields) && !isLocalProfileEmpty(local)) {
          // One-time migration: this device has real local data from
          // before backend sync existed (Month 4b) and the backend has
          // never seen it - push it up rather than silently discarding it
          // in favor of the backend's (empty) values.
          const migrateResponse = await authedFetch(ENDPOINTS.profile, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              first_name: backend.first_name,
              last_name: backend.last_name,
              nickname: backend.nickname,
              country_code: local.homeCountryCode,
              photo_url: local.photoUri,
              bio: local.bio,
              certifications: local.certifications,
              gear: local.gear,
            }),
          });
          if (!migrateResponse.ok) {
            throw new Error(`Server responded with status ${migrateResponse.status}`);
          }
          const migrated: BackendProfile = await migrateResponse.json();
          backendProfileRef.current = migrated;
          setLocalProfile(local);
          await saveLocalProfile(user.id, local);
        } else {
          backendProfileRef.current = backend;
          setLocalProfile(backendFields);
          await saveLocalProfile(user.id, backendFields);
        }
      } catch {
        // Offline or server unreachable - the local cache already painted
        // above stands in; backendProfileRef staying null means any edit
        // made before the next successful load saves locally only (see
        // syncProfileToBackend) rather than risking a PUT that clobbers
        // fields this hook never fetched.
      } finally {
        if (!cancelled) {
          setIsProfileLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authedFetch]);

  const syncProfileToBackend = useCallback(
    async (fields: LocalProfileFields) => {
      const current = backendProfileRef.current;
      if (!current) {
        return;
      }
      try {
        const response = await authedFetch(ENDPOINTS.profile, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: current.first_name,
            last_name: current.last_name,
            nickname: current.nickname,
            country_code: fields.homeCountryCode,
            photo_url: fields.photoUri,
            bio: fields.bio,
            certifications: fields.certifications,
            gear: fields.gear,
          }),
        });
        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }
        backendProfileRef.current = await response.json();
      } catch {
        // The local write (already saved by the caller) is the fallback -
        // same offline-resilience spirit as the adventure sync queue. This
        // sync is retried implicitly on the next edit, or reconciled on
        // the next app load.
      }
    },
    [authedFetch]
  );

  const updateLocalProfile = useCallback(
    (patch: Partial<LocalProfileFields>) => {
      setLocalProfile((prev) => {
        const next = { ...prev, ...patch };
        if (user?.id) {
          saveLocalProfile(user.id, next);
          syncProfileToBackend(next);
        }
        return next;
      });
    },
    [user?.id, syncProfileToBackend]
  );

  const toggleCertification = useCallback(
    (value: string) => {
      setLocalProfile((prev) => {
        const nextCertifications = prev.certifications.includes(value)
          ? prev.certifications.filter((c) => c !== value)
          : [...prev.certifications, value];
        const next = { ...prev, certifications: nextCertifications };
        if (user?.id) {
          saveLocalProfile(user.id, next);
          syncProfileToBackend(next);
        }
        return next;
      });
    },
    [user?.id, syncProfileToBackend]
  );

  const achievements = useMemo(
    () => buildAchievements(adventures, localProfile.gear, localProfile.certifications),
    [adventures, localProfile.gear, localProfile.certifications]
  );

  // The "just unlocked" celebration queue - see the effect below for how
  // entries are added. A queue (not a single value) because logging one
  // adventure can legitimately cross more than one threshold at once (e.g.
  // a dive-count tier and a depth milestone together).
  const [unlockCelebrationQueue, setUnlockCelebrationQueue] = useState<Achievement[]>([]);
  // null = not yet loaded from storage for the current user; see
  // utils/achievementProgress.ts for why null is distinct from an empty Set.
  const seenAchievementIdsRef = useRef<Set<string> | null>(null);
  const isBootstrappingSeenIdsRef = useRef(false);

  useEffect(() => {
    seenAchievementIdsRef.current = null;
    if (!user?.id) {
      return;
    }
    let cancelled = false;
    getSeenAchievementIds(user.id).then((stored) => {
      if (cancelled) {
        return;
      }
      isBootstrappingSeenIdsRef.current = stored === null;
      seenAchievementIdsRef.current = new Set(stored ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || seenAchievementIdsRef.current === null) {
      return;
    }

    const allAchievements = flattenAchievementGroups(achievements);
    const unlockedIds = allAchievements.filter((a) => a.unlocked).map((a) => a.id);

    if (isBootstrappingSeenIdsRef.current) {
      // First time ever seeing this user's achievements on this device -
      // adopt whatever's already unlocked as the baseline silently. Nothing
      // here was "just" earned; celebrating all of it at once would be a
      // jarring toast flood, not a reward.
      isBootstrappingSeenIdsRef.current = false;
      seenAchievementIdsRef.current = new Set(unlockedIds);
      saveSeenAchievementIds(user.id, unlockedIds);
      return;
    }

    const newlyUnlocked = allAchievements.filter(
      (a) => a.unlocked && !seenAchievementIdsRef.current!.has(a.id)
    );
    if (newlyUnlocked.length > 0) {
      seenAchievementIdsRef.current = new Set(unlockedIds);
      saveSeenAchievementIds(user.id, unlockedIds);
      setUnlockCelebrationQueue((prev) => [...prev, ...newlyUnlocked]);
    }
  }, [achievements, user?.id]);

  const currentUnlockCelebration = unlockCelebrationQueue[0] ?? null;
  const dismissUnlockCelebration = useCallback(() => {
    setUnlockCelebrationQueue((prev) => prev.slice(1));
  }, []);

  // "All activities" has no backend endpoint of its own - it's just every
  // adventure already loaded, aggregated the same way the per-activity
  // stats are shaped, computed client-side rather than adding a new fetch.
  const allStats = useMemo(() => buildCombinedActivityStats(adventures), [adventures]);

  // `isRefresh` distinguishes a pull-to-refresh from the every-focus fetch
  // below - a pull-to-refresh shows the native RefreshControl spinner
  // (isRefreshing) over the content that's already on screen, while a normal
  // focus-triggered fetch shows the full ProfileSkeleton (isLoading). Same
  // request either way, just a different loading indicator.
  const fetchProfileData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const [adventuresResponse, scubaResponse, snorkelingResponse, freedivingResponse] = await Promise.all([
          authedFetch(ENDPOINTS.adventures),
          authedFetch(ENDPOINTS.statsByActivity("scuba")),
          authedFetch(ENDPOINTS.statsByActivity("snorkeling")),
          authedFetch(ENDPOINTS.statsByActivity("freediving")),
        ]);
        for (const response of [adventuresResponse, scubaResponse, snorkelingResponse, freedivingResponse]) {
          if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
          }
        }
        setAdventures(await adventuresResponse.json());
        setScubaStats(await scubaResponse.json());
        setSnorkelingStats(await snorkelingResponse.json());
        setFreedivingStats(await freedivingResponse.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to reach the Svel server.");
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [authedFetch]
  );

  const refresh = useCallback(() => fetchProfileData(true), [fetchProfileData]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  const handleDeleteAdventure = async (adventure: Adventure) => {
    try {
      const response = await authedFetch(ENDPOINTS.adventure(adventure.id), {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      setAdventures((prev) => prev.filter((a) => a.id !== adventure.id));
      setSelectedAdventure(null);
    } catch (err) {
      showAlert(
        "Unable to delete adventure",
        err instanceof Error ? err.message : "Check that the Svel server is running."
      );
    }
  };

  const handleAvatarPress = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert(
        "Photo library access needed",
        "Enable photo library access in Settings to change your profile photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Uploaded to R2 first (same pattern as onboarding.tsx and adventure
      // photos) rather than storing the raw device URI - a local file:// or
      // content:// path is meaningless on a different device, which is the
      // entire point of this field now living on the backend.
      try {
        const url = await uploadPhoto(authedFetch, ENDPOINTS.uploads, result.assets[0]);
        updateLocalProfile({ photoUri: url });
      } catch (err) {
        showAlert(
          "Unable to upload photo",
          err instanceof Error ? err.message : "Check your connection and try again."
        );
      }
    }
  };

  const handleLogOut = () => {
    showAlert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          setIsSettingsMenuVisible(false);
          setLocalProfile(DEFAULT_LOCAL_PROFILE);
          setIsProfileLoaded(false);
          backendProfileRef.current = null;
          setAdventures([]);
          setScubaStats(null);
          setSnorkelingStats(null);
          setFreedivingStats(null);
          signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    showAlert(
      "Delete Account",
      "This permanently deletes your account and everything in it - every logged adventure, photo, and your profile. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await authedFetch(ENDPOINTS.account, { method: "DELETE" });
              if (!response.ok && response.status !== 204) {
                throw new Error(`Server responded with status ${response.status}`);
              }
              // Only reached on confirmed success - deliberately not signing
              // out on failure (see routes/account.py's delete_my_account
              // docstring: a 502 there means local data is already gone but
              // the Clerk account isn't, which is exactly the "contact
              // support" case its own error message points at, not a state
              // to silently treat as done).
              setIsSettingsMenuVisible(false);
              setLocalProfile(DEFAULT_LOCAL_PROFILE);
              setIsProfileLoaded(false);
              backendProfileRef.current = null;
              setAdventures([]);
              setScubaStats(null);
              setSnorkelingStats(null);
              setFreedivingStats(null);
              signOut();
            } catch (err) {
              showAlert(
                "Unable to delete account",
                err instanceof Error ? err.message : "Check that the Svel server is running."
              );
            }
          },
        },
      ]
    );
  };

  const openEditProfile = () => {
    setIsSettingsMenuVisible(false);
    setIsEditProfileVisible(true);
  };

  // These three are now reached from within the Account modal (nested under
  // Settings > Account - see EditProfileModal.tsx's PREFERENCES section),
  // not directly from the Settings menu, so they close that modal rather
  // than the Settings menu itself.
  const openGearManager = () => {
    setIsEditProfileVisible(false);
    setIsGearModalVisible(true);
  };

  const openPrivacyControls = () => {
    setIsEditProfileVisible(false);
    setIsPrivacyModalVisible(true);
  };

  const openMapStylePicker = () => {
    setIsEditProfileVisible(false);
    setIsMapStylePickerVisible(true);
  };

  const openSvelPro = () => {
    setIsSettingsMenuVisible(false);
    setIsSvelProModalVisible(true);
  };

  const handleActivityTabChange = (next: ActivityFilter) => {
    setActiveActivityTab(next);
  };

  const displayName = user?.fullName?.trim() || user?.username || "Ocean Explorer";
  const avatarUri = localProfile.photoUri ?? user?.imageUrl ?? null;
  const hasBio = Boolean(localProfile.bio && localProfile.bio.trim());
  const homeCountry = COUNTRIES.find((c) => c.code === localProfile.homeCountryCode);
  const recentPhotos = adventures.filter((a) => a.photos.length > 0);
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const isPro = useIsProUser();

  return {
    localProfile,
    isProfileLoaded,
    scubaStats,
    snorkelingStats,
    freedivingStats,
    allStats,
    activeActivityTab,
    adventures,
    isLoading,
    isRefreshing,
    refresh,
    error,
    selectedAdventure,
    isMapExpanded,
    isGearModalVisible,
    isEditProfileVisible,
    isPrivacyModalVisible,
    isMapStylePickerVisible,
    isSettingsMenuVisible,
    isSvelProModalVisible,
    isCertificationsModalVisible,
    selectedAchievement,
    achievements,
    currentUnlockCelebration,
    dismissUnlockCelebration,
    unitSystem,
    mapStyle,
    setUnitSystem,
    setMapStyle,
    displayName,
    avatarUri,
    hasBio,
    homeCountry,
    recentPhotos,
    appVersion,
    isPro,
    setSelectedAdventure,
    setIsMapExpanded,
    setIsGearModalVisible,
    setIsEditProfileVisible,
    setIsPrivacyModalVisible,
    setIsMapStylePickerVisible,
    setIsSettingsMenuVisible,
    setIsSvelProModalVisible,
    setIsCertificationsModalVisible,
    setSelectedAchievement,
    updateLocalProfile,
    toggleCertification,
    handleDeleteAdventure,
    handleAvatarPress,
    handleLogOut,
    handleDeleteAccount,
    openEditProfile,
    openGearManager,
    openPrivacyControls,
    openMapStylePicker,
    openSvelPro,
    handleActivityTabChange,
    countryCodeToFlag,
  };
}
