import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { Adventure } from "../../types/adventure";
import EmptyState from "../ui/EmptyState";
import PhotoThumbnail from "../ui/PhotoThumbnail";
import AccordionSection from "./AccordionSection";

const THUMBNAIL_SIZE = 90;

interface MediaGallerySectionProps {
  recentPhotos: Adventure[];
  onLogAdventure: () => void;
}

export default function MediaGallerySection({ recentPhotos, onLogAdventure }: MediaGallerySectionProps) {
  return (
    <AccordionSection title="Media & Milestone Gallery" icon="images-outline">
      {recentPhotos.length > 0 ? (
        <>
          <Text style={styles.subLabel}>RECENT PHOTOS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
          >
            {recentPhotos.map((adventure) => (
              <View key={adventure.id} style={styles.photoThumbWrap}>
                <PhotoThumbnail uri={adventure.photos[0]} size={THUMBNAIL_SIZE} />
                <View style={styles.photoDurationPill}>
                  <Text style={styles.photoDurationPillText}>⏱️ {adventure.duration_minutes}m</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <EmptyState
          size="compact"
          icon={{ name: "camera-outline" }}
          title="No photos yet"
          message="Add a photo next time you log an adventure to build your gallery."
          action={{ label: "Log Adventure", onPress: onLogAdventure }}
        />
      )}
    </AccordionSection>
  );
}

const styles = StyleSheet.create({
  subLabel: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  photoRow: {
    gap: spacing.sm,
  },
  photoThumbWrap: {
    position: "relative",
    // Without this, the wrapper stretches to the horizontal ScrollView row's
    // full cross-axis height (flexbox's default alignItems: "stretch"),
    // so the pill's `bottom` would anchor to that stretched height instead
    // of THUMBNAIL_SIZE-tall image actually visible inside it.
    alignSelf: "flex-start",
  },
  photoDurationPill: {
    position: "absolute",
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.overlay.scrimStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  photoDurationPillText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    color: colors.text.inverse,
  },
});
