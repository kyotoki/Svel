import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors, radius, spacing, typography, withOpacity } from "../../constants/theme";
import Skeleton from "../ui/Skeleton";

interface PhotoCarouselProps {
  photos: string[];
  height: number;
}

export default function PhotoCarousel({ photos, height }: PhotoCarouselProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedIndices, setFailedIndices] = useState<Record<number, boolean>>({});
  // Same Skeleton-pulse-while-loading treatment as components/ui/PhotoThumbnail
  // (the log form/profile gallery thumbnails) - this hero photo is a
  // different shape (wide, card-clipped) but should behave the same way
  // while its remote image is in flight.
  const [loadedIndices, setLoadedIndices] = useState<Record<number, boolean>>({});

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!containerWidth) {
      return;
    }
    const index = Math.round(event.nativeEvent.contentOffset.x / containerWidth);
    setActiveIndex(index);
  };

  if (photos.length === 0) {
    return (
      <View style={[styles.photo, styles.photoPlaceholder, { height }]}>
        <Ionicons name="image-outline" size={32} color={colors.text.tertiary} />
        <Text style={styles.photoPlaceholderText}>No photo added</Text>
      </View>
    );
  }

  return (
    <View style={{ height }} onLayout={onLayout}>
      {containerWidth > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {photos.map((url, index) =>
            failedIndices[index] ? (
              <View
                key={url}
                style={[styles.photo, styles.photoPlaceholder, { width: containerWidth, height }]}
              >
                <Ionicons name="image-outline" size={32} color={colors.text.tertiary} />
                <Text style={styles.photoPlaceholderText}>Photo unavailable</Text>
              </View>
            ) : (
              <View key={url} style={{ width: containerWidth, height }}>
                <Image
                  source={{ uri: url }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  onLoad={() => setLoadedIndices((prev) => ({ ...prev, [index]: true }))}
                  onError={() => setFailedIndices((prev) => ({ ...prev, [index]: true }))}
                />
                {!loadedIndices[index] && (
                  <Skeleton style={StyleSheet.absoluteFill} baseColor={colors.border.default} />
                )}
              </View>
            )
          )}
        </ScrollView>
      )}
      {photos.length > 1 && (
        <View style={styles.dotsRow} pointerEvents="none">
          {photos.map((_, index) => (
            <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoPlaceholderText: {
    fontSize: typography.size.small,
    color: colors.text.tertiary,
    fontWeight: typography.weight.semibold,
  },
  dotsRow: {
    position: "absolute",
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: withOpacity(colors.surface.card, 0.5),
  },
  dotActive: {
    backgroundColor: colors.surface.card,
    width: 16,
  },
});
