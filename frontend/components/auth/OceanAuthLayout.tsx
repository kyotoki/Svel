import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface OceanAuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function OceanAuthLayout({
  title,
  subtitle,
  children,
  footer,
}: OceanAuthLayoutProps) {
  return (
    <LinearGradient colors={["#02101F", "#062C43", "#0B3D5C"]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.badge}>
              <Image
                source={require("../../assets/images/svellogo-mark-light.png")}
                style={styles.badgeLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <View style={styles.card}>{children}</View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  badge: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(6, 182, 212, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  // The mark's native crop is portrait (~185x300) - sized to preserve that
  // ratio rather than force it into a square, so it isn't stretched.
  badgeLogo: {
    width: 26,
    height: 42,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "#8FB8CE",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
});
