import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: View };
});

import PhotoPicker from "../PhotoPicker";

function makeAsset(uri: string) {
  return { uri, assetId: uri } as any;
}

test("shows nothing extra and no count line when no photos are attached yet", () => {
  render(
    <PhotoPicker
      photos={[]}
      maxPhotos={6}
      isUploading={false}
      isSubmitting={false}
      onTakePhoto={jest.fn()}
      onChoosePhotos={jest.fn()}
      onRemovePhotoAt={jest.fn()}
    />
  );
  expect(screen.queryByText(/of 6 photos/)).toBeNull();
});

test("shows 'x of y photos' once at least one is attached", () => {
  render(
    <PhotoPicker
      photos={[makeAsset("a"), makeAsset("b")]}
      maxPhotos={6}
      isUploading={false}
      isSubmitting={false}
      onTakePhoto={jest.fn()}
      onChoosePhotos={jest.fn()}
      onRemovePhotoAt={jest.fn()}
    />
  );
  expect(screen.getByText("2 of 6 photos")).toBeTruthy();
});

test("pressing Take Photo/Choose Photos at the cap does not call through (button is disabled)", () => {
  const photos = Array.from({ length: 6 }, (_, i) => makeAsset(String(i)));
  const onTakePhoto = jest.fn();
  const onChoosePhotos = jest.fn();
  render(
    <PhotoPicker
      photos={photos}
      maxPhotos={6}
      isUploading={false}
      isSubmitting={false}
      onTakePhoto={onTakePhoto}
      onChoosePhotos={onChoosePhotos}
      onRemovePhotoAt={jest.fn()}
    />
  );

  fireEvent.press(screen.getByTestId("take-photo-button"));
  fireEvent.press(screen.getByTestId("choose-photos-button"));
  expect(onTakePhoto).not.toHaveBeenCalled();
  expect(onChoosePhotos).not.toHaveBeenCalled();
});

test("pressing Take Photo below the cap calls through normally", () => {
  const onTakePhoto = jest.fn();
  render(
    <PhotoPicker
      photos={[makeAsset("a")]}
      maxPhotos={6}
      isUploading={false}
      isSubmitting={false}
      onTakePhoto={onTakePhoto}
      onChoosePhotos={jest.fn()}
      onRemovePhotoAt={jest.fn()}
    />
  );

  fireEvent.press(screen.getByTestId("take-photo-button"));
  expect(onTakePhoto).toHaveBeenCalled();
});

test("maxPhotos null (Pro) means no cap - always callable, count shown without a limit", () => {
  const photos = Array.from({ length: 20 }, (_, i) => makeAsset(String(i)));
  const onTakePhoto = jest.fn();
  render(
    <PhotoPicker
      photos={photos}
      maxPhotos={null}
      isUploading={false}
      isSubmitting={false}
      onTakePhoto={onTakePhoto}
      onChoosePhotos={jest.fn()}
      onRemovePhotoAt={jest.fn()}
    />
  );

  expect(screen.getByText("20 photos")).toBeTruthy();
  fireEvent.press(screen.getByTestId("take-photo-button"));
  expect(onTakePhoto).toHaveBeenCalled();
});
