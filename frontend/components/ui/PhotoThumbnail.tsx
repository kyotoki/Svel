import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { colors, radius } from "../../constants/theme";
import Skeleton from "./Skeleton";

interface PhotoThumbnailProps {
  uri: string;
  /** Square side length in px. Defaults to 90 (profile gallery strip's
   * existing size); the log form's review strip passes 100. */
  size?: number;
  /** Overrides the default radius.lg corner rounding - e.g. radius.full for
   * a circular avatar. Still always a theme token value, never a raw number,
   * at every call site. */
  borderRadius?: number;
  /** Icon shown in the broken-image fallback. Defaults to a generic photo
   * icon; ProfileHeader's avatar passes "person-outline" instead, since a
   * broken avatar reads better as "no face" than "no photo". */
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
}

// The one shared "user photo" treatment - used everywhere a photo the user
// uploaded/chose is displayed as a fixed-size square or circle (log form
// review strip, profile gallery strip, profile avatar). Previously these
// had inconsistent corner radii and only some had a loading state or
// broken-image fallback, while the map's hero photo
// (components/map/PhotoCarousel.tsx) already had both - this is the single
// place that logic lives now, so every context behaves the same way: an
// explicit resizeMode, a Skeleton pulse while the image is in flight, and
// the same broken-image icon language PhotoCarousel already established.
export default function PhotoThumbnail({
  uri,
  size = 90,
  borderRadius = radius.lg,
  fallbackIcon = "image-outline",
}: PhotoThumbnailProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const dimensionStyle = { width: size, height: size, borderRadius };

  if (status === "error") {
    return (
      <View style={[styles.frame, styles.placeholder, dimensionStyle]}>
        <Ionicons name={fallbackIcon} size={Math.round(size * 0.3)} color={colors.text.tertiary} />
      </View>
    );
  }

  return (
    <View style={[styles.frame, dimensionStyle]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
      {status === "loading" && (
        <Skeleton style={StyleSheet.absoluteFill} baseColor={colors.border.default} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    backgroundColor: colors.border.default,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
});
