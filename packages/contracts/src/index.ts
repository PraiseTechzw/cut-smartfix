// ============================================================
// CUT SmartFix – shared contracts package
// All domain types used by the API, mobile app, and web portals
// ============================================================

// ─────────────────────────────────────────
// Enums / literals
// ─────────────────────────────────────────
export type UserRole =
  | "student"
  | "technician"
  | "supervisor"
  | "administrator";

export type PriorityLevel = "critical" | "high" | "medium" | "low";

export type Urgency = "low" | "normal" | "high" | "emergency";

/** Complete ticket lifecycle statuses */
export type ReportStatus =
  | "submitted"
  | "under_review"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "waiting_for_materials"
  | "repair_completed"
  | "under_verification"
  | "closed"
  | "rejected"
  | "duplicate"
  | "cancelled"
  | "reopened";

export type MaterialRequestStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "issued"
  | "received";

export type AssignmentStatus =
  | "assigned"
  | "accepted"
  | "rejected"
  | "reassigned";

export type NoteType =
  | "general"
  | "diagnosis"
  | "work_note"
  | "completion"
  | "verification"
  | "rejection"
  | "internal";

// ─────────────────────────────────────────
// Core entities
// ─────────────────────────────────────────
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  studentId?: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────
// Location hierarchy
// ─────────────────────────────────────────
export interface Campus {
  id: string;
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  campusId: string;
  campusName?: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Building {
  id: string;
  areaId: string;
  areaName?: string;
  campusName?: string;
  name: string;
  code?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  buildingName?: string;
  name: string;
  levelNumber?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  floorId: string;
  floorName?: string;
  buildingName?: string;
  name: string;
  roomNumber?: string;
  roomType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Location reference embedded in a report (denormalised for display)
export interface LocationRef {
  roomId?: string;
  roomName?: string;
  floorName?: string;
  buildingName?: string;
  areaName?: string;
  campusName?: string;
  // Legacy free-text fallback
  campus?: string;
  building?: string;
  floor?: string;
  room?: string;
}

// ─────────────────────────────────────────
// Categories
// ─────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  subcategories?: Subcategory[];
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────
// Maintenance report (ticket)
// ─────────────────────────────────────────
export interface MaintenanceReport {
  id: string;
  ticketNumber: string;
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  title: string;
  description: string;
  status: ReportStatus;
  urgency: Urgency;
  priority?: PriorityLevel;
  location: LocationRef;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  assignedDepartmentId?: string;
  assignedDepartmentName?: string;
  assignedTo?: string;
  assignedToName?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  closedAt?: string;
  dueDate?: string;
  isOverdue: boolean;
  rejectionReason?: string;
  completionNotes?: string;
  attachmentCount?: number;
  evidenceCount?: number;
  noteCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceReportInput {
  title: string;
  description: string;
  urgency: Urgency;
  categoryId?: string;
  subcategoryId?: string;
  roomId?: string;
  location: LocationRef;
}

export interface UpdateReportInput {
  status?: ReportStatus;
  priority?: PriorityLevel;
  assignedDepartmentId?: string;
  assignedTo?: string;
  rejectionReason?: string;
  completionNotes?: string;
  dueDate?: string;
  note?: string;
  noteType?: NoteType;
  noteVisibleToStudent?: boolean;
}

// ─────────────────────────────────────────
// Timeline events
// ─────────────────────────────────────────
export interface ReportTimelineEvent {
  id: string;
  reportId: string;
  status: ReportStatus;
  note?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: UserRole;
  createdAt: string;
  // Legacy field
  createdBy?: string;
}

// ─────────────────────────────────────────
// Assignments
// ─────────────────────────────────────────
export interface Assignment {
  id: string;
  reportId: string;
  ticketNumber?: string;
  technicianId: string;
  technicianName?: string;
  assignedById: string;
  assignedByName?: string;
  departmentId?: string;
  departmentName?: string;
  status: AssignmentStatus;
  notes?: string;
  rejectedReason?: string;
  assignedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentInput {
  reportId: string;
  technicianId: string;
  departmentId?: string;
  notes?: string;
}

// ─────────────────────────────────────────
// Notes
// ─────────────────────────────────────────
export interface MaintenanceNote {
  id: string;
  reportId: string;
  authorId: string;
  authorName?: string;
  authorRole?: UserRole;
  content: string;
  noteType: NoteType;
  isVisibleToStudent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  reportId: string;
  content: string;
  noteType?: NoteType;
  isVisibleToStudent?: boolean;
}

// ─────────────────────────────────────────
// Attachments / evidence
// ─────────────────────────────────────────
export interface ReportAttachment {
  id: string;
  reportId: string;
  uploadedBy: string;
  uploaderName?: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  signedUrl?: string;
  createdAt: string;
}

export interface CompletionEvidence {
  id: string;
  reportId: string;
  uploadedBy: string;
  uploaderName?: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  caption?: string;
  signedUrl?: string;
  createdAt: string;
}

export interface AttachmentSignInput {
  fileName: string;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  isEvidence?: boolean;
}

export interface AttachmentSignResult {
  id: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  token: string;
  path: string;
}

// ─────────────────────────────────────────
// Material requests
// ─────────────────────────────────────────
export interface MaterialRequest {
  id: string;
  reportId: string;
  ticketNumber?: string;
  requestedById: string;
  requestedByName?: string;
  approvedById?: string;
  approvedByName?: string;
  materialName: string;
  quantity: number;
  unit: string;
  reason: string;
  status: MaterialRequestStatus;
  rejectionReason?: string;
  requestedAt: string;
  decidedAt?: string;
  issuedAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialRequestInput {
  reportId: string;
  materialName: string;
  quantity: number;
  unit?: string;
  reason: string;
}

export interface UpdateMaterialRequestInput {
  status: MaterialRequestStatus;
  rejectionReason?: string;
}

// ─────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  reportId?: string;
  ticketNumber?: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  readAt?: string;
  createdAt: string;
}

// ─────────────────────────────────────────
// Feedback
// ─────────────────────────────────────────
export interface ReportFeedback {
  id: string;
  reportId: string;
  submittedById: string;
  resolved: boolean;
  rating?: number;
  comment?: string;
  createdAt: string;
}

export interface CreateFeedbackInput {
  resolved: boolean;
  rating?: number;
  comment?: string;
}

// ─────────────────────────────────────────
// Audit logs
// ─────────────────────────────────────────
export interface AuditLog {
  id: string;
  actorId?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ─────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────
export interface DashboardStats {
  total: number;
  pending: number;        // submitted + under_review
  assigned: number;
  inProgress: number;
  waitingMaterials: number;
  overdue: number;
  critical: number;
  completed: number;      // repair_completed + under_verification
  closed: number;
  reopened: number;
  rejected: number;
  avgResolutionHours?: number;
}

export interface AnalyticsDataPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface AnalyticsSeries {
  name: string;
  data: AnalyticsDataPoint[];
}

export interface AnalyticsReport {
  stats: DashboardStats;
  byStatus: AnalyticsDataPoint[];
  byCategory: AnalyticsDataPoint[];
  byPriority: AnalyticsDataPoint[];
  byDepartment: AnalyticsDataPoint[];
  byBuilding: AnalyticsDataPoint[];
  byTechnician: AnalyticsDataPoint[];
  trend: AnalyticsDataPoint[];  // reports per day/week
  avgResolutionByCategory: AnalyticsDataPoint[];
  overdueByDepartment: AnalyticsDataPoint[];
}

// ─────────────────────────────────────────
// Pagination / list wrappers
// ─────────────────────────────────────────
export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ReportStatus | ReportStatus[];
  priority?: PriorityLevel;
  categoryId?: string;
  departmentId?: string;
  technicianId?: string;
  buildingId?: string;
  campusId?: string;
  from?: string;
  to?: string;
  isOverdue?: boolean;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// ─────────────────────────────────────────
// API envelope
// ─────────────────────────────────────────
export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  data: T;
  error: ApiError | null;
}
