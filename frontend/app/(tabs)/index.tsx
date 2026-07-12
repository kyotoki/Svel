import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AdventureDetailModal from "../../components/map/AdventureDetailModal";
import DiveMapView from "../../components/map/DiveMapView";
import MapSkeleton from "../../components/map/MapSkeleton";
import EmptyState from "../../components/ui/EmptyState";
import PendingSyncBadge from "../../components/ui/PendingSyncBadge";
import WaveSpinner from "../../components/ui/WaveSpinner";
import { ENDPOINTS } from "../../constants/api";
import { TAB_BAR_HEIGHT } from "../../constants/layout";
import { Adventure } from "../../types/adventure";
import { useAuthedFetch } from "../../utils/api";
import { showAlert } from "../../utils/crossPlatformAlert";
import { syncStreakReminder } from "../../utils/notifications";

export default function OceanMapScreen() {
  const router = useRouter();
  const authedFetch = useAuthedFetch();
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdventure, setSelectedAdventure] = useState<Adventure | null>(null);
  const [showConditions, setShowConditions] = useState(false);

  const fetchAdventures = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await authedFetch(ENDPOINTS.adventures);
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      const data: Adventure[] = await response.json();
      setAdventures(data);
      // Map is the app's home tab, so its own focus effect (below) is the
      // best available proxy for "app opened" - re-anchors the streak
      // reminder to the user's true most recent adventure every time.
      syncStreakReminder(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach the Svel server."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [authedFetch]);

  useFocusEffect(
    useCallback(() => {
      fetchAdventures();
    }, [fetchAdventures])
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <MapSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered} edges={["bottom"]}>
        <Ionicons name="cloud-offline-outline" size={40} color="#B00020" />
        <Text style={styles.errorTitle}>Connection failed</Text>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (adventures.length === 0) {
    return (
      <SafeAreaView style={styles.welcomeContainer} edges={["bottom"]}>
        <EmptyState
          icon={{ emoji: "🤿" }}
          title="Welcome to Svel!"
          message="Enter your first adventure to map your footprint."
          action={{ label: "Log Adventure", onPress: () => router.push("/log") }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.summaryBar}>
        <View style={styles.summaryTextGroup}>
          <Text style={styles.summaryText}>
            {adventures.length}{" "}
            {adventures.length === 1 ? "adventure" : "adventures"} logged
          </Text>
          <PendingSyncBadge />
        </View>
        <Pressable
          onPress={() => fetchAdventures(true)}
          disabled={isRefreshing}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Refresh adventures"
          accessibilityState={{ disabled: isRefreshing, busy: isRefreshing }}
        >
          {isRefreshing ? (
            <WaveSpinner size="small" color="#0B3D91" />
          ) : (
            <Ionicons name="refresh-outline" size={18} color="#0B3D91" />
          )}
        </Pressable>
      </View>

      <View style={styles.mapContainer}>
        <DiveMapView
          adventures={adventures}
          onSelectAdventure={setSelectedAdventure}
          showConditions={showConditions}
          selectedAdventureId={selectedAdventure?.id ?? null}
        />

        <Pressable
          onPress={() => setShowConditions((prev) => !prev)}
          hitSlop={8}
          style={[styles.conditionsToggle, showConditions && styles.conditionsToggleActive]}
          accessibilityRole="button"
          accessibilityLabel="Show ocean conditions on map pins"
          accessibilityState={{ selected: showConditions }}
        >
          <Ionicons
            name="thermometer-outline"
            size={16}
            color={showConditions ? "#FFFFFF" : "#0B3D5C"}
          />
          <Text
            style={[
              styles.conditionsToggleText,
              showConditions && styles.conditionsToggleTextActive,
            ]}
          >
            Conditions
          </Text>
        </Pressable>
      </View>

      <AdventureDetailModal
        key={selectedAdventure?.id ?? "none"}
        adventure={selectedAdventure}
        allAdventures={adventures}
        onClose={() => setSelectedAdventure(null)}
        onDelete={handleDeleteAdventure}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F6FC",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    // The tab bar now floats over content (absolute position, for the blur
    // effect) instead of reserving its own space, so centered content needs
    // this much extra bottom padding to stay visually centered above it.
    paddingBottom: 24 + TAB_BAR_HEIGHT,
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  summaryTextGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5A6B87",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mapContainer: {
    flex: 1,
  },
  conditionsToggle: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#021019",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  conditionsToggleActive: {
    backgroundColor: "#0B3D5C",
  },
  conditionsToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0B3D5C",
  },
  conditionsToggleTextActive: {
    color: "#FFFFFF",
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#B00020",
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: "#5A6B87",
    textAlign: "center",
  },
  // EmptyState (rendered inside) supplies its own centering/padding for the
  // "full" size - this wrapper only adds the screen-specific bottom clearance
  // for the floating tab bar.
  welcomeContainer: {
    flex: 1,
    paddingBottom: TAB_BAR_HEIGHT,
  },
});
