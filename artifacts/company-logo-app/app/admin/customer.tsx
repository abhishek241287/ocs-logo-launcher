import { useLauncher } from "@/context/LauncherContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: string;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Feather name={icon as never} size={14} color="rgba(255,255,255,0.4)" />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.2)"
        keyboardType={keyboardType}
        autoCorrect={false}
      />
    </View>
  );
}

export default function CustomerScreen() {
  const { config, updateConfig, isAdminAuthenticated } = useLauncher();
  const [customerName, setCustomerName] = useState(config.customerName);
  const [supportNumber, setSupportNumber] = useState(config.supportNumber);
  const [deviceName, setDeviceName] = useState(config.deviceName);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const save = async () => {
    await updateConfig({ customerName: customerName.trim(), supportNumber: supportNumber.trim(), deviceName: deviceName.trim() });
    setSaved(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#071A0A", "#0C2010"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Customer Branding</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {saved && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Customer details saved</Text>
            </View>
          )}

          <View style={styles.previewCard}>
            <Text style={styles.previewCompany}>{config.companyName}</Text>
            {customerName ? (
              <>
                <Text style={styles.previewInstalledFor}>Installed for</Text>
                <Text style={styles.previewCustomer}>{customerName}</Text>
              </>
            ) : (
              <Text style={styles.previewPlaceholder}>Customer name will appear here</Text>
            )}
            <Text style={styles.previewPowered}>Powered by OCS OORJA</Text>
          </View>

          <Text style={styles.sectionLabel}>CUSTOMER DETAILS</Text>
          <View style={styles.card}>
            <Field
              label="Customer / Company Name"
              value={customerName}
              onChange={setCustomerName}
              placeholder="e.g. ABC Textiles Pvt Ltd"
              icon="user"
            />
            <View style={styles.fieldDivider} />
            <Field
              label="Support Phone Number"
              value={supportNumber}
              onChange={setSupportNumber}
              placeholder="e.g. +91 98765 43210"
              icon="phone"
              keyboardType="phone-pad"
            />
            <View style={styles.fieldDivider} />
            <Field
              label="Device Name / Tag"
              value={deviceName}
              onChange={setDeviceName}
              placeholder="e.g. Reception Tablet"
              icon="smartphone"
            />
          </View>

          <View style={styles.infoBox}>
            <Feather name="info" size={14} color="rgba(58,139,63,0.7)" />
            <Text style={styles.infoText}>
              These details appear on the home screen footer and boot animation. They identify which customer this device is installed for.
            </Text>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>Save Customer Details</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071A0A" },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  screenTitle: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: Platform.OS === "web" ? 34 : 40 },
  successBanner: { backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(34,197,94,0.25)", padding: 12, marginBottom: 16 },
  successText: { color: "#22C55E", fontFamily: "Inter_500Medium", fontSize: 14, textAlign: "center" },
  previewCard: {
    backgroundColor: "#0A1A0F", borderRadius: 16, padding: 28,
    alignItems: "center", gap: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 24,
  },
  previewCompany: { color: "#FFFFFF", fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  previewInstalledFor: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8 },
  previewCustomer: { color: "rgba(255,255,255,0.7)", fontSize: 15, fontFamily: "Inter_500Medium" },
  previewPlaceholder: { color: "rgba(255,255,255,0.2)", fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", marginTop: 6 },
  previewPowered: { color: "rgba(255,255,255,0.2)", fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, marginTop: 14 },
  sectionLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 10, marginLeft: 4 },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", padding: 16, gap: 0 },
  field: { gap: 8 },
  fieldHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  fieldLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", color: "#FFFFFF",
    fontFamily: "Inter_400Regular", fontSize: 15, paddingHorizontal: 14, paddingVertical: 12,
  },
  fieldDivider: { height: 16 },
  infoBox: {
    flexDirection: "row", gap: 10, marginTop: 16,
    backgroundColor: "rgba(58,139,63,0.07)", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(58,139,63,0.18)", padding: 14,
  },
  infoText: { color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
  saveBtn: { backgroundColor: "#3A8B3F", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 20 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
