import { useUser } from "@clerk/clerk-expo";
import NetInfo from "@react-native-community/netinfo";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";

import { ENDPOINTS } from "../constants/api";
import { MAX_PHOTOS_PER_ADVENTURE } from "../constants/limits";
import { usePreferences } from "../contexts/PreferencesContext";
import { ActivityType } from "../types/adventure";
import { enqueueAdventure, QueuedAdventurePayload, QueuedPhoto } from "../utils/adventureQueue";
import { useAdventureSync } from "../utils/useAdventureSync";
import { AnalyticsEvents, isFirstOccurrence, track } from "../utils/analytics";
import { useAuthedFetch } from "../utils/api";
import { showAlert } from "../utils/crossPlatformAlert";
import { formatDateISO, formatTimeHHMM } from "../utils/date";
import { isAuthError, QueueFullError, REAUTH_MESSAGE, ServerRejectedError } from "../utils/errors";
import { geocodeLocationName } from "../utils/geocode";
import { extendStreakReminderFromLog } from "../utils/notifications";
import { useIsProUser } from "../utils/proTier";
import { uploadPhoto } from "../utils/uploadPhoto";
import { depthUnitLabel, feetToMeters } from "../utils/units";

export type SubmitStage = "idle" | "uploading-photo" | "saving";
export type LocationInputMode = "coordinates" | "search";
export type GeocodeStatus = "idle" | "loading" | "success" | "error";

export interface AdventureFormState {
  title: string;
  location_name: string;
  latitude: string;
  longitude: string;
  max_depth_meters: string;
  duration_minutes: string;
  notes: string;
  tank_pressure_bar: string;
  gas_mix: string;
}

const INITIAL_FORM: AdventureFormState = {
  title: "",
  location_name: "",
  latitude: "",
  longitude: "",
  max_depth_meters: "",
  duration_minutes: "",
  notes: "",
  tank_pressure_bar: "",
  gas_mix: "",
};

// Scuba and freediving both track how deep the diver actually went; snorkeling
// is surface-based and doesn't. Distinct from `isScuba` below, which gates
// scuba-only gear fields (tank pressure, gas mix) - freediving tracks depth
// without needing a tank.
function tracksDepthFor(activityType: ActivityType): boolean {
  return activityType === "scuba" || activityType === "freediving";
}

// Same calendar day, compared via local Y/M/D - "does defaulting/keeping
// the time field to now still make sense for whatever date is currently
// selected" is a local-date question, not an instant comparison.
function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildPayload(
  form: AdventureFormState,
  activityType: ActivityType,
  adventureDate: Date,
  adventureTime: Date | null,
  isScuba: boolean,
  isImperial: boolean,
  speciesIds: string[]
): QueuedAdventurePayload {
  const tracksDepth = tracksDepthFor(activityType);
  return {
    title: form.title.trim(),
    date: formatDateISO(adventureDate),
    time_of_day: adventureTime ? formatTimeHHMM(adventureTime) : null,
    location_name: form.location_name.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    max_depth_meters: tracksDepth
      ? isImperial
        ? feetToMeters(Number(form.max_depth_meters))
        : Number(form.max_depth_meters)
      : 0,
    duration_minutes: Number(form.duration_minutes),
    notes: form.notes.trim() ? form.notes.trim() : null,
    activity_type: activityType,
    tank_pressure_bar: isScuba && form.tank_pressure_bar.trim() ? Number(form.tank_pressure_bar) : null,
    gas_mix: isScuba && form.gas_mix.trim() ? form.gas_mix.trim() : null,
    species: speciesIds,
  };
}

export function useAdventureForm() {
  const router = useRouter();
  const authedFetch = useAuthedFetch();
  const { user } = useUser();
  const { unitSystem } = usePreferences();
  const { refreshCounts: refreshSyncCounts } = useAdventureSync();
  const isImperial = unitSystem === "imperial";
  const isPro = useIsProUser();
  // null = no cap (Pro) - kept as a number|null rather than Infinity so it
  // can be displayed directly ("x of y photos") without special-casing an
  // infinite value in the UI.
  const maxPhotos = isPro ? null : MAX_PHOTOS_PER_ADVENTURE;

  const [activityType, setActivityType] = useState<ActivityType>("scuba");
  const [adventureDate, setAdventureDate] = useState<Date>(new Date());
  // Defaults to "now" - matches adventureDate's own default of today, the
  // common case of logging right after diving. Cleared back to null
  // whenever the date is changed away from today (see handleAdventureDateChange
  // below): "now" is meaningless as a default for a backfilled past day, and
  // showing it there would misleadingly suggest a real remembered time.
  // Always fully editable/clearable regardless - see TimeOfAdventureField.
  const [adventureTime, setAdventureTime] = useState<Date | null>(new Date());
  const [form, setForm] = useState<AdventureFormState>(INITIAL_FORM);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [speciesIds, setSpeciesIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof AdventureFormState, string>>>({});
  const [submitStage, setSubmitStage] = useState<SubmitStage>("idle");
  const [locationMode, setLocationMode] = useState<LocationInputMode>("coordinates");
  const [locationQuery, setLocationQuery] = useState("");
  const [geocodeStatus, setGeocodeStatus] = useState<GeocodeStatus>("idle");
  const [locationQueryError, setLocationQueryError] = useState<string | undefined>();

  const isSubmitting = submitStage !== "idle";
  const isScuba = activityType === "scuba";
  const tracksDepth = tracksDepthFor(activityType);
  const isGeocoding = geocodeStatus === "loading";

  const handleActivityTypeChange = (next: ActivityType) => {
    setActivityType(next);
  };

  const handleAdventureDateChange = (next: Date) => {
    setAdventureDate(next);
    if (!isSameLocalDay(next, new Date())) {
      // Backfilling a past day - "now" is not a meaningful default time for
      // it, so clear rather than leave a stale current-time value sitting
      // there looking like a real remembered detail. Still fully editable -
      // the user can pick a real time for that day if they remember it.
      setAdventureTime(null);
    }
  };

  const updateField = (field: keyof AdventureFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const onToggleLocationMode = () => {
    setLocationMode((prev) => (prev === "coordinates" ? "search" : "coordinates"));
    setGeocodeStatus("idle");
    setLocationQueryError(undefined);
  };

  const onLocationQueryChange = (value: string) => {
    setLocationQuery(value);
    if (geocodeStatus !== "idle") {
      setGeocodeStatus("idle");
    }
    if (locationQueryError) {
      setLocationQueryError(undefined);
    }
  };

  const onVerifyLocation = async () => {
    const query = locationQuery.trim();
    if (!query) {
      setGeocodeStatus("error");
      setLocationQueryError("Enter a location name to search.");
      return;
    }

    setGeocodeStatus("loading");
    setLocationQueryError(undefined);
    try {
      const result = await geocodeLocationName(query);
      if (!result) {
        setGeocodeStatus("error");
        setLocationQueryError("Location not found. Please check your spelling or enter raw coordinates.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        latitude: result.latitude.toFixed(6),
        longitude: result.longitude.toFixed(6),
      }));
      setErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }));
      setGeocodeStatus("success");
    } catch {
      setGeocodeStatus("error");
      setLocationQueryError("Location not found. Please check your spelling or enter raw coordinates.");
    }
  };

  const onTakePhoto = async () => {
    if (maxPhotos !== null && photos.length >= maxPhotos) {
      showAlert("Photo limit reached", `You can attach up to ${maxPhotos} photos per adventure.`);
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert("Camera access needed", "Enable camera access in Settings to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0]]);
    }
  };

  const onChoosePhotos = async () => {
    if (maxPhotos !== null && photos.length >= maxPhotos) {
      showAlert("Photo limit reached", `You can attach up to ${maxPhotos} photos per adventure.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert("Photo library access needed", "Enable photo library access in Settings to choose photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const room = maxPhotos === null ? result.assets.length : maxPhotos - photos.length;
      const accepted = result.assets.slice(0, room);
      setPhotos((prev) => [...prev, ...accepted]);
      if (result.assets.length > accepted.length) {
        showAlert(
          "Photo limit reached",
          `Only added ${accepted.length} of ${result.assets.length} - adventures can have up to ${maxPhotos} photos.`
        );
      }
    }
  };

  const removePhotoAt = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSpecies = (speciesId: string) => {
    setSpeciesIds((prev) =>
      prev.includes(speciesId) ? prev.filter((id) => id !== speciesId) : [...prev, speciesId]
    );
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof AdventureFormState, string>> = {};

    if (!form.title.trim()) {
      nextErrors.title = "Title is required.";
    }
    if (!form.location_name.trim()) {
      nextErrors.location_name = "Location name is required.";
    }

    let nextLocationQueryError: string | undefined;
    if (locationMode === "search") {
      if (geocodeStatus !== "success" || !form.latitude.trim() || !form.longitude.trim()) {
        nextLocationQueryError = "Verify a location before submitting, or switch to entering coordinates.";
      }
    } else {
      const latitude = Number(form.latitude);
      if (form.latitude.trim() === "" || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
        nextErrors.latitude = "Enter a valid latitude between -90 and 90.";
      }

      const longitude = Number(form.longitude);
      if (
        form.longitude.trim() === "" ||
        Number.isNaN(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        nextErrors.longitude = "Enter a valid longitude between -180 and 180.";
      }
    }
    setLocationQueryError(nextLocationQueryError);

    if (tracksDepth) {
      const maxDepth = Number(form.max_depth_meters);
      if (form.max_depth_meters.trim() === "" || Number.isNaN(maxDepth) || maxDepth < 0) {
        nextErrors.max_depth_meters = `Enter a valid depth in ${depthUnitLabel(unitSystem)}.`;
      }
    }

    const duration = Number(form.duration_minutes);
    if (
      form.duration_minutes.trim() === "" ||
      Number.isNaN(duration) ||
      duration < 0 ||
      !Number.isInteger(duration)
    ) {
      nextErrors.duration_minutes = "Enter a whole number of minutes.";
    }

    if (isScuba && form.tank_pressure_bar.trim() !== "") {
      const tankPressure = Number(form.tank_pressure_bar);
      if (Number.isNaN(tankPressure) || tankPressure < 0) {
        nextErrors.tank_pressure_bar = "Enter a valid tank pressure.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0 && !nextLocationQueryError;
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setPhotos([]);
    setSpeciesIds([]);
    setActivityType("scuba");
    setAdventureDate(new Date());
    setAdventureTime(new Date());
    setLocationMode("coordinates");
    setLocationQuery("");
    setGeocodeStatus("idle");
    setLocationQueryError(undefined);
  };

  // Shared by both the online-success and offline-queued-success paths below
  // - from an analytics/engagement standpoint, a dive the user has queued
  // offline is just as "logged" as one that made it to the server
  // immediately, so both should count and both should push the streak
  // reminder out the same way.
  const trackLoggedAdventure = (payload: QueuedAdventurePayload, hasPhotos: boolean) => {
    track(AnalyticsEvents.AdventureLogged, { activity_type: payload.activity_type });
    extendStreakReminderFromLog(payload.date);

    if (!user?.id) {
      return;
    }
    isFirstOccurrence(user.id, "first_adventure_logged").then((isFirst) => {
      if (isFirst) {
        track(AnalyticsEvents.FirstAdventureLogged, { activity_type: payload.activity_type });
      }
    });
    if (hasPhotos) {
      isFirstOccurrence(user.id, "first_photo_added").then((isFirst) => {
        if (isFirst) {
          track(AnalyticsEvents.FirstPhotoAdded, { activity_type: payload.activity_type });
        }
      });
    }
  };

  const queueOffline = async (payload: QueuedAdventurePayload) => {
    const queuedPhotos: QueuedPhoto[] = photos.map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? null,
      mimeType: asset.mimeType ?? null,
    }));

    try {
      await enqueueAdventure(payload, queuedPhotos);
    } catch (err) {
      if (err instanceof QueueFullError) {
        // Not saved - leave the form filled in so nothing typed is lost,
        // and say so clearly rather than reporting a false "Saved offline".
        showAlert("Sync queue full", err.message);
        return;
      }
      throw err;
    }

    await refreshSyncCounts();
    trackLoggedAdventure(payload, queuedPhotos.length > 0);
    resetForm();
    showAlert(
      "Saved offline",
      "You're offline - this adventure has been saved on your device and will sync automatically once you're back online.",
      [
        { text: "View Map", onPress: () => router.push("/") },
        { text: "Log Another", style: "cancel" },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    const payload = buildPayload(
      form,
      activityType,
      adventureDate,
      adventureTime,
      isScuba,
      isImperial,
      speciesIds
    );

    const netState = await NetInfo.fetch();
    if (netState.isConnected === false) {
      await queueOffline(payload);
      return;
    }

    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        setSubmitStage("uploading-photo");
        try {
          photoUrls = await Promise.all(
            photos.map((asset) => uploadPhoto(authedFetch, ENDPOINTS.uploads, asset))
          );
        } catch (err) {
          if (err instanceof ServerRejectedError) {
            // Auth failures are handled uniformly in the outer catch below
            // via isAuthError - only re-wrap the message for a real content
            // rejection (bad file, too large, etc.), preserving the status
            // so that check still works.
            throw new ServerRejectedError(
              isAuthError(err) ? err.message : "Unable to upload photos. Check your connection and try again.",
              err.status
            );
          }
          throw err;
        }
      }

      setSubmitStage("saving");
      const response = await authedFetch(ENDPOINTS.adventures, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, photos: photoUrls }),
      });

      if (!response.ok) {
        throw new ServerRejectedError(`Server responded with status ${response.status}`, response.status);
      }

      trackLoggedAdventure(payload, photoUrls.length > 0);
      resetForm();
      showAlert("Adventure logged", "Your dive has been added to the Ocean Map.", [
        { text: "View Map", onPress: () => router.push("/") },
        { text: "Log Another", style: "cancel" },
      ]);
    } catch (err) {
      if (err instanceof ServerRejectedError) {
        if (isAuthError(err)) {
          showAlert("Sign-in required", REAUTH_MESSAGE);
        } else {
          showAlert("Unable to save adventure", err.message);
        }
      } else {
        // Not a server rejection - fetch itself failed (or the auth token
        // refresh did), which almost always means we lost connectivity
        // between the upfront check and now. Don't leave the user with a
        // dead-end error for something they didn't do wrong.
        await queueOffline(payload);
      }
    } finally {
      setSubmitStage("idle");
    }
  };

  return {
    activityType,
    adventureDate,
    adventureTime,
    form,
    photos,
    maxPhotos,
    speciesIds,
    errors,
    submitStage,
    isSubmitting,
    isScuba,
    tracksDepth,
    isImperial,
    locationMode,
    locationQuery,
    geocodeStatus,
    isGeocoding,
    locationQueryError,
    setAdventureDate: handleAdventureDateChange,
    setAdventureTime,
    handleActivityTypeChange,
    updateField,
    onToggleLocationMode,
    onLocationQueryChange,
    onVerifyLocation,
    onTakePhoto,
    onChoosePhotos,
    removePhotoAt,
    toggleSpecies,
    handleSubmit,
  };
}
