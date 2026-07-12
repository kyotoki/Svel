import { Ionicons } from "@expo/vector-icons";
import type { ImagePickerAsset } from "expo-image-picker";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import PhotoThumbnail from "../ui/PhotoThumbnail";
import WaveSpinner from "../ui/WaveSpinner";

const PREVIEW_SIZE = 100;

interface PhotoPickerProps {
  photos: ImagePickerAsset[];
  /** null means unlimited (Pro) - see useAdventureForm's maxPhotos. */
  maxPhotos: number | null;
  isUploading: boolean;
  isSubmitting: boolean;
  onTakePhoto: () => void;
  onChoosePhotos: () => void;
  onRemovePhotoAt: (index: number) => void;
}

export default function PhotoPicker({
  photos,
  maxPhotos,
  isUploading,
  isSubmitting,
  onTakePhoto,
  onChoosePhotos,
  onRemovePhotoAt,
}: PhotoPickerProps) {
  const atLimit = maxPhotos !== null && photos.length >= maxPhotos;
  const disableAdd = isSubmitting || atLimit;

  return (
    <>
      {photos.length > 0 && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoPreviewRow}
          >
            {photos.map((asset, index) => (
              <View key={asset.assetId ?? asset.uri} style={styles.photoPreviewWrap}>
                <PhotoThumbnail uri={asset.uri} size={PREVIEW_SIZE} />
                {isUploading && (
                  <View style={styles.photoUploadingOverlay}>
                    <WaveSpinner size="small" color={colors.text.inverse} />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => onRemovePhotoAt(index)}
                  hitSlop={8}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={26}
                    color={isSubmitting ? colors.text.disabled : colors.error}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.photoCountText}>
            {maxPhotos !== null
              ? `${photos.length} of ${maxPhotos} photos`
              : `${photos.length} photo${photos.length === 1 ? "" : "s"}`}
          </Text>
        </>
      )}
      <View style={styles.photoButtonsRow}>
        <TouchableOpacity
          testID="take-photo-button"
          style={[styles.photoButton, disableAdd && styles.photoButtonDisabled]}
          onPress={onTakePhoto}
          activeOpacity={0.85}
          disabled={disableAdd}
        >
          <Ionicons name="camera-outline" size={20} color={disableAdd ? colors.text.disabled : colors.primary} />
          <Text style={[styles.photoButtonText, disableAdd && styles.photoButtonTextDisabled]}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="choose-photos-button"
          style={[styles.photoButton, disableAdd && styles.photoButtonDisabled]}
          onPress={onChoosePhotos}
          activeOpacity={0.85}
          disabled={disableAdd}
        >
          <Ionicons name="image-outline" size={20} color={disableAdd ? colors.text.disabled : colors.primary} />
          <Text style={[styles.photoButtonText, disableAdd && styles.photoButtonTextDisabled]}>Choose Photos</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  photoButtonsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  photoButtonText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    color: colors.primary,
  },
  photoButtonDisabled: {
    opacity: 0.5,
  },
  photoButtonTextDisabled: {
    color: colors.text.disabled,
  },
  photoCountText: {
    fontSize: typography.size.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  photoPreviewRow: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  photoPreviewWrap: {
    alignSelf: "flex-start",
  },
  photoUploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.overlay.modalScrim,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  removePhotoButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: colors.surface.card,
    borderRadius: radius.full,
  },
});
