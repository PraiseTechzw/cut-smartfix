export type UserRole =
  | "student"
  | "technician"
  | "supervisor"
  | "administrator";
export type ReportStatus =
  | "submitted"
  | "reviewed"
  | "assigned"
  | "in_progress"
  | "completed"
  | "reopened"
  | "closed";
export type Urgency = "low" | "normal" | "high" | "emergency";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface MaintenanceReport {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: ReportStatus;
  urgency: Urgency;
  location: { campus: string; building: string; floor?: string; room?: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceReportInput {
  title: string;
  description: string;
  urgency: Urgency;
  location: {
    campus: string;
    building: string;
    floor?: string;
    room?: string;
  };
}

export interface ReportTimelineEvent {
  id: string;
  status: ReportStatus;
  note?: string;
  createdAt: string;
  createdBy?: string;
}

export interface ApiError {
  code: string;
  message: string;
}
export interface ApiResponse<T> {
  data: T;
  error: ApiError | null;
}
