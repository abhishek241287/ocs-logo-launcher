import { CURATED_APPS, type AppDef, useLauncher } from "@/context/LauncherContext";
import { Feather, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function AppIcon({ app }: { app: AppDef }) {
  if (app.iconLib === "MaterialCommunityIcons") {
    return <MaterialCommunityIcons name={app.icon as never} size={24} color={app.color} />;
  }
  return <MaterialIcons name={app.icon as never} size={24} color={app.color} />;
}

export default function AppsScreen() {
  const {
    isAdminAuthenticated,
    enabledApps,
    customApps,
    setEnabledApps,
    addCustomApp,
    removeCustomApp,
  } = useLauncher();

  const [localEnabled, setLocalEnabled] = useState<string[]>(enabledApps);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPackage, setNewPackage] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminAuthenticated) router.replace("/");
    }, [isAdminAuthenticated])
  );

  const toggleApp = useCallback(
    async (id: string, value: boolean) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      const next = value
        ? [...localEnabled, id]
        : localEnabled.filter((a) => a !== id);
      setLocalEnabled(next);
      await setEnabledApps(next);
    },
    [localEnabled, setEnabledApps]
  );

  const handleAddCustomApp = async () => {
    const name = newName.trim();
    const pkg = newPackage.trim();
    if (!name || !pkg) {
      Alert.alert("Required", "Please enter both an app name and package name.");
      return;
    }
    setSaving(true);
    await addCustomApp(name, pkg);
    setLocalEnabled((prev) => {
      // The new app ID is custom_<timestamp> — context already enabled it.
      // Sync local state by re-fetching enabledApps from context on next render.
      return prev;
    });
    setSaving(false);
    setNewName("");
    setNewPackage("");
    setModalVisible(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const handleDeleteCustomApp = (app: AppDef) => {
    Alert.alert(
      "Remove App",
      `Remove "${app.name}" from the launcher?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeCustomApp(app.id);
            setLocalEnabled((prev) => prev.filter((id) => id !== app.id));
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
          },
        },
      ]
    );
  };

  const allApps = [...CURATED_APPS, ...customApps];

  // Keep localEnabled in sync with any newly added custom apps (auto-enabled)
  const syncedEnabled = localEnabled.includes(
    customApps[customApps.length - 1]?.id ?? ""
  )
    ? localEnabled
    : [
        ...localEnabled,
        ...customApps
          .filter((a) => !localEnabled.includes(a.id))
          .map((a) => a.id),
      ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#0A1628", "#071A0A"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, Platform.OS === "web" && { marginTop: 67 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
            <Text style={styles.backText}>Admin</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Allowed Apps</Text>
          <View style={{ width: 80 }} />
        </View>

        <Text style={styles.hint}>Toggle apps to show or hide them on the home screen.</Text>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
          {allApps.map((app) => {
            const isEnabled = syncedEnabled.includes(app.id);
            const isCustom = app.id.startsWith("custom_");
            return (
              <View key={app.id} style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: app.color + "33" }]}>
                  <AppIcon app={app} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{app.name}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {app.packageName}
                  </Text>
                </View>
                {isCustom && (
                  <TouchableOpacity
                    onPress={() => handleDeleteCustomApp(app)}
                    style={styles.deleteBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={16} color="rgba(248,113,113,0.7)" />
                  </TouchableOpacity>
                )}
                <Switch
                  value={isEnabled}
                  onValueChange={(val) => toggleApp(app.id, val)}
                  trackColor={{ false: "rgba(255,255,255,0.1)", true: "#4A90E2" }}
                  thumbColor={isEnabled ? "#FFFFFF" : "rgba(255,255,255,0.5)"}
                />
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#4A90E2" />
            <Text style={styles.addBtnText}>Add Custom App</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* ── Add Custom App Modal ─────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Custom App</Text>
            <Text style={styles.modalSubtitle}>
              Enter the app name and its Android package name.
            </Text>

            <Text style={styles.fieldLabel}>App Name</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Facebook"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Package Name</Text>
            <TextInput
              style={styles.input}
              value={newPackage}
              onChangeText={setNewPackage}
              placeholder="e.g. com.facebook.katana"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleAddCustomApp}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setNewName("");
                  setNewPackage("");
                  setModalVisible(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleAddCustomApp}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Add App"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A1628" },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, width: 80 },
  backText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_400Regular" },
  title: { color: "#FFFFFF", fontSize: 18, fontFamily: "Inter_600SemiBold" },
  hint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  scroll: { flex: 1 },
  list: { padding: 12, gap: 8, paddingBottom: Platform.OS === "web" ? 34 : 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  rowSub: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  deleteBtn: { padding: 4 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(74,144,226,0.4)",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  addBtnText: {
    color: "#4A90E2",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#0F1F3A",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  modalSubtitle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
    lineHeight: 18,
  },
  fieldLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cancelBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#4A90E2",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
