import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";
import type {
  CompletionEvidence,
  CreateFeedbackInput,
  MaintenanceReport,
  ReportAttachment,
  ReportFeedback,
  ReportStatus,
  ReportTimelineEvent,
} from "@cut-smartfix/contracts";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  submitted: { bg: "#fff3cd", text: "#92580a" },
  under_review: { bg: "#fff3cd", text: "#92580a" },
  reopened: { bg: "#fff3cd", text: "#92580a" },
  assigned: { bg: "#cce5ff", text: "#004085" },
  accepted: { bg: "#cce5ff", text: "#004085" },
  in_progress: { bg: "#cce5ff", text: "#004085" },
  waiting_for_materials: { bg: "#cce5ff", text: "#004085" },
  repair_completed: { bg: "#d4edda", text: "#155724" },
  under_verification: { bg: "#d4edda", text: "#155724" },
  closed: { bg: "#d4edda", text: "#155724" },
  rejected: { bg: "#f8d7da", text: "#721c24" },
  duplicate: { bg: "#f8d7da", text: "#721c24" },
  cancelled: { bg: "#f8d7da", text: "#721c24" },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#f8d7da", text: "#721c24" },
  high: { bg: "#ffe5d0", text: "#943c00" },
  medium: { bg: "#fff3cd", text: "#856404" },
  low: { bg: "#d4edda", text: "#155724" },
};

const TIMELINE_ICONS: Partial<Record<ReportStatus, string>> = {
  submitted: "📝",
  under_review: "🔍",
  assigned: "👷",
  accepted: "✅",
  in_progress: "🔧",
  waiting_for_materials: "📦",
  repair_completed: "🏁",
  under_verification: "🔎",
  closed: "✔️",
  rejected: "❌",
  cancelled: "🚫",
  reopened: "🔄",
};

/** Statuses where a student can request to reopen the issue */
const REOPENABLE_STATUSES: ReportStatus[] = [
  "closed",
  "repair_completed",
  "under_verification",
];

function StatusBadge({ status }: { status: ReportStatus }) {
  const c = STATUS_COLORS[status] ?? { bg: "#e9ecef", text: "#495057" };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  const c = PRIORITY_COLORS[priority] ?? { bg: "#e9ecef", text: "#495057" };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Text>
    </View>
  );
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-ZW", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Star rating
// ---------------------------------------------------------------------------
function StarRating({
  value,
  onChange,
  readonly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => !readonly && onChange?.(n)}
          disabled={readonly}
        >
          <Text style={[styles.star, n <= value && styles.starFilled]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEvent[]>([]);
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [evidence, setEvidence] = useState<CompletionEvidence[]>([]);
  const [feedback, setFeedback] = useState<ReportFeedback | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Feedback form state
  const [resolved, setResolved] = useState<boolean | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Reopen flow state
  const [reopenNote, setReopenNote] = useState("");
  const [reopening, setReopening] = useState(false);
  const [showReopenForm, setShowReopenForm] = useState(false);

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  );

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [reportRes, timelineRes, attachRes, evidenceRes, feedbackRes] =
        await Promise.allSettled([
          fetch(`${API_URL}/v1/reports/${id}`, { headers: authHeaders() }),
          fetch(`${API_URL}/v1/reports/${id}/timeline`, {
            headers: authHeaders(),
          }),
          fetch(`${API_URL}/v1/reports/${id}/attachments`, {
            headers: authHeaders(),
          }),
          fetch(`${API_URL}/v1/reports/${id}/evidence`, {
            headers: authHeaders(),
          }),
          fetch(`${API_URL}/v1/reports/${id}/feedback`, {
            headers: authHeaders(),
          }),
        ]);

      if (reportRes.status === "fulfilled" && reportRes.value.ok) {
        const j = await reportRes.value.json();
        setReport(j.data ?? null);
      } else {
        setError("Failed to load report.");
      }

      if (timelineRes.status === "fulfilled" && timelineRes.value.ok) {
        const j = await timelineRes.value.json();
        setTimeline(j.data ?? []);
      }

      if (attachRes.status === "fulfilled" && attachRes.value.ok) {
        const j = await attachRes.value.json();
        setAttachments(j.data ?? []);
      }

      if (evidenceRes.status === "fulfilled" && evidenceRes.value.ok) {
        const j = await evidenceRes.value.json();
        setEvidence(j.data ?? []);
      }

      if (feedbackRes.status === "fulfilled" && feedbackRes.value.ok) {
        const j = await feedbackRes.value.json();
        setFeedback(j.data ?? null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, authHeaders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Feedback submission
  // ---------------------------------------------------------------------------
  async function submitFeedback() {
    if (resolved === null) {
      Alert.alert("Please answer", "Was this issue resolved?");
      return;
    }
    setSubmittingFeedback(true);
    const body: CreateFeedbackInput = {
      resolved,
      rating: rating > 0 ? rating : undefined,
      comment: comment.trim() || undefined,
    };
    try {
      const res = await fetch(`${API_URL}/v1/reports/${id}/feedback`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setFeedback(j.data ?? null);

      // If the student says the problem is NOT resolved, show reopen option
      if (!resolved) {
        Alert.alert(
          "Problem not resolved?",
          "Would you like to reopen this ticket so the team can address it?",
          [
            {
              text: "Yes, Reopen",
              onPress: () => setShowReopenForm(true),
            },
            { text: "No, keep closed", style: "cancel" },
          ],
        );
      } else {
        Alert.alert("Thank you!", "Your feedback has been submitted.");
      }
    } catch (err) {
      Alert.alert("Failed to submit", (err as Error).message);
    } finally {
      setSubmittingFeedback(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Reopen
  // ---------------------------------------------------------------------------
  async function handleReopen() {
    setReopening(true);
    try {
      const res = await fetch(`${API_URL}/v1/reports/${id}/reopen`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          note: reopenNote.trim() || "Student indicated issue is not resolved.",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      Alert.alert(
        "Ticket Reopened",
        "Your ticket has been reopened. The maintenance team will review it again.",
        [{ text: "OK", onPress: () => loadData() }],
      );
      setShowReopenForm(false);
      setReopenNote("");
    } catch (err) {
      Alert.alert("Failed to reopen", (err as Error).message);
    } finally {
      setReopening(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.center}>
          <ActivityIndicator color="#0b6b57" size="large" />
          <Text style={styles.loadingText}>Loading ticket...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? "Report not found."}</Text>
          <Pressable style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>← Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const loc = report.location;
  const locationStr = [
    loc?.roomName,
    loc?.floorName,
    loc?.buildingName,
    loc?.areaName,
    loc?.campusName,
    loc?.room,
    loc?.floor,
    loc?.building,
    loc?.campus,
  ]
    .filter(Boolean)
    .join(", ");

  // Should we show the "Reopen" button?
  // Show it when: status is in REOPENABLE_STATUSES AND either
  //   - feedback has been submitted with resolved=false, OR
  //   - status is closed and no feedback yet (student may still want to reopen)
  const canReopen =
    REOPENABLE_STATUSES.includes(report.status) &&
    report.status !== "reopened";
  const showReopenButtonDirectly =
    canReopen && feedback && !feedback.resolved && !showReopenForm;
  const showReopenButtonClosed =
    report.status === "closed" && !feedback && !showReopenForm;

  return (
    <SafeAreaView style={styles.page}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {report.ticketNumber}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Ticket header */}
        <View style={styles.card}>
          <Text style={styles.ticketNumber}>{report.ticketNumber}</Text>
          <Text style={styles.title}>{report.title}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status={report.status} />
            <PriorityBadge priority={report.priority} />
          </View>
          <Text style={styles.description}>{report.description}</Text>
        </View>

        {/* Details grid */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Details</Text>
          {locationStr ? (
            <DetailRow label="Location" value={locationStr} />
          ) : null}
          {report.categoryName ? (
            <DetailRow label="Category" value={report.categoryName} />
          ) : null}
          {report.subcategoryName ? (
            <DetailRow label="Subcategory" value={report.subcategoryName} />
          ) : null}
          <DetailRow label="Urgency" value={report.urgency.toUpperCase()} />
          <DetailRow
            label="Submitted"
            value={formatDateTime(report.createdAt)}
          />
          {report.closedAt && (
            <DetailRow label="Closed" value={formatDateTime(report.closedAt)} />
          )}
          {report.assignedToName && (
            <DetailRow label="Assigned to" value={report.assignedToName} />
          )}
          {report.assignedDepartmentName && (
            <DetailRow
              label="Department"
              value={report.assignedDepartmentName}
            />
          )}
          {report.rejectionReason && (
            <DetailRow label="Rejection" value={report.rejectionReason} />
          )}
        </View>

        {/* Timeline */}
        {timeline.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Timeline</Text>
            {timeline.map((event, i) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <Text style={styles.timelineIcon}>
                    {TIMELINE_ICONS[event.status] ?? "🔹"}
                  </Text>
                  {i < timeline.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>
                    {event.status.replace(/_/g, " ")}
                  </Text>
                  {event.actorName && (
                    <Text style={styles.timelineActor}>
                      by {event.actorName}
                    </Text>
                  )}
                  {event.note && (
                    <Text style={styles.timelineNote}>{event.note}</Text>
                  )}
                  <Text style={styles.timelineDate}>
                    {formatDateTime(event.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Issue attachments (reporter photos) */}
        {attachments.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>
              Photos ({attachments.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {attachments.map((a) =>
                  a.signedUrl ? (
                    <Image
                      key={a.id}
                      source={{ uri: a.signedUrl }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View key={a.id} style={styles.thumbnailPlaceholder}>
                      <Text style={styles.thumbnailIcon}>🖼️</Text>
                      <Text style={styles.thumbnailName} numberOfLines={1}>
                        {a.fileName}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Technician completion evidence */}
        {evidence.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>
              ✅ Completion Evidence ({evidence.length})
            </Text>
            <Text style={styles.evidenceSubtitle}>
              Photos taken by the technician after completing the repair.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {evidence.map((e) =>
                  e.signedUrl ? (
                    <View key={e.id}>
                      <Image
                        source={{ uri: e.signedUrl }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                      {e.caption ? (
                        <Text style={styles.evidenceCaption} numberOfLines={2}>
                          {e.caption}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <View key={e.id} style={styles.thumbnailPlaceholder}>
                      <Text style={styles.thumbnailIcon}>🖼️</Text>
                      <Text style={styles.thumbnailName} numberOfLines={1}>
                        {e.fileName}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Feedback section — show when under_verification or repair_completed ── */}
        {(report.status === "under_verification" ||
          report.status === "repair_completed") && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Was this resolved?</Text>

            {feedback ? (
              /* Already submitted */
              <View style={styles.feedbackSubmitted}>
                <Text style={styles.feedbackSubmittedTitle}>
                  Your feedback was recorded ✓
                </Text>
                <Text style={styles.feedbackSubmittedDetail}>
                  Resolved: {feedback.resolved ? "Yes ✓" : "No ✗"}
                </Text>
                {feedback.rating !== undefined && feedback.rating > 0 && (
                  <View>
                    <Text style={styles.feedbackSubmittedDetail}>Rating:</Text>
                    <StarRating value={feedback.rating} readonly />
                  </View>
                )}
                {feedback.comment && (
                  <Text style={styles.feedbackSubmittedDetail}>
                    Comment: {feedback.comment}
                  </Text>
                )}
              </View>
            ) : (
              /* Show form */
              <View style={styles.feedbackForm}>
                <Text style={styles.feedbackQuestion}>
                  Has this issue been fixed to your satisfaction?
                </Text>
                <View style={styles.yesNoRow}>
                  <Pressable
                    style={[
                      styles.yesNoBtn,
                      resolved === true && styles.yesNoBtnActive,
                    ]}
                    onPress={() => setResolved(true)}
                  >
                    <Text
                      style={[
                        styles.yesNoText,
                        resolved === true && styles.yesNoTextActive,
                      ]}
                    >
                      ✓ Yes, resolved
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.yesNoBtn,
                      resolved === false && styles.yesNoBtnActiveNo,
                    ]}
                    onPress={() => setResolved(false)}
                  >
                    <Text
                      style={[
                        styles.yesNoText,
                        resolved === false && styles.yesNoTextActiveNo,
                      ]}
                    >
                      ✗ No, still broken
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.ratingLabel}>
                  Rate the service (optional)
                </Text>
                <StarRating value={rating} onChange={setRating} />

                <TextInput
                  style={[styles.input, styles.feedbackInput]}
                  placeholder="Additional comments (optional)"
                  placeholderTextColor="#9caea5"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  textAlignVertical="top"
                />

                <Pressable
                  style={[
                    styles.feedbackSubmitBtn,
                    submittingFeedback && styles.btnDisabled,
                  ]}
                  onPress={submitFeedback}
                  disabled={submittingFeedback}
                >
                  {submittingFeedback ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.feedbackSubmitText}>
                      Submit Feedback
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ── Reopen section ── */}

        {/* Direct reopen button — shown after feedback says "not resolved" */}
        {showReopenButtonDirectly && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Issue not resolved?</Text>
            <Text style={styles.reopenDescription}>
              You indicated the problem is still present. You can reopen this
              ticket so the maintenance team can address it again.
            </Text>
            <Pressable
              style={styles.reopenBtn}
              onPress={() => setShowReopenForm(true)}
            >
              <Text style={styles.reopenBtnText}>🔄 Reopen This Ticket</Text>
            </Pressable>
          </View>
        )}

        {/* Reopen button — for closed tickets with no feedback yet */}
        {showReopenButtonClosed && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Still having issues?</Text>
            <Text style={styles.reopenDescription}>
              If the problem was not resolved or has reoccurred, you can reopen
              this ticket.
            </Text>
            <Pressable
              style={styles.reopenBtn}
              onPress={() => setShowReopenForm(true)}
            >
              <Text style={styles.reopenBtnText}>🔄 Reopen This Ticket</Text>
            </Pressable>
          </View>
        )}

        {/* Reopen form */}
        {showReopenForm && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Reopen Ticket</Text>
            <Text style={styles.reopenDescription}>
              Please describe why the issue needs to be reopened.
            </Text>
            <TextInput
              style={[styles.input, styles.feedbackInput]}
              placeholder="e.g. The tap is still dripping after the repair..."
              placeholderTextColor="#9caea5"
              value={reopenNote}
              onChangeText={setReopenNote}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.reopenActions}>
              <Pressable
                style={styles.reopenCancelBtn}
                onPress={() => setShowReopenForm(false)}
              >
                <Text style={styles.reopenCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.reopenConfirmBtn,
                  reopening && styles.btnDisabled,
                ]}
                onPress={handleReopen}
                disabled={reopening}
              >
                {reopening ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.reopenConfirmText}>Confirm Reopen</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "monospace" as const,
    flex: 1,
    textAlign: "center",
  },
  content: { padding: 16, paddingBottom: 48 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketNumber: {
    color: "#0b6b57",
    fontFamily: "monospace" as const,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  title: {
    color: "#17231f",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    lineHeight: 26,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  badge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  description: {
    color: "#52615b",
    fontSize: 14,
    lineHeight: 21,
  },
  cardSectionTitle: {
    color: "#17231f",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4f1",
    gap: 12,
  },
  detailLabel: {
    color: "#52615b",
    fontSize: 13,
    width: 90,
    flexShrink: 0,
  },
  detailValue: {
    color: "#17231f",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  // Timeline
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  timelineLeft: {
    alignItems: "center",
    width: 30,
  },
  timelineIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#e4ede7",
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
    gap: 2,
  },
  timelineStatus: {
    color: "#17231f",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  timelineActor: {
    color: "#52615b",
    fontSize: 12,
  },
  timelineNote: {
    color: "#52615b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  timelineDate: {
    color: "#9caea5",
    fontSize: 11,
    marginTop: 4,
  },
  // Attachments / Evidence
  photoRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#e8ede9",
  },
  thumbnailPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#e8ede9",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 8,
  },
  thumbnailIcon: { fontSize: 28 },
  thumbnailName: { color: "#52615b", fontSize: 10, textAlign: "center" },
  evidenceSubtitle: {
    color: "#52615b",
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  evidenceCaption: {
    color: "#52615b",
    fontSize: 11,
    marginTop: 4,
    maxWidth: 100,
  },
  // Feedback
  feedbackForm: { gap: 12 },
  feedbackQuestion: {
    color: "#17231f",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  yesNoRow: {
    flexDirection: "row",
    gap: 10,
  },
  yesNoBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#c5d4c9",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  yesNoBtnActive: {
    borderColor: "#0b6b57",
    backgroundColor: "#f0f9f6",
  },
  yesNoBtnActiveNo: {
    borderColor: "#e05252",
    backgroundColor: "#fff5f5",
  },
  yesNoText: {
    color: "#52615b",
    fontWeight: "700",
    fontSize: 14,
  },
  yesNoTextActive: {
    color: "#0b6b57",
  },
  yesNoTextActiveNo: {
    color: "#e05252",
  },
  ratingLabel: {
    color: "#52615b",
    fontSize: 13,
    fontWeight: "600",
  },
  stars: {
    flexDirection: "row",
    gap: 8,
  },
  star: {
    fontSize: 32,
    color: "#c5d4c9",
  },
  starFilled: {
    color: "#e3b23c",
  },
  input: {
    backgroundColor: "#f4f7f2",
    borderColor: "#d7e0d9",
    borderWidth: 1,
    borderRadius: 10,
    color: "#17231f",
    fontSize: 15,
    padding: 14,
  },
  feedbackInput: {
    minHeight: 80,
  },
  feedbackSubmitBtn: {
    backgroundColor: "#0b6b57",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  feedbackSubmitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  feedbackSubmitted: {
    gap: 8,
    padding: 4,
  },
  feedbackSubmittedTitle: {
    color: "#155724",
    fontSize: 15,
    fontWeight: "700",
  },
  feedbackSubmittedDetail: {
    color: "#52615b",
    fontSize: 14,
  },
  // Reopen
  reopenDescription: {
    color: "#52615b",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  reopenBtn: {
    backgroundColor: "#e3b23c",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  reopenBtnText: {
    color: "#17231f",
    fontWeight: "700",
    fontSize: 15,
  },
  reopenActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  reopenCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#c5d4c9",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  reopenCancelText: {
    color: "#52615b",
    fontWeight: "700",
    fontSize: 15,
  },
  reopenConfirmBtn: {
    flex: 2,
    backgroundColor: "#e3b23c",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  reopenConfirmText: {
    color: "#17231f",
    fontWeight: "700",
    fontSize: 15,
  },
  // States
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  loadingText: { color: "#52615b", fontSize: 14 },
  errorText: { color: "#721c24", fontSize: 14, textAlign: "center" },
  retryBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0b6b57",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: "#0b6b57", fontWeight: "700" },
  backLink: { color: "#0b6b57", fontSize: 15, fontWeight: "600" },
});
