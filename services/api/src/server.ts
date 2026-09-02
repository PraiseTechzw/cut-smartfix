import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { z } from "zod";
import type {
  AuditLog,
  ApiResponse,
  Assignment,
  Category,
  Campus,
  Area,
  Building,
  Floor,
  Room,
  Department,
  DashboardStats,
  MaintenanceNote,
  MaintenanceReport,
  MaterialRequest,
  Notification,
  ReportTimelineEvent,
  Subcategory,
  UserProfile,
} from "@cut-smartfix/contracts";

// ─────────────────────────────────────────
// Supabase client
// ─────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ─────────────────────────────────────────
// Zod input schemas
// ─────────────────────────────────────────
const uuidSchema = z.string().uuid();

const createReportSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  urgency: z.enum(["low", "normal", "high", "emergency"]),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  location: z.object({
    roomId: z.string().uuid().optional(),
    roomName: z.string().trim().max(120).optional(),
    floorName: z.string().trim().max(60).optional(),
    buildingName: z.string().trim().max(120).optional(),
    areaName: z.string().trim().max(120).optional(),
    campusName: z.string().trim().max(120).optional(),
    campus: z.string().trim().max(120).optional(),
    building: z.string().trim().max(120).optional(),
    floor: z.string().trim().max(60).optional(),
    room: z.string().trim().max(80).optional(),
  }),
});

const updateReportSchema = z.object({
  status: z
    .enum([
      "submitted",
      "under_review",
      "assigned",
      "accepted",
      "in_progress",
      "waiting_for_materials",
      "repair_completed",
      "under_verification",
      "closed",
      "rejected",
      "duplicate",
      "cancelled",
      "reopened",
    ])
    .optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  assignedDepartmentId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  rejectionReason: z.string().trim().max(2000).optional(),
  completionNotes: z.string().trim().max(5000).optional(),
  dueDate: z.string().datetime().optional(),
});

const attachmentSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-zA-Z0-9._-]+$/),
  contentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]),
  isEvidence: z.boolean().optional(),
});

const feedbackSchema = z.object({
  resolved: z.boolean(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(2000).optional(),
});

const createNoteSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  noteType: z
    .enum([
      "general",
      "diagnosis",
      "work_note",
      "completion",
      "verification",
      "rejection",
      "internal",
    ])
    .optional()
    .default("general"),
  isVisibleToStudent: z.boolean().optional().default(false),
});

const createAssignmentSchema = z.object({
  technicianId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  notes: z.string().trim().max(2000).optional(),
});

const assignmentUpdateSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  rejectedReason: z.string().trim().max(2000).optional(),
});

const materialRequestSchema = z.object({
  materialName: z.string().trim().min(2).max(200),
  quantity: z.number().int().min(1),
  unit: z.string().trim().max(40).optional().default("units"),
  reason: z.string().trim().min(5).max(1000),
});

const materialRequestUpdateSchema = z.object({
  status: z.enum(["approved", "rejected", "issued", "received"]),
  rejectionReason: z.string().trim().max(2000).optional(),
});

const locationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  campusId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
  floorId: z.string().uuid().optional(),
  levelNumber: z.number().int().optional(),
  roomNumber: z.string().trim().max(40).optional(),
  roomType: z.string().trim().max(80).optional(),
});

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  icon: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional(),
});

const subcategorySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional(),
});

const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  campusId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

// ─────────────────────────────────────────
// Auth / role types
// ─────────────────────────────────────────
type AuthenticatedRequest = express.Request & { user: UserProfile };
type Row = Record<string, unknown>;

// ─────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────
function sendError<T>(
  res: express.Response,
  status: number,
  code: string,
  message: string,
): void {
  const body: ApiResponse<T> = { data: null as T, error: { code, message } };
  res.status(status).json(body);
}

function ok<T>(res: express.Response, data: T, status = 200): void {
  res.status(status).json({ data, error: null });
}

function getClient(res: express.Response): SupabaseClient | null {
  if (!supabase) {
    sendError(
      res,
      503,
      "SERVICE_NOT_CONFIGURED",
      "Supabase is not configured.",
    );
  }
  return supabase;
}

// ─────────────────────────────────────────
// Row mappers
// ─────────────────────────────────────────
function mapReport(r: Row): MaintenanceReport {
  return {
    id: String(r.id),
    ticketNumber: String(r.ticket_number),
    reporterId: String(r.reporter_id),
    reporterName: r.reporter_name ? String(r.reporter_name) : undefined,
    reporterEmail: r.reporter_email ? String(r.reporter_email) : undefined,
    title: String(r.title),
    description: String(r.description),
    status: r.status as MaintenanceReport["status"],
    urgency: r.urgency as MaintenanceReport["urgency"],
    priority: r.priority as MaintenanceReport["priority"],
    location: (r.location ?? {}) as MaintenanceReport["location"],
    categoryId: r.category_id ? String(r.category_id) : undefined,
    categoryName: r.category_name ? String(r.category_name) : undefined,
    subcategoryId: r.subcategory_id ? String(r.subcategory_id) : undefined,
    subcategoryName: r.subcategory_name
      ? String(r.subcategory_name)
      : undefined,
    assignedDepartmentId: r.assigned_department_id
      ? String(r.assigned_department_id)
      : undefined,
    assignedDepartmentName: r.dept_name ? String(r.dept_name) : undefined,
    assignedTo: r.assigned_to ? String(r.assigned_to) : undefined,
    assignedToName: r.technician_name ? String(r.technician_name) : undefined,
    reviewedBy: r.reviewed_by ? String(r.reviewed_by) : undefined,
    reviewedAt: r.reviewed_at ? String(r.reviewed_at) : undefined,
    closedAt: r.closed_at ? String(r.closed_at) : undefined,
    dueDate: r.due_date ? String(r.due_date) : undefined,
    isOverdue: Boolean(r.is_overdue),
    rejectionReason: r.rejection_reason
      ? String(r.rejection_reason)
      : undefined,
    completionNotes: r.completion_notes
      ? String(r.completion_notes)
      : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapTimeline(r: Row): ReportTimelineEvent {
  return {
    id: String(r.id),
    reportId: String(r.report_id),
    status: r.status as ReportTimelineEvent["status"],
    note: r.note ? String(r.note) : undefined,
    actorId: r.created_by ? String(r.created_by) : undefined,
    actorName: r.actor_name ? String(r.actor_name) : undefined,
    createdAt: String(r.created_at),
    createdBy: r.created_by ? String(r.created_by) : undefined,
  };
}

function mapAssignment(r: Row): Assignment {
  return {
    id: String(r.id),
    reportId: String(r.report_id),
    ticketNumber: r.ticket_number ? String(r.ticket_number) : undefined,
    technicianId: String(r.technician_id),
    technicianName: r.technician_name ? String(r.technician_name) : undefined,
    assignedById: String(r.assigned_by),
    assignedByName: r.assigned_by_name ? String(r.assigned_by_name) : undefined,
    departmentId: r.department_id ? String(r.department_id) : undefined,
    departmentName: r.department_name ? String(r.department_name) : undefined,
    status: r.status as Assignment["status"],
    notes: r.notes ? String(r.notes) : undefined,
    rejectedReason: r.rejected_reason ? String(r.rejected_reason) : undefined,
    assignedAt: String(r.assigned_at),
    acceptedAt: r.accepted_at ? String(r.accepted_at) : undefined,
    completedAt: r.completed_at ? String(r.completed_at) : undefined,
    isCurrent: Boolean(r.is_current),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapNote(r: Row): MaintenanceNote {
  return {
    id: String(r.id),
    reportId: String(r.report_id),
    authorId: String(r.author_id),
    authorName: r.author_name ? String(r.author_name) : undefined,
    content: String(r.content),
    noteType: r.note_type as MaintenanceNote["noteType"],
    isVisibleToStudent: Boolean(r.is_visible_to_student),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapMaterialRequest(r: Row): MaterialRequest {
  return {
    id: String(r.id),
    reportId: String(r.report_id),
    ticketNumber: r.ticket_number ? String(r.ticket_number) : undefined,
    requestedById: String(r.requested_by),
    requestedByName: r.requester_name ? String(r.requester_name) : undefined,
    approvedById: r.approved_by ? String(r.approved_by) : undefined,
    approvedByName: r.approver_name ? String(r.approver_name) : undefined,
    materialName: String(r.material_name),
    quantity: Number(r.quantity),
    unit: String(r.unit),
    reason: String(r.reason),
    status: r.status as MaterialRequest["status"],
    rejectionReason: r.rejection_reason
      ? String(r.rejection_reason)
      : undefined,
    requestedAt: String(r.requested_at),
    decidedAt: r.decided_at ? String(r.decided_at) : undefined,
    issuedAt: r.issued_at ? String(r.issued_at) : undefined,
    receivedAt: r.received_at ? String(r.received_at) : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function mapNotification(r: Row): Notification {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    reportId: r.report_id ? String(r.report_id) : undefined,
    type: String(r.type ?? "info"),
    title: String(r.title),
    body: String(r.body),
    actionUrl: r.action_url ? String(r.action_url) : undefined,
    readAt: r.read_at ? String(r.read_at) : undefined,
    createdAt: String(r.created_at),
  };
}

function mapAuditLog(r: Row): AuditLog {
  return {
    id: String(r.id),
    actorId: r.actor_id ? String(r.actor_id) : undefined,
    actorName: r.actor_name ? String(r.actor_name) : undefined,
    action: String(r.action),
    entityType: String(r.entity_type),
    entityId: r.entity_id ? String(r.entity_id) : undefined,
    oldValues: r.old_values as Record<string, unknown> | undefined,
    newValues: r.new_values as Record<string, unknown> | undefined,
    metadata: r.metadata as Record<string, unknown> | undefined,
    ipAddress: r.ip_address ? String(r.ip_address) : undefined,
    createdAt: String(r.created_at),
  };
}

// ─────────────────────────────────────────
// Auth middleware
// ─────────────────────────────────────────
async function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): Promise<void> {
  if (!supabase) {
    sendError(
      res,
      503,
      "SERVICE_NOT_CONFIGURED",
      "Supabase is not configured.",
    );
    return;
  }
  const auth = req.header("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    sendError(res, 401, "UNAUTHENTICATED", "A Bearer token is required.");
    return;
  }
  const { data: authData, error: authError } =
    await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    sendError(
      res,
      401,
      "UNAUTHENTICATED",
      "The access token is invalid or expired.",
    );
    return;
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, department_id, is_active, avatar_url")
    .eq("id", authData.user.id)
    .single();
  if (profileError || !profile) {
    sendError(
      res,
      403,
      "PROFILE_NOT_FOUND",
      "The authenticated user has no profile.",
    );
    return;
  }
  if (!profile.is_active) {
    sendError(res, 403, "ACCOUNT_DISABLED", "Your account has been disabled.");
    return;
  }
  (req as AuthenticatedRequest).user = {
    id: String(profile.id),
    fullName: String(profile.full_name),
    email: String(profile.email),
    role: profile.role as UserProfile["role"],
    departmentId: profile.department_id
      ? String(profile.department_id)
      : undefined,
    isActive: Boolean(profile.is_active),
    avatarUrl: profile.avatar_url ? String(profile.avatar_url) : undefined,
    createdAt: new Date().toISOString(),
  };
  next();
}

function requireRole(...roles: UserProfile["role"][]) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!roles.includes(user.role)) {
      sendError(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission to perform this action.",
      );
      return;
    }
    next();
  };
}

// Helper: write audit log entry
async function audit(
  client: SupabaseClient,
  actorId: string,
  action: string,
  entityType: string,
  entityId?: string,
  newValues?: Record<string, unknown>,
  oldValues?: Record<string, unknown>,
): Promise<void> {
  await client.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_values: oldValues ?? null,
    new_values: newValues ?? null,
  });
}

// Helper: create notification
async function notify(
  client: SupabaseClient,
  userId: string,
  type: string,
  title: string,
  body: string,
  reportId?: string,
  actionUrl?: string,
): Promise<void> {
  await client.from("notifications").insert({
    user_id: userId,
    report_id: reportId ?? null,
    type,
    title,
    body,
    action_url: actionUrl ?? null,
  });
}

// ─────────────────────────────────────────
// Express setup
// ─────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "4mb" }));

// ─────────────────────────────────────────
// Health
// ─────────────────────────────────────────
app.get("/health", (_req, res) => {
  ok(res, { status: "ok", supabaseConfigured: Boolean(supabase) });
});

// ─────────────────────────────────────────
// Auth / me
// ─────────────────────────────────────────
app.get("/v1/me", requireAuth, (req, res) => {
  ok(res, (req as AuthenticatedRequest).user);
});

// ─────────────────────────────────────────
// Student: reports CRUD
// ─────────────────────────────────────────
app.get("/v1/reports", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const user = (req as AuthenticatedRequest).user;

  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.pageSize ?? "20"))),
  );
  const from = (page - 1) * pageSize;

  let query = client
    .from("maintenance_reports")
    .select("*, reporter:reporter_id(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (user.role === "student") query = query.eq("reporter_id", user.id);
  if (req.query.status) query = query.eq("status", String(req.query.status));
  if (req.query.priority)
    query = query.eq("priority", String(req.query.priority));
  if (req.query.search) {
    const s = `%${String(req.query.search)}%`;
    query = query.or(`title.ilike.${s},ticket_number.ilike.${s}`);
  }

  const { data, error, count } = await query;
  if (error) {
    sendError(res, 500, "REPORTS_QUERY_FAILED", error.message);
    return;
  }
  ok(res, {
    items: (data ?? []).map((r) =>
      mapReport({
        ...r,
        reporter_name: (r.reporter as Row)?.full_name,
        reporter_email: (r.reporter as Row)?.email,
      }),
    ),
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  });
});

app.post("/v1/reports", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input.",
    );
    return;
  }
  const user = (req as AuthenticatedRequest).user;
  const { data, error } = await client
    .from("maintenance_reports")
    .insert({
      reporter_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      urgency: parsed.data.urgency,
      category_id: parsed.data.categoryId ?? null,
      subcategory_id: parsed.data.subcategoryId ?? null,
      room_id: parsed.data.roomId ?? null,
      location: parsed.data.location,
      status: "submitted",
    })
    .select("*")
    .single();
  if (error) {
    sendError(res, 500, "REPORT_CREATE_FAILED", error.message);
    return;
  }
  await audit(
    client,
    user.id,
    "report.created",
    "maintenance_report",
    data.id as string,
    { ticket: data.ticket_number },
  );
  ok(res, mapReport(data as Row), 201);
});

app.get("/v1/reports/:id", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const user = (req as AuthenticatedRequest).user;
  const idParsed = uuidSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid report ID.");
    return;
  }

  let query = client
    .from("maintenance_reports")
    .select(
      `*, reporter:reporter_id(full_name, email), cat:category_id(name), sub:subcategory_id(name), dept:assigned_department_id(name), tech:assigned_to(full_name)`,
    )
    .eq("id", idParsed.data);

  if (user.role === "student") query = query.eq("reporter_id", user.id);
  else if (user.role === "technician")
    query = query.or(`reporter_id.eq.${user.id},assigned_to.eq.${user.id}`);

  const { data, error } = await query.maybeSingle();
  if (error) {
    sendError(res, 500, "REPORT_QUERY_FAILED", error.message);
    return;
  }
  if (!data) {
    sendError(res, 404, "REPORT_NOT_FOUND", "Maintenance report not found.");
    return;
  }
  ok(
    res,
    mapReport({
      ...data,
      reporter_name: (data.reporter as Row)?.full_name,
      reporter_email: (data.reporter as Row)?.email,
      category_name: (data.cat as Row)?.name,
      subcategory_name: (data.sub as Row)?.name,
      dept_name: (data.dept as Row)?.name,
      technician_name: (data.tech as Row)?.full_name,
    } as Row),
  );
});

app.patch(
  "/v1/reports/:id",
  requireAuth,
  requireRole("supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const idParsed = uuidSchema.safeParse(req.params.id);
    const parsed = updateReportSchema.safeParse(req.body);
    if (!idParsed.success || !parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const user = (req as AuthenticatedRequest).user;
    const { data: old } = await client
      .from("maintenance_reports")
      .select("*")
      .eq("id", idParsed.data)
      .single();
    const updates: Row = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.priority !== undefined)
      updates.priority = parsed.data.priority;
    if (parsed.data.assignedDepartmentId !== undefined)
      updates.assigned_department_id = parsed.data.assignedDepartmentId;
    if (parsed.data.assignedTo !== undefined)
      updates.assigned_to = parsed.data.assignedTo;
    if (parsed.data.rejectionReason !== undefined)
      updates.rejection_reason = parsed.data.rejectionReason;
    if (parsed.data.completionNotes !== undefined)
      updates.completion_notes = parsed.data.completionNotes;
    if (parsed.data.dueDate !== undefined)
      updates.due_date = parsed.data.dueDate;
    if (parsed.data.status === "under_review") {
      updates.reviewed_by = user.id;
      updates.reviewed_at = new Date().toISOString();
    }
    if (parsed.data.status === "closed")
      updates.closed_at = new Date().toISOString();

    const { data, error } = await client
      .from("maintenance_reports")
      .update(updates)
      .eq("id", idParsed.data)
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "REPORT_UPDATE_FAILED", error.message);
      return;
    }
    await audit(
      client,
      user.id,
      "report.updated",
      "maintenance_report",
      idParsed.data,
      updates,
      old as Row,
    );
    ok(res, mapReport(data as Row));
  },
);

// ─────────────────────────────────────────
// Timeline
// ─────────────────────────────────────────
app.get("/v1/reports/:id/timeline", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const idParsed = uuidSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid report ID.");
    return;
  }
  const { data, error } = await client
    .from("report_timeline")
    .select("*, actor:created_by(full_name, role)")
    .eq("report_id", idParsed.data)
    .order("created_at", { ascending: true });
  if (error) {
    sendError(res, 500, "TIMELINE_QUERY_FAILED", error.message);
    return;
  }
  ok(
    res,
    (data ?? []).map((r) =>
      mapTimeline({ ...r, actor_name: (r.actor as Row)?.full_name } as Row),
    ),
  );
});

// ─────────────────────────────────────────
// Attachments
// ─────────────────────────────────────────
app.get("/v1/reports/:id/attachments", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const idParsed = uuidSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid report ID.");
    return;
  }
  const { data, error } = await client
    .from("report_attachments")
    .select("*")
    .eq("report_id", idParsed.data)
    .order("created_at", { ascending: true });
  if (error) {
    sendError(res, 500, "ATTACHMENTS_QUERY_FAILED", error.message);
    return;
  }
  // Generate signed URLs for each attachment
  const withUrls = await Promise.all(
    (data ?? []).map(async (a) => {
      const { data: signed } = await client.storage
        .from(process.env.STORAGE_BUCKET ?? "maintenance-evidence")
        .createSignedUrl(a.storage_path as string, 3600);
      return { ...a, signedUrl: signed?.signedUrl };
    }),
  );
  ok(res, withUrls);
});

app.post("/v1/reports/:id/attachments/sign", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const idParsed = uuidSchema.safeParse(req.params.id);
  const input = attachmentSchema.safeParse(req.body);
  if (!idParsed.success || !input.success) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
    return;
  }
  const user = (req as AuthenticatedRequest).user;
  const bucket = process.env.STORAGE_BUCKET ?? "maintenance-evidence";
  const folder = input.data.isEvidence ? "evidence" : "attachments";
  const storagePath = `${user.id}/${idParsed.data}/${folder}/${crypto.randomUUID()}-${input.data.fileName}`;

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);
  if (error || !data) {
    sendError(
      res,
      502,
      "STORAGE_SIGN_FAILED",
      error?.message ?? "Could not create upload URL.",
    );
    return;
  }

  const table = input.data.isEvidence
    ? "completion_evidence"
    : "report_attachments";
  const { data: record, error: recErr } = await client
    .from(table)
    .insert({
      report_id: idParsed.data,
      uploaded_by: user.id,
      storage_path: storagePath,
      file_name: input.data.fileName,
      content_type: input.data.contentType,
    })
    .select("id, storage_path, file_name, content_type")
    .single();
  if (recErr) {
    sendError(res, 500, "ATTACHMENT_CREATE_FAILED", recErr.message);
    return;
  }
  ok(res, { ...record, token: data.token, path: storagePath }, 201);
});

// ─────────────────────────────────────────
// Notes
// ─────────────────────────────────────────
app.get("/v1/reports/:id/notes", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const idParsed = uuidSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid report ID.");
    return;
  }
  const user = (req as AuthenticatedRequest).user;
  let query = client
    .from("maintenance_notes")
    .select("*, author:author_id(full_name, role)")
    .eq("report_id", idParsed.data)
    .order("created_at", { ascending: true });
  if (user.role === "student") query = query.eq("is_visible_to_student", true);
  const { data, error } = await query;
  if (error) {
    sendError(res, 500, "NOTES_QUERY_FAILED", error.message);
    return;
  }
  ok(
    res,
    (data ?? []).map((r) =>
      mapNote({ ...r, author_name: (r.author as Row)?.full_name } as Row),
    ),
  );
});

app.post(
  "/v1/reports/:id/notes",
  requireAuth,
  requireRole("technician", "supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const idParsed = uuidSchema.safeParse(req.params.id);
    const parsed = createNoteSchema.safeParse(req.body);
    if (!idParsed.success || !parsed.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.success
          ? "Invalid report ID."
          : (parsed.error.issues[0]?.message ?? "Invalid input."),
      );
      return;
    }
    const user = (req as AuthenticatedRequest).user;
    const { data, error } = await client
      .from("maintenance_notes")
      .insert({
        report_id: idParsed.data,
        author_id: user.id,
        content: parsed.data.content,
        note_type: parsed.data.noteType,
        is_visible_to_student: parsed.data.isVisibleToStudent,
      })
      .select("*, author:author_id(full_name)")
      .single();
    if (error) {
      sendError(res, 500, "NOTE_CREATE_FAILED", error.message);
      return;
    }
    ok(
      res,
      mapNote({ ...data, author_name: (data.author as Row)?.full_name } as Row),
      201,
    );
  },
);

// ─────────────────────────────────────────
// Assignments
// ─────────────────────────────────────────
app.get(
  "/v1/reports/:id/assignments",
  requireAuth,
  requireRole("technician", "supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const idParsed = uuidSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid report ID.");
      return;
    }
    const { data, error } = await client
      .from("assignments")
      .select(
        "*, tech:technician_id(full_name), by:assigned_by(full_name), dept:department_id(name)",
      )
      .eq("report_id", idParsed.data)
      .order("assigned_at", { ascending: false });
    if (error) {
      sendError(res, 500, "ASSIGNMENTS_QUERY_FAILED", error.message);
      return;
    }
    ok(
      res,
      (data ?? []).map((r) =>
        mapAssignment({
          ...r,
          technician_name: (r.tech as Row)?.full_name,
          assigned_by_name: (r.by as Row)?.full_name,
          department_name: (r.dept as Row)?.name,
        } as Row),
      ),
    );
  },
);

app.post(
  "/v1/reports/:id/assignments",
  requireAuth,
  requireRole("supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const idParsed = uuidSchema.safeParse(req.params.id);
    const parsed = createAssignmentSchema.safeParse(req.body);
    if (!idParsed.success || !parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const user = (req as AuthenticatedRequest).user;
    // Mark previous current assignment as not current
    await client
      .from("assignments")
      .update({ is_current: false })
      .eq("report_id", idParsed.data)
      .eq("is_current", true);
    const { data, error } = await client
      .from("assignments")
      .insert({
        report_id: idParsed.data,
        technician_id: parsed.data.technicianId,
        assigned_by: user.id,
        department_id: parsed.data.departmentId ?? null,
        notes: parsed.data.notes ?? null,
        status: "assigned",
        is_current: true,
      })
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "ASSIGNMENT_CREATE_FAILED", error.message);
      return;
    }
    // Update report status and assigned_to
    await client
      .from("maintenance_reports")
      .update({
        status: "assigned",
        assigned_to: parsed.data.technicianId,
        assigned_department_id: parsed.data.departmentId ?? null,
      })
      .eq("id", idParsed.data);
    // Notify the technician
    const { data: report } = await client
      .from("maintenance_reports")
      .select("ticket_number, title")
      .eq("id", idParsed.data)
      .single();
    await notify(
      client,
      parsed.data.technicianId,
      "assignment",
      "New maintenance assignment",
      `You have been assigned ticket ${(report as Row)?.ticket_number}: ${(report as Row)?.title}`,
      idParsed.data,
    );
    await audit(
      client,
      user.id,
      "assignment.created",
      "assignment",
      data.id as string,
      { technicianId: parsed.data.technicianId },
    );
    ok(res, mapAssignment(data as Row), 201);
  },
);

app.patch(
  "/v1/assignments/:id",
  requireAuth,
  requireRole("technician", "supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const idParsed = uuidSchema.safeParse(req.params.id);
    const parsed = assignmentUpdateSchema.safeParse(req.body);
    if (!idParsed.success || !parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const user = (req as AuthenticatedRequest).user;
    const updates: Row = { status: parsed.data.status };
    if (parsed.data.status === "accepted")
      updates.accepted_at = new Date().toISOString();
    if (parsed.data.rejectedReason)
      updates.rejected_reason = parsed.data.rejectedReason;
    const { data, error } = await client
      .from("assignments")
      .update(updates)
      .eq("id", idParsed.data)
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "ASSIGNMENT_UPDATE_FAILED", error.message);
      return;
    }
    // Mirror status to report
    if (parsed.data.status === "accepted") {
      await client
        .from("maintenance_reports")
        .update({ status: "accepted" })
        .eq("id", data.report_id as string);
    }
    await audit(
      client,
      user.id,
      "assignment.updated",
      "assignment",
      idParsed.data,
      updates,
    );
    ok(res, mapAssignment(data as Row));
  },
);

// ─────────────────────────────────────────
// Staff tasks view
// ─────────────────────────────────────────
app.get(
  "/v1/tasks",
  requireAuth,
  requireRole("technician", "supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const user = (req as AuthenticatedRequest).user;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.pageSize ?? "20"))),
    );
    const from = (page - 1) * pageSize;

    let query = client
      .from("maintenance_reports")
      .select(
        "*, reporter:reporter_id(full_name, email), dept:assigned_department_id(name)",
        { count: "exact" },
      )
      .not("status", "in", `(closed,cancelled,rejected,duplicate)`)
      .order("priority", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (user.role === "technician") query = query.eq("assigned_to", user.id);
    if (req.query.status) query = query.eq("status", String(req.query.status));

    const { data, error, count } = await query;
    if (error) {
      sendError(res, 500, "TASKS_QUERY_FAILED", error.message);
      return;
    }
    ok(res, {
      items: (data ?? []).map((r) =>
        mapReport({
          ...r,
          reporter_name: (r.reporter as Row)?.full_name,
          dept_name: (r.dept as Row)?.name,
        } as Row),
      ),
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  },
);

app.patch(
  "/v1/tasks/:id",
  requireAuth,
  requireRole("technician", "supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const idParsed = uuidSchema.safeParse(req.params.id);
    const parsed = updateReportSchema.safeParse(req.body);
    if (!idParsed.success || !parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const user = (req as AuthenticatedRequest).user;
    const updates: Row = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.completionNotes !== undefined)
      updates.completion_notes = parsed.data.completionNotes;
    if (parsed.data.status === "closed")
      updates.closed_at = new Date().toISOString();

    let query = client
      .from("maintenance_reports")
      .update(updates)
      .eq("id", idParsed.data);
    if (user.role === "technician") query = query.eq("assigned_to", user.id);

    const { data, error } = await query.select("*").maybeSingle();
    if (error) {
      sendError(res, 500, "TASK_UPDATE_FAILED", error.message);
      return;
    }
    if (!data) {
      sendError(
        res,
        404,
        "TASK_NOT_FOUND",
        "Task not found or not assigned to you.",
      );
      return;
    }
    // Insert timeline event
    await client.from("report_timeline").insert({
      report_id: idParsed.data,
      status: parsed.data.status,
      created_by: user.id,
      note: (req.body as Row).note ?? null,
    });
    await audit(
      client,
      user.id,
      "task.updated",
      "maintenance_report",
      idParsed.data,
      updates,
    );
    ok(res, mapReport(data as Row));
  },
);

// ─────────────────────────────────────────
// Material requests
// ─────────────────────────────────────────
app.get("/v1/reports/:id/materials", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const idParsed = uuidSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid report ID.");
    return;
  }
  const { data, error } = await client
    .from("material_requests")
    .select(
      "*, requester:requested_by(full_name), approver:approved_by(full_name)",
    )
    .eq("report_id", idParsed.data)
    .order("created_at", { ascending: false });
  if (error) {
    sendError(res, 500, "MATERIALS_QUERY_FAILED", error.message);
    return;
  }
  ok(
    res,
    (data ?? []).map((r) =>
      mapMaterialRequest({
        ...r,
        requester_name: (r.requester as Row)?.full_name,
        approver_name: (r.approver as Row)?.full_name,
      } as Row),
    ),
  );
});

app.post(
  "/v1/reports/:id/materials",
  requireAuth,
  requireRole("technician", "supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const idParsed = uuidSchema.safeParse(req.params.id);
    const parsed = materialRequestSchema.safeParse(req.body);
    if (!idParsed.success || !parsed.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.success
          ? "Invalid report ID."
          : (parsed.error.issues[0]?.message ?? "Invalid input."),
      );
      return;
    }
    const user = (req as AuthenticatedRequest).user;
    const { data, error } = await client
      .from("material_requests")
      .insert({
        report_id: idParsed.data,
        requested_by: user.id,
        material_name: parsed.data.materialName,
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
        reason: parsed.data.reason,
        status: "requested",
      })
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "MATERIAL_REQUEST_CREATE_FAILED", error.message);
      return;
    }
    // Update report status to waiting_for_materials
    await client
      .from("maintenance_reports")
      .update({ status: "waiting_for_materials" })
      .eq("id", idParsed.data)
      .eq("status", "in_progress");
    await audit(
      client,
      user.id,
      "material.requested",
      "material_request",
      data.id as string,
      { material: parsed.data.materialName },
    );
    ok(res, mapMaterialRequest(data as Row), 201);
  },
);

app.patch(
  "/v1/materials/:id",
  requireAuth,
  requireRole("supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const idParsed = uuidSchema.safeParse(req.params.id);
    const parsed = materialRequestUpdateSchema.safeParse(req.body);
    if (!idParsed.success || !parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const user = (req as AuthenticatedRequest).user;
    const updates: Row = {
      status: parsed.data.status,
      decided_at: new Date().toISOString(),
      approved_by: user.id,
    };
    if (parsed.data.rejectionReason)
      updates.rejection_reason = parsed.data.rejectionReason;
    if (parsed.data.status === "issued")
      updates.issued_at = new Date().toISOString();
    if (parsed.data.status === "received")
      updates.received_at = new Date().toISOString();
    const { data, error } = await client
      .from("material_requests")
      .update(updates)
      .eq("id", idParsed.data)
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "MATERIAL_UPDATE_FAILED", error.message);
      return;
    }
    await notify(
      client,
      (data as Row).requested_by as string,
      "material_decision",
      `Material request ${parsed.data.status}`,
      `Your material request for "${(data as Row).material_name}" has been ${parsed.data.status}.`,
      (data as Row).report_id as string,
    );
    await audit(
      client,
      user.id,
      `material.${parsed.data.status}`,
      "material_request",
      idParsed.data,
      updates,
    );
    ok(res, mapMaterialRequest(data as Row));
  },
);

// List all pending material requests (for supervisors/admins)
app.get(
  "/v1/materials",
  requireAuth,
  requireRole("technician", "supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const user = (req as AuthenticatedRequest).user;
    let query = client
      .from("material_requests")
      .select(
        "*, requester:requested_by(full_name), report:report_id(ticket_number, title)",
      )
      .order("created_at", { ascending: false });
    if (user.role === "technician") query = query.eq("requested_by", user.id);
    if (req.query.status) query = query.eq("status", String(req.query.status));
    else query = query.eq("status", "requested");
    const { data, error } = await query;
    if (error) {
      sendError(res, 500, "MATERIALS_QUERY_FAILED", error.message);
      return;
    }
    ok(
      res,
      (data ?? []).map((r) =>
        mapMaterialRequest({
          ...r,
          requester_name: (r.requester as Row)?.full_name,
          ticket_number: (r.report as Row)?.ticket_number,
        } as Row),
      ),
    );
  },
);

// ─────────────────────────────────────────
// Feedback
// ─────────────────────────────────────────
app.post("/v1/reports/:id/feedback", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const idParsed = uuidSchema.safeParse(req.params.id);
  const parsed = feedbackSchema.safeParse(req.body);
  if (!idParsed.success || !parsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid feedback.");
    return;
  }
  const user = (req as AuthenticatedRequest).user;
  const { data, error } = await client
    .from("report_feedback")
    .upsert(
      { report_id: idParsed.data, submitted_by: user.id, ...parsed.data },
      { onConflict: "report_id" },
    )
    .select("*")
    .single();
  if (error) {
    sendError(res, 500, "FEEDBACK_SAVE_FAILED", error.message);
    return;
  }
  // If not resolved, reopen the ticket
  if (!parsed.data.resolved) {
    await client
      .from("maintenance_reports")
      .update({ status: "reopened" })
      .eq("id", idParsed.data);
    await client.from("report_timeline").insert({
      report_id: idParsed.data,
      status: "reopened",
      created_by: user.id,
      note: "Student indicated issue is not resolved.",
    });
  } else {
    await client
      .from("maintenance_reports")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", idParsed.data);
    await client.from("report_timeline").insert({
      report_id: idParsed.data,
      status: "closed",
      created_by: user.id,
      note: "Student confirmed issue resolved.",
    });
  }
  await audit(
    client,
    user.id,
    "feedback.submitted",
    "report_feedback",
    data.id as string,
    parsed.data as Record<string, unknown>,
  );
  ok(res, data, 201);
});

// ─────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────
app.get("/v1/notifications", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const user = (req as AuthenticatedRequest).user;
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) {
    sendError(res, 500, "NOTIFICATIONS_QUERY_FAILED", error.message);
    return;
  }
  ok(res, (data ?? []).map(mapNotification));
});

app.patch("/v1/notifications/:id/read", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const idParsed = uuidSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid notification ID.");
    return;
  }
  const user = (req as AuthenticatedRequest).user;
  const { data, error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", idParsed.data)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error) {
    sendError(res, 500, "NOTIFICATION_UPDATE_FAILED", error.message);
    return;
  }
  if (!data) {
    sendError(res, 404, "NOTIFICATION_NOT_FOUND", "Notification not found.");
    return;
  }
  ok(res, mapNotification(data as Row));
});

app.patch("/v1/notifications/read-all", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const user = (req as AuthenticatedRequest).user;
  await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  ok(res, { success: true });
});

// ─────────────────────────────────────────
// Catalog (locations, categories) – public read for authenticated users
// ─────────────────────────────────────────
// Campuses
app.get("/v1/campuses", requireAuth, async (_req, res) => {
  const client = getClient(res);
  if (!client) return;
  const { data, error } = await client
    .from("campuses")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) {
    sendError(res, 500, "QUERY_FAILED", error.message);
    return;
  }
  ok(
    res,
    (data ?? []).map(
      (r) =>
        ({
          id: r.id,
          name: r.name,
          code: r.code,
          address: r.address,
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }) as Campus,
    ),
  );
});

app.get("/v1/campuses/:id/areas", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const { data, error } = await client
    .from("areas")
    .select("*")
    .eq("campus_id", req.params.id)
    .eq("is_active", true)
    .order("name");
  if (error) {
    sendError(res, 500, "QUERY_FAILED", error.message);
    return;
  }
  ok(
    res,
    (data ?? []).map(
      (r) =>
        ({
          id: r.id,
          campusId: r.campus_id,
          name: r.name,
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }) as Area,
    ),
  );
});

app.get("/v1/areas/:id/buildings", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const { data, error } = await client
    .from("buildings")
    .select("*")
    .eq("area_id", req.params.id)
    .eq("is_active", true)
    .order("name");
  if (error) {
    sendError(res, 500, "QUERY_FAILED", error.message);
    return;
  }
  ok(
    res,
    (data ?? []).map(
      (r) =>
        ({
          id: r.id,
          areaId: r.area_id,
          name: r.name,
          code: r.code,
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }) as Building,
    ),
  );
});

app.get("/v1/buildings/:id/floors", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const { data, error } = await client
    .from("floors")
    .select("*")
    .eq("building_id", req.params.id)
    .eq("is_active", true)
    .order("level_number", { ascending: true });
  if (error) {
    sendError(res, 500, "QUERY_FAILED", error.message);
    return;
  }
  ok(
    res,
    (data ?? []).map(
      (r) =>
        ({
          id: r.id,
          buildingId: r.building_id,
          name: r.name,
          levelNumber: r.level_number,
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }) as Floor,
    ),
  );
});

app.get("/v1/floors/:id/rooms", requireAuth, async (req, res) => {
  const client = getClient(res);
  if (!client) return;
  const { data, error } = await client
    .from("rooms")
    .select("*")
    .eq("floor_id", req.params.id)
    .eq("is_active", true)
    .order("name");
  if (error) {
    sendError(res, 500, "QUERY_FAILED", error.message);
    return;
  }
  ok(
    res,
    (data ?? []).map(
      (r) =>
        ({
          id: r.id,
          floorId: r.floor_id,
          name: r.name,
          roomNumber: r.room_number,
          roomType: r.room_type,
          isActive: r.is_active,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }) as Room,
    ),
  );
});

// Categories
app.get("/v1/categories", requireAuth, async (_req, res) => {
  const client = getClient(res);
  if (!client) return;
  const { data, error } = await client
    .from("categories")
    .select("*, subcategories(*)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    sendError(res, 500, "QUERY_FAILED", error.message);
    return;
  }
  ok(
    res,
    (data ?? []).map(
      (r) =>
        ({
          id: r.id,
          name: r.name,
          icon: r.icon,
          description: r.description,
          sortOrder: r.sort_order,
          isActive: r.is_active,
          subcategories: ((r.subcategories as Row[]) ?? []).map(
            (s) =>
              ({
                id: s.id,
                categoryId: s.category_id,
                name: s.name,
                sortOrder: s.sort_order,
                isActive: s.is_active,
              }) as Subcategory,
          ),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }) as Category,
    ),
  );
});

// Departments (readable by all staff)
app.get("/v1/departments", requireAuth, async (_req, res) => {
  const client = getClient(res);
  if (!client) return;
  const { data, error } = await client
    .from("departments")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) {
    sendError(res, 500, "QUERY_FAILED", error.message);
    return;
  }
  ok(
    res,
    (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  );
});

// Staff list (for assignments)
app.get(
  "/v1/staff",
  requireAuth,
  requireRole("supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    let query = client
      .from("profiles")
      .select("id, full_name, email, role, department_id, is_active")
      .in("role", ["technician", "supervisor"])
      .eq("is_active", true);
    if (req.query.departmentId)
      query = query.eq("department_id", String(req.query.departmentId));
    const { data, error } = await query.order("full_name");
    if (error) {
      sendError(res, 500, "QUERY_FAILED", error.message);
      return;
    }
    ok(res, data ?? []);
  },
);

// ─────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────
app.get(
  "/v1/analytics/dashboard",
  requireAuth,
  requireRole("supervisor", "administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const q = analyticsQuerySchema.safeParse(req.query);
    const from = q.data?.from
      ? q.data.from
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = q.data?.to ? q.data.to : new Date().toISOString();

    const { data: reports, error } = await client
      .from("maintenance_reports")
      .select(
        "id, status, priority, category_id, assigned_department_id, assigned_to, created_at, closed_at, is_overdue",
      );
    if (error) {
      sendError(res, 500, "ANALYTICS_FAILED", error.message);
      return;
    }

    const all = reports ?? [];
    const stats: DashboardStats = {
      total: all.length,
      pending: all.filter((r) =>
        ["submitted", "under_review"].includes(r.status),
      ).length,
      assigned: all.filter((r) => ["assigned", "accepted"].includes(r.status))
        .length,
      inProgress: all.filter((r) => r.status === "in_progress").length,
      waitingMaterials: all.filter((r) => r.status === "waiting_for_materials")
        .length,
      overdue: all.filter((r) => r.is_overdue).length,
      critical: all.filter((r) => r.priority === "critical").length,
      completed: all.filter((r) =>
        ["repair_completed", "under_verification"].includes(r.status),
      ).length,
      closed: all.filter((r) => r.status === "closed").length,
      reopened: all.filter((r) => r.status === "reopened").length,
      rejected: all.filter((r) =>
        ["rejected", "cancelled", "duplicate"].includes(r.status),
      ).length,
    };

    // By status
    const statusCounts: Record<string, number> = {};
    all.forEach((r) => {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    });
    const byStatus = Object.entries(statusCounts).map(([label, value]) => ({
      label,
      value,
    }));

    // By priority
    const priorityCounts: Record<string, number> = {};
    all.forEach((r) => {
      if (r.priority) {
        priorityCounts[r.priority] = (priorityCounts[r.priority] ?? 0) + 1;
      }
    });
    const byPriority = Object.entries(priorityCounts).map(([label, value]) => ({
      label,
      value,
    }));

    // Trend: group by day
    const trendMap: Record<string, number> = {};
    all
      .filter((r) => r.created_at >= from && r.created_at <= to)
      .forEach((r) => {
        const day = r.created_at.slice(0, 10);
        trendMap[day] = (trendMap[day] ?? 0) + 1;
      });
    const trend = Object.entries(trendMap)
      .sort()
      .map(([label, value]) => ({ label, value }));

    ok(res, {
      stats,
      byStatus,
      byPriority,
      byCategory: [],
      byDepartment: [],
      byBuilding: [],
      byTechnician: [],
      trend,
      avgResolutionByCategory: [],
      overdueByDepartment: [],
    });
  },
);

// ─────────────────────────────────────────
// Admin: CRUD for locations, categories, departments, users
// ─────────────────────────────────────────

// --- Campuses CRUD ---
app.post(
  "/v1/admin/campuses",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid input.",
      );
      return;
    }
    const { data, error } = await client
      .from("campuses")
      .insert({
        name: parsed.data.name,
        code: parsed.data.code ?? parsed.data.name.toUpperCase().slice(0, 6),
        address: parsed.data.address ?? null,
      })
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "CREATE_FAILED", error.message);
      return;
    }
    await audit(
      client,
      (req as AuthenticatedRequest).user.id,
      "campus.created",
      "campus",
      data.id as string,
      { name: data.name },
    );
    ok(res, data, 201);
  },
);

app.patch(
  "/v1/admin/campuses/:id",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = locationSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const updates: Row = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.code !== undefined) updates.code = parsed.data.code;
    if (parsed.data.address !== undefined)
      updates.address = parsed.data.address;
    if (parsed.data.isActive !== undefined)
      updates.is_active = parsed.data.isActive;
    const { data, error } = await client
      .from("campuses")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "UPDATE_FAILED", error.message);
      return;
    }
    ok(res, data);
  },
);

// --- Areas CRUD ---
app.post(
  "/v1/admin/areas",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success || !parsed.data.campusId) {
      sendError(res, 400, "VALIDATION_ERROR", "campusId is required.");
      return;
    }
    const { data, error } = await client
      .from("areas")
      .insert({ campus_id: parsed.data.campusId, name: parsed.data.name })
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "CREATE_FAILED", error.message);
      return;
    }
    ok(res, data, 201);
  },
);

app.patch(
  "/v1/admin/areas/:id",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = locationSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const updates: Row = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.isActive !== undefined)
      updates.is_active = parsed.data.isActive;
    const { data, error } = await client
      .from("areas")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "UPDATE_FAILED", error.message);
      return;
    }
    ok(res, data);
  },
);

// --- Buildings CRUD ---
app.post(
  "/v1/admin/buildings",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success || !parsed.data.areaId) {
      sendError(res, 400, "VALIDATION_ERROR", "areaId is required.");
      return;
    }
    const { data, error } = await client
      .from("buildings")
      .insert({
        area_id: parsed.data.areaId,
        name: parsed.data.name,
        code: parsed.data.code ?? null,
      })
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "CREATE_FAILED", error.message);
      return;
    }
    ok(res, data, 201);
  },
);

app.patch(
  "/v1/admin/buildings/:id",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = locationSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const updates: Row = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.code !== undefined) updates.code = parsed.data.code;
    if (parsed.data.isActive !== undefined)
      updates.is_active = parsed.data.isActive;
    const { data, error } = await client
      .from("buildings")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "UPDATE_FAILED", error.message);
      return;
    }
    ok(res, data);
  },
);

// --- Floors CRUD ---
app.post(
  "/v1/admin/floors",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success || !parsed.data.buildingId) {
      sendError(res, 400, "VALIDATION_ERROR", "buildingId is required.");
      return;
    }
    const { data, error } = await client
      .from("floors")
      .insert({
        building_id: parsed.data.buildingId,
        name: parsed.data.name,
        level_number: parsed.data.levelNumber ?? null,
      })
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "CREATE_FAILED", error.message);
      return;
    }
    ok(res, data, 201);
  },
);

// --- Rooms CRUD ---
app.post(
  "/v1/admin/rooms",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success || !parsed.data.floorId) {
      sendError(res, 400, "VALIDATION_ERROR", "floorId is required.");
      return;
    }
    const { data, error } = await client
      .from("rooms")
      .insert({
        floor_id: parsed.data.floorId,
        name: parsed.data.name,
        room_number: parsed.data.roomNumber ?? null,
        room_type: parsed.data.roomType ?? null,
      })
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "CREATE_FAILED", error.message);
      return;
    }
    ok(res, data, 201);
  },
);

// --- Categories CRUD ---
app.post(
  "/v1/admin/categories",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid input.",
      );
      return;
    }
    const { data, error } = await client
      .from("categories")
      .insert({
        name: parsed.data.name,
        icon: parsed.data.icon ?? null,
        description: parsed.data.description ?? null,
        sort_order: parsed.data.sortOrder,
      })
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "CREATE_FAILED", error.message);
      return;
    }
    ok(res, data, 201);
  },
);

app.patch(
  "/v1/admin/categories/:id",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = categorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const updates: Row = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description;
    if (parsed.data.isActive !== undefined)
      updates.is_active = parsed.data.isActive;
    if (parsed.data.sortOrder !== undefined)
      updates.sort_order = parsed.data.sortOrder;
    const { data, error } = await client
      .from("categories")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "UPDATE_FAILED", error.message);
      return;
    }
    ok(res, data);
  },
);

// --- Subcategories CRUD ---
app.post(
  "/v1/admin/subcategories",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = subcategorySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid input.",
      );
      return;
    }
    const { data, error } = await client
      .from("subcategories")
      .insert({
        category_id: parsed.data.categoryId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        sort_order: parsed.data.sortOrder,
      })
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "CREATE_FAILED", error.message);
      return;
    }
    ok(res, data, 201);
  },
);

// --- Departments CRUD ---
app.post(
  "/v1/admin/departments",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = departmentSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid input.",
      );
      return;
    }
    const { data, error } = await client
      .from("departments")
      .insert({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      })
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "CREATE_FAILED", error.message);
      return;
    }
    ok(res, data, 201);
  },
);

app.patch(
  "/v1/admin/departments/:id",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = departmentSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const updates: Row = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description;
    if (parsed.data.isActive !== undefined)
      updates.is_active = parsed.data.isActive;
    const { data, error } = await client
      .from("departments")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "UPDATE_FAILED", error.message);
      return;
    }
    ok(res, data);
  },
);

// --- User management ---
const createStaffUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128),
  role: z.enum(["technician", "supervisor", "administrator"]),
  departmentId: z.string().uuid().optional(),
});

app.post(
  "/v1/admin/users",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const parsed = createStaffUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid staff account.",
      );
      return;
    }
    const user = (req as AuthenticatedRequest).user;
    const { data: created, error } = await client.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: false,
      user_metadata: {
        full_name: parsed.data.fullName,
        department_id: parsed.data.departmentId ?? "",
      },
      app_metadata: {
        role: parsed.data.role,
        provisioned_by: user.id,
      },
    });
    if (error || !created.user) {
      sendError(
        res,
        502,
        "STAFF_CREATE_FAILED",
        error?.message ?? "Could not create staff account.",
      );
      return;
    }
    await audit(client, user.id, "user.created", "profile", created.user.id, {
      email: parsed.data.email,
      role: parsed.data.role,
      departmentId: parsed.data.departmentId,
    });
    ok(
      res,
      {
        id: created.user.id,
        email: created.user.email,
        role: parsed.data.role,
      },
      201,
    );
  },
);

app.get(
  "/v1/admin/users",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const pageSize = Math.min(
      100,
      parseInt(String(req.query.pageSize ?? "20")),
    );
    const from = (page - 1) * pageSize;
    let query = client
      .from("profiles")
      .select("*", { count: "exact" })
      .order("full_name")
      .range(from, from + pageSize - 1);
    if (req.query.role) query = query.eq("role", String(req.query.role));
    if (req.query.search) {
      const s = `%${String(req.query.search)}%`;
      query = query.or(`full_name.ilike.${s},email.ilike.${s}`);
    }
    const { data, error, count } = await query;
    if (error) {
      sendError(res, 500, "QUERY_FAILED", error.message);
      return;
    }
    ok(res, {
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  },
);

app.patch(
  "/v1/admin/users/:id",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const userUpdateSchema = z.object({
      role: z
        .enum(["student", "technician", "supervisor", "administrator"])
        .optional(),
      departmentId: z.string().uuid().optional(),
      isActive: z.boolean().optional(),
      fullName: z.string().trim().min(2).max(120).optional(),
    });
    const parsed = userUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "VALIDATION_ERROR", "Invalid input.");
      return;
    }
    const updates: Row = {};
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;
    if (parsed.data.departmentId !== undefined)
      updates.department_id = parsed.data.departmentId;
    if (parsed.data.isActive !== undefined)
      updates.is_active = parsed.data.isActive;
    if (parsed.data.fullName !== undefined)
      updates.full_name = parsed.data.fullName;
    const { data, error } = await client
      .from("profiles")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) {
      sendError(res, 500, "UPDATE_FAILED", error.message);
      return;
    }
    const user = (req as AuthenticatedRequest).user;
    await audit(
      client,
      user.id,
      "user.updated",
      "profile",
      String(req.params.id),
      updates,
    );
    ok(res, data);
  },
);

// ─────────────────────────────────────────
// Audit logs
// ─────────────────────────────────────────
app.get(
  "/v1/audit",
  requireAuth,
  requireRole("administrator"),
  async (req, res) => {
    const client = getClient(res);
    if (!client) return;
    const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
    const pageSize = Math.min(
      100,
      parseInt(String(req.query.pageSize ?? "20")),
    );
    const from = (page - 1) * pageSize;
    let query = client
      .from("audit_logs")
      .select("*, actor:actor_id(full_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (req.query.entityType)
      query = query.eq("entity_type", String(req.query.entityType));
    if (req.query.actorId)
      query = query.eq("actor_id", String(req.query.actorId));
    const { data, error, count } = await query;
    if (error) {
      sendError(res, 500, "AUDIT_QUERY_FAILED", error.message);
      return;
    }
    ok(res, {
      items: (data ?? []).map((r) =>
        mapAuditLog({ ...r, actor_name: (r.actor as Row)?.full_name } as Row),
      ),
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  },
);

// ─────────────────────────────────────────
// Auth helpers (public — no auth required)
// ─────────────────────────────────────────

/**
 * POST /v1/auth/check
 * Body: { email?: string; studentId?: string }
 * Response: { emailTaken: boolean; studentIdTaken: boolean }
 *
 * Used by the registration wizard for real-time uniqueness validation.
 * Intentionally unauthenticated so it works before the user has an account.
 */
const checkSchema = z.object({
  email: z.string().email().optional(),
  studentId: z.string().trim().min(1).max(40).optional(),
});

app.post("/v1/auth/check", async (req, res) => {
  const client = getClient(res);
  if (!client) return;

  const parsed = checkSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(
      res,
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
    return;
  }

  const { email, studentId } = parsed.data;
  let emailTaken = false;
  let studentIdTaken = false;

  // Check email — look in auth.users via admin API (service role required)
  if (email) {
    const { data: users } = await client.auth.admin.listUsers();
    emailTaken =
      (users?.users ?? []).some(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      ) ?? false;
  }

  // Check student ID — look in profiles table
  if (studentId) {
    const { count } = await client
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .ilike("student_id", studentId.trim());
    studentIdTaken = (count ?? 0) > 0;
  }

  ok(res, { emailTaken, studentIdTaken });
});

// ─────────────────────────────────────────
// Generic error handler
// ─────────────────────────────────────────
app.use(
  (
    _error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  },
);

// ─────────────────────────────────────────
// Start
// ─────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () =>
    console.log(`CUT SmartFix API listening on http://localhost:${port}`),
  );
}
