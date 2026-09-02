'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api, formatDateTime, timeAgo } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';
import type {
  MaintenanceReport,
  ReportTimelineEvent,
  MaintenanceNote,
  ReportAttachment,
  CompletionEvidence,
  MaterialRequest,
  UserProfile,
  ReportStatus,
  NoteType,
  CreateMaterialRequestInput,
  Assignment,
} from '@cut-smartfix/contracts';

const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: 'accepted', label: 'Accepted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_materials', label: 'Waiting for Materials' },
  { value: 'repair_completed', label: 'Repair Completed' },
];

const SUPERVISOR_STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: 'under_review', label: 'Under Review' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'under_verification', label: 'Under Verification' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEvent[]>([]);
  const [notes, setNotes] = useState<MaintenanceNote[]>([]);
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [evidence, setEvidence] = useState<CompletionEvidence[]>([]);
  const [materialReqs, setMaterialReqs] = useState<MaterialRequest[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status update form
  const [newStatus, setNewStatus] = useState<ReportStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Note form
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('work_note');
  const [noteLoading, setNoteLoading] = useState(false);

  // Material request form
  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState('1');
  const [matUnit, setMatUnit] = useState('pcs');
  const [matReason, setMatReason] = useState('');
  const [matLoading, setMatLoading] = useState(false);
  const [matMsg, setMatMsg] = useState<string | null>(null);

  // Assignment form (supervisor)
  const [assignTechId, setAssignTechId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  // Evidence upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const isSupervisor =
    user?.role === 'supervisor' || user?.role === 'administrator';

  const statusOptions = isSupervisor
    ? [...STATUS_OPTIONS, ...SUPERVISOR_STATUS_OPTIONS]
    : STATUS_OPTIONS;

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [rRes, tRes, nRes, attRes, matRes] = await Promise.all([
        api.get<MaintenanceReport>(`/v1/reports/${id}`),
        api.get<ReportTimelineEvent[]>(`/v1/reports/${id}/timeline`),
        api.get<MaintenanceNote[]>(`/v1/reports/${id}/notes`),
        api.get<ReportAttachment[]>(`/v1/reports/${id}/attachments`),
        api.get<MaterialRequest[]>(`/v1/reports/${id}/material-requests`),
      ]);

      if (rRes.error) throw new Error(rRes.error.message);
      setReport(rRes.data);
      setTimeline(tRes.data ?? []);
      setNotes(nRes.data ?? []);
      setAttachments(attRes.data ?? []);
      setMaterialReqs(matRes.data ?? []);

      // Try evidence endpoint
      const evRes = await api.get<CompletionEvidence[]>(`/v1/reports/${id}/evidence`);
      if (!evRes.error) setEvidence(evRes.data ?? []);

      // Supervisor: load staff list
      if (isSupervisor) {
        const staffRes = await api.get<UserProfile[]>('/v1/users?role=technician&pageSize=100');
        if (!staffRes.error) {
          const staffData = staffRes.data as unknown;
          if (Array.isArray(staffData)) {
            setStaff(staffData as UserProfile[]);
          } else {
            const pl = staffData as { items?: UserProfile[] };
            setStaff(pl.items ?? []);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setStatusLoading(true);
    setStatusMsg(null);
    try {
      const res = await api.patch(`/v1/reports/${id}`, {
        status: newStatus,
        ...(statusNote ? { note: statusNote, noteType: 'work_note' } : {}),
      });
      if (res.error) throw new Error(res.error.message);
      setStatusMsg('Status updated successfully.');
      setStatusNote('');
      setNewStatus('');
      loadAll();
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setNoteLoading(true);
    try {
      const res = await api.post(`/v1/reports/${id}/notes`, {
        reportId: id,
        content: noteContent.trim(),
        noteType,
        isVisibleToStudent: false,
      });
      if (res.error) throw new Error(res.error.message);
      setNoteContent('');
      loadAll();
    } catch {
      // silent
    } finally {
      setNoteLoading(false);
    }
  };

  const handleMaterialRequest = async () => {
    if (!matName.trim() || !matReason.trim()) return;
    setMatLoading(true);
    setMatMsg(null);
    try {
      const body: CreateMaterialRequestInput = {
        reportId: id,
        materialName: matName.trim(),
        quantity: Number(matQty) || 1,
        unit: matUnit,
        reason: matReason.trim(),
      };
      const res = await api.post(`/v1/reports/${id}/material-requests`, body);
      if (res.error) throw new Error(res.error.message);
      setMatMsg('Material request submitted.');
      setMatName(''); setMatQty('1'); setMatUnit('pcs'); setMatReason('');
      loadAll();
    } catch (e) {
      setMatMsg(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setMatLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTechId) return;
    setAssignLoading(true);
    setAssignMsg(null);
    try {
      const res = await api.post(`/v1/reports/${id}/assignments`, {
        reportId: id,
        technicianId: assignTechId,
        ...(assignNotes ? { notes: assignNotes } : {}),
      });
      if (res.error) throw new Error(res.error.message);
      setAssignMsg('Technician assigned successfully.');
      setAssignTechId(''); setAssignNotes('');
      loadAll();
    } catch (e) {
      setAssignMsg(e instanceof Error ? e.message : 'Assignment failed');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleVerify = async (approve: boolean) => {
    try {
      const res = await api.patch(`/v1/reports/${id}`, {
        status: approve ? 'closed' : 'in_progress',
        note: approve ? 'Verified and closed.' : 'Returned to in progress for rework.',
        noteType: 'verification',
      });
      if (res.error) throw new Error(res.error.message);
      loadAll();
    } catch {
      // silent
    }
  };

  const handleEvidenceUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadLoading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));
      formData.append('reportId', id);
      const res = await api.upload(`/v1/reports/${id}/evidence`, formData);
      if (res.error) throw new Error(res.error.message);
      loadAll();
    } catch {
      // silent
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: 300 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="alert alert-error">
        {error ?? 'Ticket not found'}
      </div>
    );
  }

  const loc = report.location;
  const locationParts = [
    loc.campusName ?? loc.campus,
    loc.buildingName ?? loc.building,
    loc.floorName ?? loc.floor,
    loc.roomName ?? loc.room,
  ].filter(Boolean);

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: 'var(--border)', padding: '3px 8px', borderRadius: 4 }}>
              {report.ticketNumber}
            </span>
            {report.priority && (
              <span className={`badge badge-${report.priority}`}>{report.priority}</span>
            )}
            <span className={`badge badge-${report.status}`}>
              {report.status.replace(/_/g, ' ')}
            </span>
            {report.isOverdue && (
              <span className="badge badge-critical">OVERDUE</span>
            )}
          </div>
          <h2>{report.title}</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Details */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Ticket Details</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Category</label>
                <p>{report.categoryName ?? '–'}{report.subcategoryName ? ` › ${report.subcategoryName}` : ''}</p>
              </div>
              <div className="detail-item">
                <label>Location</label>
                <p>{locationParts.join(' › ') || '–'}</p>
              </div>
              <div className="detail-item">
                <label>Reporter</label>
                <p>{report.reporterName ?? '–'}</p>
              </div>
              <div className="detail-item">
                <label>Reported</label>
                <p>{formatDateTime(report.createdAt)}</p>
              </div>
              <div className="detail-item">
                <label>Assigned To</label>
                <p>{report.assignedToName ?? '–'}</p>
              </div>
              <div className="detail-item">
                <label>Department</label>
                <p>{report.assignedDepartmentName ?? '–'}</p>
              </div>
              {report.dueDate && (
                <div className="detail-item">
                  <label>Due Date</label>
                  <p style={{ color: report.isOverdue ? 'var(--red)' : undefined }}>
                    {formatDateTime(report.dueDate)}
                  </p>
                </div>
              )}
            </div>

            <hr className="divider" />

            <div className="detail-item">
              <label>Description</label>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginTop: 6 }}>
                {report.description}
              </p>
            </div>
          </div>

          {/* Status update (technician) */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Update Status</h3>
            {statusMsg && (
              <div className={`alert ${statusMsg.includes('success') ? 'alert-success' : 'alert-error'}`}>
                {statusMsg}
              </div>
            )}
            <div className="form-group">
              <label className="label">New Status</label>
              <select
                className="select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
              >
                <option value="">— Select status —</option>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Note (optional)</label>
              <textarea
                className="textarea"
                placeholder="Describe the work done or reason for status change…"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={3}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleStatusUpdate}
              disabled={!newStatus || statusLoading}
            >
              {statusLoading ? 'Updating…' : 'Update Status'}
            </button>
          </div>

          {/* Notes */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Notes</h3>

            {notes.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: 16 }}>
                No notes yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {notes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--bg)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{note.authorName}</span>
                      <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>
                        {note.noteType.replace(/_/g, ' ')}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {timeAgo(note.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{note.content}</p>
                  </div>
                ))}
              </div>
            )}

            <hr className="divider" />
            <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 12 }}>Add Note</h4>
            <div className="form-group">
              <label className="label">Note Type</label>
              <select className="select" value={noteType} onChange={(e) => setNoteType(e.target.value as NoteType)}>
                <option value="work_note">Work Note</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="general">General</option>
                <option value="completion">Completion</option>
                <option value="internal">Internal</option>
              </select>
            </div>
            <div className="form-group">
              <textarea
                className="textarea"
                placeholder="Write your note here…"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleAddNote}
              disabled={!noteContent.trim() || noteLoading}
            >
              {noteLoading ? 'Adding…' : 'Add Note'}
            </button>
          </div>

          {/* Attachments & Evidence */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Attachments & Evidence</h3>

            {attachments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                  Original Attachments
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.signedUrl ?? a.storagePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--green)' }}
                    >
                      📎 {a.fileName}
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{a.contentType}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {evidence.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                  Completion Evidence
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {evidence.map((e) => (
                    <a
                      key={e.id}
                      href={e.signedUrl ?? e.storagePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--green)' }}
                    >
                      🖼 {e.fileName}
                      {e.caption && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>– {e.caption}</span>}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <hr className="divider" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="file"
                ref={fileRef}
                style={{ display: 'none' }}
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => handleEvidenceUpload(e.target.files)}
              />
              <button
                className="btn btn-secondary"
                onClick={() => fileRef.current?.click()}
                disabled={uploadLoading}
              >
                {uploadLoading ? 'Uploading…' : '📁 Upload Evidence'}
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                Images or PDF files
              </span>
            </div>
          </div>

          {/* Material Requests */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Material Requests</h3>

            {materialReqs.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: 16 }}>
                No material requests yet.
              </p>
            ) : (
              <div className="table-wrapper" style={{ marginBottom: 20 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Qty</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialReqs.map((m) => (
                      <tr key={m.id} className="no-hover">
                        <td>{m.materialName}</td>
                        <td>{m.quantity} {m.unit}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{m.reason}</td>
                        <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{timeAgo(m.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <hr className="divider" />
            <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 12 }}>Request Material</h4>
            {matMsg && (
              <div className={`alert ${matMsg.includes('submitted') ? 'alert-success' : 'alert-error'}`}>
                {matMsg}
              </div>
            )}
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="label">Material Name</label>
                <input className="input" value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="e.g. PVC pipe" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label className="label">Qty</label>
                  <input className="input" type="number" min="1" value={matQty} onChange={(e) => setMatQty(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1 }}>
                  <label className="label">Unit</label>
                  <input className="input" value={matUnit} onChange={(e) => setMatUnit(e.target.value)} placeholder="pcs" />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Reason</label>
              <textarea className="textarea" rows={2} value={matReason} onChange={(e) => setMatReason(e.target.value)} placeholder="Why is this material needed?" />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleMaterialRequest}
              disabled={!matName.trim() || !matReason.trim() || matLoading}
            >
              {matLoading ? 'Submitting…' : 'Request Material'}
            </button>
          </div>

          {/* Supervisor: Assignment */}
          {isSupervisor && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>Assign Technician</h3>
              {assignMsg && (
                <div className={`alert ${assignMsg.includes('success') ? 'alert-success' : 'alert-error'}`}>
                  {assignMsg}
                </div>
              )}
              <div className="form-group">
                <label className="label">Select Technician</label>
                <select className="select" value={assignTechId} onChange={(e) => setAssignTechId(e.target.value)}>
                  <option value="">— Choose technician —</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}{s.departmentName ? ` (${s.departmentName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Assignment Notes</label>
                <textarea className="textarea" rows={2} value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Any instructions…" />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAssign}
                disabled={!assignTechId || assignLoading}
              >
                {assignLoading ? 'Assigning…' : 'Assign Technician'}
              </button>
            </div>
          )}

          {/* Supervisor: Verification */}
          {isSupervisor && report.status === 'under_verification' && (
            <div className="card" style={{ borderColor: '#fde68a' }}>
              <h3 className="card-title" style={{ marginBottom: 8 }}>Verify Completion</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: 16 }}>
                The technician has marked this ticket as repaired. Review and verify or send back.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={() => handleVerify(true)}>
                  ✅ Approve & Close
                </button>
                <button className="btn btn-danger" onClick={() => handleVerify(false)}>
                  ↩ Return for Rework
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Timeline</h3>
            {timeline.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>No events yet.</p>
            ) : (
              <div className="timeline">
                {[...timeline].reverse().map((ev, idx) => (
                  <div key={ev.id} className="timeline-item">
                    <div className={`timeline-dot${idx === 0 ? '' : ' muted'}`} />
                    <div className="timeline-item-header">
                      <span className="timeline-item-title">
                        <span className={`badge badge-${ev.status}`} style={{ fontSize: '0.7rem' }}>
                          {ev.status.replace(/_/g, ' ')}
                        </span>
                      </span>
                      <span className="timeline-item-time">{timeAgo(ev.createdAt)}</span>
                    </div>
                    {ev.actorName && (
                      <p className="timeline-item-note">by {ev.actorName}</p>
                    )}
                    {ev.note && (
                      <p className="timeline-item-note" style={{ marginTop: 4, fontStyle: 'italic' }}>
                        "{ev.note}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
