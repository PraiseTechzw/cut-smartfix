/**
 * Multi-step Report Wizard
 * Steps:
 *  1. Location – campus → area → building → floor → room
 *  2. Category → subcategory
 *  3. Title + description
 *  4. Urgency + photo placeholder
 *  5. Review & submit
 */
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/auth";
import type {
  Area,
  Building,
  Campus,
  Category,
  Floor,
  Room,
  Subcategory,
  Urgency,
} from "@cut-smartfix/contracts";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const TOTAL_STEPS = 5;

// ---------------------------------------------------------------------------
// Offline queue helpers
// ---------------------------------------------------------------------------
let asyncStorageModule: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
} | null = null;

const memoryOfflineQueue: unknown[] = [];

async function getStorage() {
  if (asyncStorageModule) return asyncStorageModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-async-storage/async-storage");
    asyncStorageModule = mod.default ?? mod;
    return asyncStorageModule!;
  } catch {
    return {
      getItem: async (_k: string) => JSON.stringify(memoryOfflineQueue),
      setItem: async (_k: string, v: string) => {
        const parsed = JSON.parse(v);
        memoryOfflineQueue.length = 0;
        memoryOfflineQueue.push(...(Array.isArray(parsed) ? parsed : []));
      },
    };
  }
}

async function saveOffline(report: unknown) {
  const s = await getStorage();
  const existing = await s.getItem("cut_pending_reports");
  const queue: unknown[] = existing ? JSON.parse(existing) : [];
  queue.push(report);
  await s.setItem("cut_pending_reports", JSON.stringify(queue));
}

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------
function ProgressIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            i + 1 === current && styles.progressDotActive,
            i + 1 < current && styles.progressDotDone,
          ]}
        />
      ))}
      <Text style={styles.progressLabel}>
        Step {current} of {total}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Selection button list (replaces Picker)
// ---------------------------------------------------------------------------
function SelectionList<T extends { id: string; name: string }>({
  items,
  selected,
  onSelect,
  loading,
  emptyText,
}: {
  items: T[];
  selected: string | null;
  onSelect: (item: T) => void;
  loading?: boolean;
  emptyText?: string;
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0b6b57" />
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <Text style={styles.emptyText}>{emptyText ?? "No options available."}</Text>
    );
  }
  return (
    <View style={styles.selectionList}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={[
            styles.selectionItem,
            selected === item.id && styles.selectionItemActive,
          ]}
          onPress={() => onSelect(item)}
        >
          <Text
            style={[
              styles.selectionText,
              selected === item.id && styles.selectionTextActive,
            ]}
          >
            {item.name}
          </Text>
          {selected === item.id && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Success screen
// ---------------------------------------------------------------------------
function SuccessScreen({
  ticketNumber,
  offline,
}: {
  ticketNumber?: string;
  offline?: boolean;
}) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>{offline ? "📥" : "✅"}</Text>
        <Text style={styles.successTitle}>
          {offline ? "Saved Offline" : "Report Submitted!"}
        </Text>
        {offline ? (
          <Text style={styles.successBody}>
            Your report has been saved locally. It will be submitted
            automatically when you're back online.
          </Text>
        ) : (
          <>
            <Text style={styles.successBody}>
              Your maintenance request has been submitted successfully.
            </Text>
            {ticketNumber && (
              <View style={styles.ticketBox}>
                <Text style={styles.ticketLabel}>Ticket Number</Text>
                <Text style={styles.ticketValue}>{ticketNumber}</Text>
              </View>
            )}
          </>
        )}
        <Pressable
          style={styles.successBtn}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.successBtnText}>Back to Dashboard</Text>
        </Pressable>
        <Pressable
          style={styles.successSecondaryBtn}
          onPress={() => router.replace("/(tabs)/reports")}
        >
          <Text style={styles.successSecondaryText}>View My Reports</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------
export default function ReportWizardScreen() {
  const { token } = useAuth();

  // State
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [offline, setOffline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | undefined>();

  // Step 1: Location
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [loadingCampuses, setLoadingCampuses] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Step 2: Category
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Step 3: Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Step 4: Urgency
  const [urgency, setUrgency] = useState<Urgency>("normal");

  // ---------------------------------------------------------------------------
  // Data fetching helpers
  // ---------------------------------------------------------------------------
  const authHeader = useCallback(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  // Fetch campuses on mount
  useEffect(() => {
    setLoadingCampuses(true);
    fetch(`${API_URL}/v1/campuses`, { headers: authHeader() })
      .then((r) => r.json())
      .then((j) => setCampuses(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingCampuses(false));
  }, [authHeader]);

  // Fetch categories on step 2
  useEffect(() => {
    if (step !== 2 || categories.length > 0) return;
    setLoadingCategories(true);
    fetch(`${API_URL}/v1/categories`, { headers: authHeader() })
      .then((r) => r.json())
      .then((j) => setCategories(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, [step, categories.length, authHeader]);

  // Cascade: campus → areas
  useEffect(() => {
    if (!selectedCampus) return;
    setSelectedArea(null);
    setSelectedBuilding(null);
    setSelectedFloor(null);
    setSelectedRoom(null);
    setAreas([]);
    setBuildings([]);
    setFloors([]);
    setRooms([]);
    setLoadingAreas(true);
    fetch(`${API_URL}/v1/campuses/${selectedCampus.id}/areas`, {
      headers: authHeader(),
    })
      .then((r) => r.json())
      .then((j) => setAreas(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingAreas(false));
  }, [selectedCampus, authHeader]);

  // Cascade: area → buildings
  useEffect(() => {
    if (!selectedArea) return;
    setSelectedBuilding(null);
    setSelectedFloor(null);
    setSelectedRoom(null);
    setBuildings([]);
    setFloors([]);
    setRooms([]);
    setLoadingBuildings(true);
    fetch(`${API_URL}/v1/areas/${selectedArea.id}/buildings`, {
      headers: authHeader(),
    })
      .then((r) => r.json())
      .then((j) => setBuildings(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingBuildings(false));
  }, [selectedArea, authHeader]);

  // Cascade: building → floors
  useEffect(() => {
    if (!selectedBuilding) return;
    setSelectedFloor(null);
    setSelectedRoom(null);
    setFloors([]);
    setRooms([]);
    setLoadingFloors(true);
    fetch(`${API_URL}/v1/buildings/${selectedBuilding.id}/floors`, {
      headers: authHeader(),
    })
      .then((r) => r.json())
      .then((j) => setFloors(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingFloors(false));
  }, [selectedBuilding, authHeader]);

  // Cascade: floor → rooms
  useEffect(() => {
    if (!selectedFloor) return;
    setSelectedRoom(null);
    setRooms([]);
    setLoadingRooms(true);
    fetch(`${API_URL}/v1/floors/${selectedFloor.id}/rooms`, {
      headers: authHeader(),
    })
      .then((r) => r.json())
      .then((j) => setRooms(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, [selectedFloor, authHeader]);

  // ---------------------------------------------------------------------------
  // Navigation guards
  // ---------------------------------------------------------------------------
  function canProceed(): boolean {
    if (step === 1) return !!selectedCampus;
    if (step === 2) return !!selectedCategory;
    if (step === 3) return title.trim().length >= 3 && description.trim().length >= 10;
    if (step === 4) return true;
    return true;
  }

  function nextStep() {
    if (!canProceed()) {
      const hints: Record<number, string> = {
        1: "Please select at least a campus.",
        2: "Please select a category.",
        3: "Please enter a title (min 3 chars) and description (min 10 chars).",
      };
      Alert.alert("More info needed", hints[step] ?? "Please complete this step.");
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function handleSubmit() {
    setSubmitting(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      urgency,
      categoryId: selectedCategory?.id,
      subcategoryId: selectedSubcategory?.id,
      roomId: selectedRoom?.id,
      location: {
        roomId: selectedRoom?.id,
        roomName: selectedRoom?.name,
        floorName: selectedFloor?.name,
        buildingName: selectedBuilding?.name,
        areaName: selectedArea?.name,
        campusName: selectedCampus?.name,
      },
    };

    try {
      const res = await fetch(`${API_URL}/v1/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTicketNumber(json.data?.ticketNumber);
      setOffline(false);
      setSubmitted(true);
    } catch {
      // Save offline
      await saveOffline({ ...payload, savedAt: new Date().toISOString() });
      setOffline(true);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (submitted) {
    return <SuccessScreen ticketNumber={ticketNumber} offline={offline} />;
  }

  return (
    <SafeAreaView style={styles.page}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => (step === 1 ? router.back() : prevStep())}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Report Issue</Text>
        <View style={{ width: 60 }} />
      </View>

      <ProgressIndicator current={step} total={TOTAL_STEPS} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Step 1: Location ─── */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Where is the issue?</Text>

            <Text style={styles.sectionLabel}>Campus *</Text>
            <SelectionList
              items={campuses}
              selected={selectedCampus?.id ?? null}
              onSelect={setSelectedCampus}
              loading={loadingCampuses}
              emptyText="No campuses found."
            />

            {selectedCampus && (
              <>
                <Text style={styles.sectionLabel}>Area</Text>
                <SelectionList
                  items={areas}
                  selected={selectedArea?.id ?? null}
                  onSelect={setSelectedArea}
                  loading={loadingAreas}
                  emptyText="No areas found for this campus."
                />
              </>
            )}

            {selectedArea && (
              <>
                <Text style={styles.sectionLabel}>Building</Text>
                <SelectionList
                  items={buildings}
                  selected={selectedBuilding?.id ?? null}
                  onSelect={setSelectedBuilding}
                  loading={loadingBuildings}
                  emptyText="No buildings found."
                />
              </>
            )}

            {selectedBuilding && (
              <>
                <Text style={styles.sectionLabel}>Floor</Text>
                <SelectionList
                  items={floors}
                  selected={selectedFloor?.id ?? null}
                  onSelect={setSelectedFloor}
                  loading={loadingFloors}
                  emptyText="No floors found."
                />
              </>
            )}

            {selectedFloor && (
              <>
                <Text style={styles.sectionLabel}>Room</Text>
                <SelectionList
                  items={rooms}
                  selected={selectedRoom?.id ?? null}
                  onSelect={setSelectedRoom}
                  loading={loadingRooms}
                  emptyText="No rooms found."
                />
              </>
            )}
          </View>
        )}

        {/* ─── Step 2: Category ─── */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>What type of issue?</Text>

            <Text style={styles.sectionLabel}>Category *</Text>
            <SelectionList
              items={categories}
              selected={selectedCategory?.id ?? null}
              onSelect={(c) => {
                setSelectedCategory(c as Category);
                setSelectedSubcategory(null);
              }}
              loading={loadingCategories}
              emptyText="No categories found."
            />

            {selectedCategory &&
              selectedCategory.subcategories &&
              selectedCategory.subcategories.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Subcategory</Text>
                  <SelectionList
                    items={selectedCategory.subcategories}
                    selected={selectedSubcategory?.id ?? null}
                    onSelect={setSelectedSubcategory}
                  />
                </>
              )}
          </View>
        )}

        {/* ─── Step 3: Details ─── */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Describe the issue</Text>

            <Text style={styles.sectionLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Broken tap in Lab 2"
              placeholderTextColor="#9caea5"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />
            <Text style={styles.charCount}>{title.length}/120</Text>

            <Text style={styles.sectionLabel}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the problem in detail — what happened, when, how severe..."
              placeholderTextColor="#9caea5"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{description.length}/1000</Text>
          </View>
        )}

        {/* ─── Step 4: Urgency + Photo ─── */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>How urgent is this?</Text>

            <View style={styles.urgencyGrid}>
              {(
                [
                  { value: "low", label: "Low", emoji: "🟢", desc: "Minor inconvenience" },
                  { value: "normal", label: "Normal", emoji: "🟡", desc: "Standard priority" },
                  { value: "high", label: "High", emoji: "🟠", desc: "Affects daily operations" },
                  {
                    value: "emergency",
                    label: "Emergency",
                    emoji: "🔴",
                    desc: "Safety risk / critical",
                  },
                ] as { value: Urgency; label: string; emoji: string; desc: string }[]
              ).map((u) => (
                <Pressable
                  key={u.value}
                  style={[
                    styles.urgencyCard,
                    urgency === u.value && styles.urgencyCardActive,
                  ]}
                  onPress={() => setUrgency(u.value)}
                >
                  <Text style={styles.urgencyEmoji}>{u.emoji}</Text>
                  <Text
                    style={[
                      styles.urgencyLabel,
                      urgency === u.value && styles.urgencyLabelActive,
                    ]}
                  >
                    {u.label}
                  </Text>
                  <Text style={styles.urgencyDesc}>{u.desc}</Text>
                </Pressable>
              ))}
            </View>

            {/* Photo placeholder */}
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
              Photo Evidence
            </Text>
            <Pressable
              style={styles.photoPlaceholder}
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Photo upload will be available in a future update.",
                )
              }
            >
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoText}>Add a photo</Text>
              <Text style={styles.photoSubtext}>(Coming soon)</Text>
            </Pressable>
          </View>
        )}

        {/* ─── Step 5: Review ─── */}
        {step === 5 && (
          <View>
            <Text style={styles.stepTitle}>Review your report</Text>

            <View style={styles.reviewCard}>
              <ReviewRow label="Campus" value={selectedCampus?.name ?? "—"} />
              {selectedArea && (
                <ReviewRow label="Area" value={selectedArea.name} />
              )}
              {selectedBuilding && (
                <ReviewRow label="Building" value={selectedBuilding.name} />
              )}
              {selectedFloor && (
                <ReviewRow label="Floor" value={selectedFloor.name} />
              )}
              {selectedRoom && (
                <ReviewRow label="Room" value={selectedRoom.name} />
              )}
              <View style={styles.reviewDivider} />
              <ReviewRow
                label="Category"
                value={selectedCategory?.name ?? "—"}
              />
              {selectedSubcategory && (
                <ReviewRow
                  label="Subcategory"
                  value={selectedSubcategory.name}
                />
              )}
              <View style={styles.reviewDivider} />
              <ReviewRow label="Title" value={title} />
              <ReviewRow label="Description" value={description} />
              <View style={styles.reviewDivider} />
              <ReviewRow label="Urgency" value={urgency.toUpperCase()} />
            </View>

            {!token && (
              <View style={styles.authWarning}>
                <Text style={styles.authWarningText}>
                  ⚠️ You are not signed in. Your report will be saved offline.
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Report</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.navBar}>
        <Pressable
          style={[styles.navBtn, styles.navBtnSecondary]}
          onPress={() => (step === 1 ? router.back() : prevStep())}
        >
          <Text style={styles.navBtnSecondaryText}>
            {step === 1 ? "Cancel" : "Back"}
          </Text>
        </Pressable>
        {step < TOTAL_STEPS ? (
          <Pressable style={styles.navBtn} onPress={nextStep}>
            <Text style={styles.navBtnText}>Next →</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7f2" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    color: "#0b6b57",
    fontSize: 16,
    fontWeight: "600",
    width: 60,
  },
  topBarTitle: {
    color: "#17231f",
    fontSize: 16,
    fontWeight: "700",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#c5d4c9",
  },
  progressDotActive: {
    backgroundColor: "#0b6b57",
    width: 24,
    borderRadius: 5,
  },
  progressDotDone: {
    backgroundColor: "#0b6b57",
    opacity: 0.5,
  },
  progressLabel: {
    color: "#52615b",
    fontSize: 12,
    marginLeft: 6,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  stepTitle: {
    color: "#17231f",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 20,
  },
  sectionLabel: {
    color: "#52615b",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectionList: {
    gap: 8,
  },
  selectionItem: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#d7e0d9",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectionItemActive: {
    borderColor: "#0b6b57",
    backgroundColor: "#f0f9f6",
  },
  selectionText: {
    color: "#17231f",
    fontSize: 15,
    flex: 1,
  },
  selectionTextActive: {
    color: "#0b6b57",
    fontWeight: "700",
  },
  checkmark: {
    color: "#0b6b57",
    fontSize: 16,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#fff",
    borderColor: "#d7e0d9",
    borderWidth: 1,
    borderRadius: 10,
    color: "#17231f",
    fontSize: 16,
    padding: 15,
  },
  textArea: {
    minHeight: 130,
    textAlignVertical: "top",
  },
  charCount: {
    color: "#52615b",
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  urgencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  urgencyCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#d7e0d9",
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  urgencyCardActive: {
    borderColor: "#0b6b57",
    backgroundColor: "#f0f9f6",
  },
  urgencyEmoji: { fontSize: 28 },
  urgencyLabel: {
    color: "#17231f",
    fontSize: 15,
    fontWeight: "700",
  },
  urgencyLabelActive: {
    color: "#0b6b57",
  },
  urgencyDesc: {
    color: "#52615b",
    fontSize: 11,
    textAlign: "center",
  },
  photoPlaceholder: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#d7e0d9",
    borderStyle: "dashed",
    padding: 28,
    alignItems: "center",
    gap: 6,
  },
  photoIcon: { fontSize: 36 },
  photoText: { color: "#17231f", fontSize: 15, fontWeight: "600" },
  photoSubtext: { color: "#52615b", fontSize: 12 },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  reviewRow: {
    flexDirection: "row",
    gap: 12,
  },
  reviewLabel: {
    color: "#52615b",
    fontSize: 13,
    fontWeight: "600",
    width: 90,
    flexShrink: 0,
  },
  reviewValue: {
    color: "#17231f",
    fontSize: 14,
    flex: 1,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: "#f0f4f1",
    marginVertical: 4,
  },
  authWarning: {
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  authWarningText: {
    color: "#856404",
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: "#0b6b57",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    shadowColor: "#0b6b57",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  navBar: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
    backgroundColor: "#f4f7f2",
    borderTopWidth: 1,
    borderTopColor: "#e4ede7",
  },
  navBtn: {
    flex: 1,
    backgroundColor: "#0b6b57",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  navBtnSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#c5d4c9",
  },
  navBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  navBtnSecondaryText: { color: "#52615b", fontWeight: "700", fontSize: 15 },
  center: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#52615b",
    fontSize: 14,
    padding: 12,
  },
  // Success screen
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  successIcon: { fontSize: 64 },
  successTitle: {
    color: "#17231f",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  successBody: {
    color: "#52615b",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  ticketBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    width: "100%",
    marginVertical: 8,
    borderWidth: 2,
    borderColor: "#0b6b57",
    gap: 4,
  },
  ticketLabel: {
    color: "#52615b",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  ticketValue: {
    color: "#0b6b57",
    fontSize: 24,
    fontWeight: "900",
    fontFamily: "monospace" as const,
  },
  successBtn: {
    backgroundColor: "#0b6b57",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
    marginTop: 8,
  },
  successBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  successSecondaryBtn: {
    paddingVertical: 12,
  },
  successSecondaryText: {
    color: "#0b6b57",
    fontWeight: "700",
    fontSize: 15,
  },
});
