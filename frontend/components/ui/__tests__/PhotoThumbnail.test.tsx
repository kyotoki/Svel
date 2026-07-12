import { fireEvent, render } from "@testing-library/react-native";
import { Image } from "react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: View };
});

import Skeleton from "../Skeleton";
import PhotoThumbnail from "../PhotoThumbnail";

const URI = "https://example.com/photo.jpg";

test("shows a loading skeleton before the image finishes loading", () => {
  const { UNSAFE_getByType } = render(<PhotoThumbnail uri={URI} />);
  expect(UNSAFE_getByType(Skeleton)).toBeTruthy();
});

test("hides the skeleton once the image reports it has loaded", () => {
  const { UNSAFE_getByType, UNSAFE_queryByType } = render(<PhotoThumbnail uri={URI} />);
  fireEvent(UNSAFE_getByType(Image), "load");
  expect(UNSAFE_queryByType(Skeleton)).toBeNull();
});

test("swaps the image out for a broken-image fallback icon on load failure", () => {
  const { UNSAFE_getByType, UNSAFE_queryByType, UNSAFE_root } = render(<PhotoThumbnail uri={URI} />);
  fireEvent(UNSAFE_getByType(Image), "error");

  expect(UNSAFE_queryByType(Image)).toBeNull();
  expect(UNSAFE_root.findByProps({ name: "image-outline" })).toBeTruthy();
});

test("uses a caller-provided fallback icon for the broken-image state (e.g. a person icon for an avatar)", () => {
  const { UNSAFE_getByType, UNSAFE_root } = render(<PhotoThumbnail uri={URI} fallbackIcon="person-outline" />);
  fireEvent(UNSAFE_getByType(Image), "error");

  expect(UNSAFE_root.findByProps({ name: "person-outline" })).toBeTruthy();
  expect(UNSAFE_root.findAllByProps({ name: "image-outline" })).toHaveLength(0);
});

test("defaults to radius.lg but accepts a caller-provided border radius (e.g. radius.full for a circular avatar)", () => {
  const { toJSON: defaultJSON } = render(<PhotoThumbnail uri={URI} size={72} />);
  const { toJSON: circularJSON } = render(<PhotoThumbnail uri={URI} size={72} borderRadius={36} />);

  const findFrameRadius = (node: any): number | undefined => {
    const style = Array.isArray(node.props.style) ? Object.assign({}, ...node.props.style) : node.props.style;
    return style?.borderRadius;
  };

  expect(findFrameRadius(defaultJSON())).not.toBe(36);
  expect(findFrameRadius(circularJSON())).toBe(36);
});

test("defaults to a 90px square when no size is given", () => {
  const { toJSON } = render(<PhotoThumbnail uri={URI} />);
  const root = toJSON() as any;
  const style = Array.isArray(root.props.style) ? Object.assign({}, ...root.props.style) : root.props.style;
  expect(style.width).toBe(90);
  expect(style.height).toBe(90);
});
