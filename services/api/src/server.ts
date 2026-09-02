import "dotenv/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { z } from "zod";
import type {
  ApiResponse,
  MaintenanceReport,
  ReportTimelineEvent,
  UserProfile,
} from "@cut-smartfix/contracts";

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
  .map((origin) => origin.trim())
  .filter(Boolean);

const reportInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  urgency: z.enum(["low", "normal", "high", "emergency"]),
  location: z.object({
    campus: z.string().trim().min(1).max(120),
    building: z.string().trim().min(1).max(120),
    floor: z.string().trim().max(40).optional(),
    room: z.string().trim().max(80).optional(),
  }),
});
const uuidSchema = z.string().uuid();
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
});
const feedbackSchema = z.object({
  resolved: z.boolean(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(2000).optional(),
});
const taskUpdateSchema = z.object({
  status: z.enum([
    "reviewed",
    "assigned",
    "in_progress",
    "completed",
    "reopened",
    "closed",
  ]),
  note: z.string().trim().max(2000).optional(),
});

type AuthenticatedRequest = express.Request & { user: UserProfile };

type ReportRow = Record<string, unknown>;

function sendError<T>(
  response: express.Response,
  status: number,
  code: string,
  message: string,
): void {
  const body: ApiResponse<T> = {
    data: null as T,
    error: { code, message },
  };
  response.status(status).json(body);
}

function mapReport(row: ReportRow): MaintenanceReport {
  return {
    id: String(row.id),
    ticketNumber: String(row.ticket_number),
    title: String(row.title),
    description: String(row.description),
    status: row.status as MaintenanceReport["status"],
    urgency: row.urgency as MaintenanceReport["urgency"],
    location: row.location as MaintenanceReport["location"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapTimelineEvent(row: ReportRow): ReportTimelineEvent {
  return {
    id: String(row.id),
    status: row.status as ReportTimelineEvent["status"],
    note: row.note ? String(row.note) : undefined,
    createdAt: String(row.created_at),
    createdBy: row.created_by ? String(row.created_by) : undefined,
  };
}

async function requireAuth(
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
): Promise<void> {
  if (!supabase) {
    sendError(
      response,
      503,
      "SERVICE_NOT_CONFIGURED",
      "Supabase is not configured.",
    );
    return;
  }

  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  if (!token) {
    sendError(response, 401, "UNAUTHENTICATED", "A Bearer token is required.");
    return;
  }

  const { data: authData, error: authError } =
    await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    sendError(
      response,
      401,
      "UNAUTHENTICATED",
      "The access token is invalid or expired.",
    );
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", authData.user.id)
    .single();
  if (profileError || !profile) {
    sendError(
      response,
      403,
      "PROFILE_NOT_FOUND",
      "The authenticated user has no profile.",
    );
    return;
  }

  (request as AuthenticatedRequest).user = {
    id: String(profile.id),
    fullName: String(profile.full_name),
    email: String(profile.email),
    role: profile.role as UserProfile["role"],
  };
  next();
}

function requireRole(...roles: UserProfile["role"][]) {
  return (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ): void => {
    const user = (request as AuthenticatedRequest).user;
    if (!roles.includes(user.role)) {
      sendError(
        response,
        403,
        "FORBIDDEN",
        "You do not have permission to perform this action.",
      );
      return;
    }
    next();
  };
}

async function reportBelongsToUser(
  client: SupabaseClient,
  reportId: string,
  user: UserProfile,
): Promise<boolean> {
  const query = client
    .from("maintenance_reports")
    .select("id")
    .eq("id", reportId);
  const { data } =
    user.role === "student"
      ? await query.eq("reporter_id", user.id).maybeSingle()
      : user.role === "technician"
        ? await query.eq("assigned_to", user.id).maybeSingle()
        : await query.maybeSingle();
  return Boolean(data);
}

function getClient(response: express.Response): SupabaseClient | null {
  if (!supabase) {
    sendError(
      response,
      503,
      "SERVICE_NOT_CONFIGURED",
      "Supabase is not configured.",
    );
  }
  return supabase;
}

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_request, response) => {
  response.json({
    data: { status: "ok", supabaseConfigured: Boolean(supabase) },
    error: null,
  });
});

app.get("/v1/me", requireAuth, (request, response) => {
  response.json({ data: (request as AuthenticatedRequest).user, error: null });
});

app.get("/v1/reports", requireAuth, async (request, response) => {
  const client = getClient(response);
  if (!client) return;
  const user = (request as AuthenticatedRequest).user;
  const query = client
    .from("maintenance_reports")
    .select("*")
    .order("created_at", { ascending: false });
  const { data, error } =
    user.role === "student"
      ? await query.eq("reporter_id", user.id)
      : await query;
  if (error) {
    sendError(response, 500, "REPORTS_QUERY_FAILED", error.message);
    return;
  }
  response.json({ data: (data ?? []).map(mapReport), error: null });
});

app.post("/v1/reports", requireAuth, async (request, response) => {
  const client = getClient(response);
  if (!client) return;
  const parsed = reportInputSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Invalid report.",
    );
    return;
  }
  const user = (request as AuthenticatedRequest).user;
  const { data, error } = await client
    .from("maintenance_reports")
    .insert({ ...parsed.data, reporter_id: user.id, status: "submitted" })
    .select("*")
    .single();
  if (error) {
    sendError(response, 500, "REPORT_CREATE_FAILED", error.message);
    return;
  }
  response.status(201).json({ data: mapReport(data), error: null });
});

app.get("/v1/reports/:id", requireAuth, async (request, response) => {
  const client = getClient(response);
  if (!client) return;
  const user = (request as AuthenticatedRequest).user;
  const { data, error } = await client
    .from("maintenance_reports")
    .select("*")
    .eq("id", request.params.id)
    .or(`reporter_id.eq.${user.id},assigned_to.eq.${user.id}`)
    .maybeSingle();
  if (error) {
    sendError(response, 500, "REPORT_QUERY_FAILED", error.message);
    return;
  }
  if (!data) {
    sendError(
      response,
      404,
      "REPORT_NOT_FOUND",
      "Maintenance report not found.",
    );
    return;
  }
  response.json({ data: mapReport(data), error: null });
});

app.get("/v1/reports/:id/timeline", requireAuth, async (request, response) => {
  const client = getClient(response);
  if (!client) return;
  const reportId = uuidSchema.safeParse(request.params.id);
  if (
    !reportId.success ||
    !(await reportBelongsToUser(
      client,
      reportId.data,
      (request as AuthenticatedRequest).user,
    ))
  ) {
    sendError(
      response,
      404,
      "REPORT_NOT_FOUND",
      "Maintenance report not found.",
    );
    return;
  }
  const { data, error } = await client
    .from("report_timeline")
    .select("*")
    .eq("report_id", reportId.data)
    .order("created_at", { ascending: true });
  if (error) {
    sendError(response, 500, "TIMELINE_QUERY_FAILED", error.message);
    return;
  }
  response.json({ data: (data ?? []).map(mapTimelineEvent), error: null });
});

app.patch(
  "/v1/tasks/:id",
  requireAuth,
  requireRole("technician", "supervisor", "administrator"),
  async (request, response) => {
    const client = getClient(response);
    if (!client) return;
    const reportId = uuidSchema.safeParse(request.params.id);
    const input = taskUpdateSchema.safeParse(request.body);
    if (!reportId.success || !input.success) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "A valid task ID and status are required.",
      );
      return;
    }
    const user = (request as AuthenticatedRequest).user;
    const query = client
      .from("maintenance_reports")
      .update({
        status: input.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId.data);
    const { data, error } =
      user.role === "technician"
        ? await query.eq("assigned_to", user.id).select("*").maybeSingle()
        : await query.select("*").maybeSingle();
    if (error) {
      sendError(response, 500, "TASK_UPDATE_FAILED", error.message);
      return;
    }
    if (!data) {
      sendError(
        response,
        404,
        "TASK_NOT_FOUND",
        "Task not found or not assigned to you.",
      );
      return;
    }
    if (input.data.note) {
      const { data: timelineEvent } = await client
        .from("report_timeline")
        .select("id")
        .eq("report_id", reportId.data)
        .eq("status", input.data.status)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (timelineEvent) {
        const { error: timelineError } = await client
          .from("report_timeline")
          .update({ note: input.data.note })
          .eq("id", timelineEvent.id);
        if (timelineError) {
          sendError(
            response,
            500,
            "TIMELINE_UPDATE_FAILED",
            timelineError.message,
          );
          return;
        }
      }
    }
    response.json({ data: mapReport(data), error: null });
  },
);

app.post(
  "/v1/reports/:id/attachments/sign",
  requireAuth,
  async (request, response) => {
    const client = getClient(response);
    if (!client) return;
    const reportId = uuidSchema.safeParse(request.params.id);
    const input = attachmentSchema.safeParse(request.body);
    if (!reportId.success || !input.success) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "A valid report ID, file name, and supported content type are required.",
      );
      return;
    }
    const user = (request as AuthenticatedRequest).user;
    if (!(await reportBelongsToUser(client, reportId.data, user))) {
      sendError(
        response,
        404,
        "REPORT_NOT_FOUND",
        "Maintenance report not found.",
      );
      return;
    }
    const storagePath = `${user.id}/${reportId.data}/${crypto.randomUUID()}-${input.data.fileName}`;
    const { data, error } = await client.storage
      .from(process.env.STORAGE_BUCKET ?? "maintenance-evidence")
      .createSignedUploadUrl(storagePath);
    if (error || !data) {
      sendError(
        response,
        502,
        "STORAGE_SIGN_FAILED",
        error?.message ?? "Could not create an upload URL.",
      );
      return;
    }
    const { data: attachment, error: attachmentError } = await client
      .from("report_attachments")
      .insert({
        report_id: reportId.data,
        uploaded_by: user.id,
        storage_path: storagePath,
        file_name: input.data.fileName,
        content_type: input.data.contentType,
      })
      .select("id, storage_path, file_name, content_type")
      .single();
    if (attachmentError) {
      sendError(
        response,
        500,
        "ATTACHMENT_CREATE_FAILED",
        attachmentError.message,
      );
      return;
    }
    response.status(201).json({
      data: { ...attachment, token: data.token, path: storagePath },
      error: null,
    });
  },
);

app.get("/v1/notifications", requireAuth, async (request, response) => {
  const client = getClient(response);
  if (!client) return;
  const user = (request as AuthenticatedRequest).user;
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    sendError(response, 500, "NOTIFICATIONS_QUERY_FAILED", error.message);
    return;
  }
  response.json({ data: data ?? [], error: null });
});

app.patch(
  "/v1/notifications/:id/read",
  requireAuth,
  async (request, response) => {
    const client = getClient(response);
    if (!client) return;
    const notificationId = uuidSchema.safeParse(request.params.id);
    if (!notificationId.success) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "A valid notification ID is required.",
      );
      return;
    }
    const user = (request as AuthenticatedRequest).user;
    const { data, error } = await client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId.data)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error) {
      sendError(response, 500, "NOTIFICATION_UPDATE_FAILED", error.message);
      return;
    }
    if (!data) {
      sendError(
        response,
        404,
        "NOTIFICATION_NOT_FOUND",
        "Notification not found.",
      );
      return;
    }
    response.json({ data, error: null });
  },
);

app.post("/v1/reports/:id/feedback", requireAuth, async (request, response) => {
  const client = getClient(response);
  if (!client) return;
  const reportId = uuidSchema.safeParse(request.params.id);
  const input = feedbackSchema.safeParse(request.body);
  if (!reportId.success || !input.success) {
    sendError(response, 400, "VALIDATION_ERROR", "Invalid feedback.");
    return;
  }
  const user = (request as AuthenticatedRequest).user;
  if (!(await reportBelongsToUser(client, reportId.data, user))) {
    sendError(
      response,
      404,
      "REPORT_NOT_FOUND",
      "Maintenance report not found.",
    );
    return;
  }
  const { data, error } = await client
    .from("report_feedback")
    .upsert(
      { report_id: reportId.data, submitted_by: user.id, ...input.data },
      { onConflict: "report_id" },
    )
    .select("*")
    .single();
  if (error) {
    sendError(response, 500, "FEEDBACK_SAVE_FAILED", error.message);
    return;
  }
  response.status(201).json({ data, error: null });
});

app.get(
  "/v1/tasks",
  requireAuth,
  requireRole("technician", "supervisor", "administrator"),
  async (request, response) => {
    const client = getClient(response);
    if (!client) return;
    const user = (request as AuthenticatedRequest).user;
    const query = client
      .from("maintenance_reports")
      .select("*")
      .in("status", ["assigned", "in_progress", "reopened"])
      .order("urgency", { ascending: false })
      .order("created_at", { ascending: true });
    const { data, error } =
      user.role === "technician"
        ? await query.eq("assigned_to", user.id)
        : await query;
    if (error) {
      sendError(response, 500, "TASKS_QUERY_FAILED", error.message);
      return;
    }
    response.json({ data: (data ?? []).map(mapReport), error: null });
  },
);

app.use(
  (
    _error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    sendError(response, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  },
);

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () =>
    console.log(`CUT SmartFix API listening on http://localhost:${port}`),
  );
}
