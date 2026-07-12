import { Platform } from "react-native";

import { buildDiagnosticInfo } from "../links";

describe("buildDiagnosticInfo", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { value: originalOS });
  });

  test("includes the given app version", () => {
    expect(buildDiagnosticInfo("2.4.1")).toContain("App Version: 2.4.1");
  });

  test("labels iOS with its actual OS version", () => {
    Object.defineProperty(Platform, "OS", { value: "ios" });
    Object.defineProperty(Platform, "Version", { value: "17.4", configurable: true });
    expect(buildDiagnosticInfo("1.0.0")).toContain("Platform: iOS 17.4");
  });

  test("labels Android with its API level (not a marketing version, which isn't available without expo-device)", () => {
    Object.defineProperty(Platform, "OS", { value: "android" });
    Object.defineProperty(Platform, "Version", { value: 34, configurable: true });
    expect(buildDiagnosticInfo("1.0.0")).toContain("Platform: Android (API 34)");
  });

  test("labels web platform plainly", () => {
    Object.defineProperty(Platform, "OS", { value: "web" });
    expect(buildDiagnosticInfo("1.0.0")).toContain("Platform: Web");
  });
});
