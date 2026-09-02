Build **CUT SmartFix**, a complete **Campus Maintenance & Facilities Management System for Chinhoyi University of Technology (CUT)**.

The system must consist of **three connected applications sharing one backend and database**:

1. **Student Mobile App** — built with React Native + Expo.
2. **Maintenance Staff Web Portal** — responsive web application for technicians and maintenance supervisors.
3. **Administrator Web Dashboard** — professional web-based management system for university administrators.

All three applications must communicate through a **shared secure REST API and centralized PostgreSQL database**.

### STUDENT MOBILE APP

Students must be able to:

* Register/login securely.
* View a personalized dashboard.
* Report maintenance issues.
* Select campus, area, building, floor and room/facility.
* Select maintenance category and subcategory.
* Describe the problem.
* Indicate perceived urgency.
* Take photos using the camera or upload existing photos.
* Review and submit reports.
* Receive a unique maintenance ticket number.
* Track the complete status of their report.
* View a visual maintenance timeline.
* View active and historical reports.
* Receive push notifications.
* Receive updates whenever their ticket is reviewed, assigned, started, completed, reopened or closed.
* View technician completion evidence where appropriate.
* Confirm whether the repair actually resolved the issue.
* Reopen an issue if the problem still exists.
* Submit ratings and feedback after resolution.
* Manage their profile and notification preferences.
* Support offline report creation and synchronization when connectivity returns.

The student experience should be extremely simple: a student should be able to report a problem in approximately two minutes.

### MAINTENANCE STAFF WEB PORTAL

Maintenance technicians must have their own secure web portal.

They must be able to:

* Login securely.
* View their assigned tasks.
* View task priority.
* View complete issue details.
* View building, floor and room information.
* View student descriptions.
* View submitted photographs.
* Accept assigned tasks.
* Reject/return incorrectly assigned tasks with a reason.
* Start work.
* Add diagnosis and work notes.
* Upload repair photographs.
* Request required materials.
* Update task status.
* Mark repairs as completed.
* Submit completion evidence.
* View their maintenance history.
* Receive notifications for new assignments, priority changes, reassignment and overdue work.

Maintenance supervisors must additionally be able to:

* View departmental tasks.
* Assign technicians.
* Reassign technicians.
* Monitor technician workload.
* Review completed work.
* Verify or reject completion.
* Reopen tasks.
* Monitor overdue maintenance.
* Approve or reject material requests.

### ADMINISTRATOR WEB DASHBOARD

Build a professional administrative dashboard for university management.

Administrators must be able to:

* View total maintenance requests.
* View pending requests.
* View assigned requests.
* View active/in-progress requests.
* View overdue requests.
* View critical requests.
* View completed requests.
* Search and filter maintenance tickets.
* View complete ticket histories.
* Assign and reassign maintenance staff.
* Manage technicians and supervisors.
* Manage maintenance departments.
* Manage maintenance categories and subcategories.
* Manage campuses.
* Manage campus areas.
* Manage buildings.
* Manage floors.
* Manage rooms/facilities.
* Configure priorities.
* Configure maintenance statuses.
* View student feedback.
* Manage notifications.
* Generate maintenance reports.
* Export reports to PDF/Excel/CSV.
* View maintenance analytics.
* View maintenance trends.
* View issues by category.
* View issues by building.
* View issues by department.
* View issues by technician.
* View average resolution times.
* View overdue and unresolved issues.
* Identify recurring maintenance problems.
* View maintenance workload.
* View audit logs.
* Manage user roles and permissions.
* Configure system settings.

### MAINTENANCE WORKFLOW

Implement the complete lifecycle:

SUBMITTED → UNDER REVIEW → ASSIGNED → ACCEPTED → IN PROGRESS → WAITING FOR MATERIALS → REPAIR COMPLETED → UNDER VERIFICATION → CLOSED.

Also support:

* REJECTED
* DUPLICATE
* CANCELLED
* REOPENED

A technician must not be able to simply close a ticket without completing the required repair information and evidence.

The recommended completion process is:

Student reports issue → Administrator/Supervisor reviews → Priority determined → Department selected → Technician assigned → Technician accepts → Technician starts work → Repair performed → Repair evidence uploaded → Technician submits completion → Supervisor verifies → Student confirms resolution → Ticket closed.

If the student indicates that the problem remains unresolved, the ticket must be reopened.

### MAINTENANCE TICKETS

Every maintenance request must receive a unique identifier such as:

CUT-MNT-2026-000125

A ticket must maintain a complete history containing:

* Reporter.
* Location.
* Category.
* Description.
* Priority.
* Assigned department.
* Assigned technician.
* Status.
* Dates and timestamps.
* Notes.
* Photos.
* Material requests.
* Completion evidence.
* Verification.
* Student feedback.
* Audit history.

### LOCATION STRUCTURE

Do NOT hard-code university buildings into the application.

Use an administrator-managed hierarchy:

Campus → Area → Building → Floor → Room/Facility.

Administrators must be able to add, edit, deactivate and manage locations from the web dashboard.

### MAINTENANCE CATEGORIES

Initially support:

* Electrical.
* Plumbing.
* Building/Structural.
* Furniture.
* ICT Infrastructure.
* Cleaning/Sanitation.
* Grounds.
* Safety.
* Other.

Categories and subcategories must be configurable by administrators.

### PRIORITIES

Support:

* Critical.
* High.
* Medium.
* Low.

Students may indicate perceived urgency, but authorized maintenance staff must determine the official priority.

### MATERIAL MANAGEMENT

Technicians must be able to request materials associated with a maintenance ticket.

Example:

Material: 32mm PVC Pipe
Quantity: 2
Reason: Existing pipe damaged beyond repair.

Material workflow:

REQUESTED → APPROVED/REJECTED → ISSUED → RECEIVED.

Keep this module lightweight in the first version; it is maintenance material tracking, not a full procurement or accounting system.

### NOTIFICATIONS

Implement role-based notifications.

Students receive notifications when:

* Report is submitted.
* Report is reviewed.
* Technician is assigned.
* Work starts.
* Repair is completed.
* Verification is requested.
* Ticket is closed.
* Ticket is reopened.

Technicians receive notifications for:

* New assignments.
* Reassignments.
* Priority changes.
* Material request decisions.
* Overdue tasks.

Administrators/supervisors receive notifications for:

* Critical requests.
* New maintenance requests.
* Overdue tasks.
* Material requests.
* Reopened issues.

### ANALYTICS

The administrator dashboard should provide useful management intelligence.

Include:

* Total reports.
* Reports by status.
* Reports by category.
* Reports by location.
* Reports by department.
* Reports by technician.
* Reports over time.
* Average resolution time.
* Overdue reports.
* Reopened reports.
* Critical issues.
* Recurring problems.
* Technician workload.

Provide charts, tables, filters and date ranges.

Include a maintenance heatmap or location-based issue visualization where practical.

### DATABASE

Use PostgreSQL with a structured relational schema.

Core entities should include:

* Users.
* Roles.
* Departments.
* Campuses.
* Areas.
* Buildings.
* Floors.
* Rooms.
* Categories.
* Subcategories.
* Maintenance Requests.
* Maintenance Assignments.
* Maintenance Photos.
* Maintenance Notes.
* Material Requests.
* Notifications.
* Status History.
* Feedback.
* Audit Logs.

Use UUID primary keys where appropriate and proper foreign-key relationships.

### BACKEND

Build a centralized secure REST API.

Organize API modules around:

* Authentication.
* Users.
* Roles.
* Locations.
* Categories.
* Maintenance Requests.
* Assignments.
* Photos.
* Notes.
* Materials.
* Notifications.
* Feedback.
* Analytics.
* Reports.
* Audit Logs.

Use role-based authorization on the backend.

Never rely on the mobile or web frontend alone to enforce permissions.

### SECURITY

Implement:

* Secure authentication.
* Password hashing.
* Access tokens/session management.
* Role-based access control.
* Input validation.
* API authorization.
* Rate limiting.
* Secure file uploads.
* HTTPS.
* Audit logging.
* Proper database permissions.
* Protection against unauthorized access to student information.
* Protection against students viewing other students' private information.

### OFFLINE-FIRST MOBILE EXPERIENCE

The student mobile application should support limited offline functionality.

A student should be able to create a maintenance report without an active internet connection.

Store pending reports and photos locally, then synchronize automatically when connectivity returns.

Implement:

Local Storage → Sync Queue → API → Server Database.

Images should be compressed before upload to reduce mobile data usage.

### UI/UX

Create a modern, clean, professional university system.

The student mobile application should be:

* Simple.
* Friendly.
* Fast.
* Responsive.
* Easy to understand.
* Optimized for Android.
* Suitable for users with limited technical experience.

The maintenance staff portal should prioritize:

* Task visibility.
* Priority.
* Location.
* Work status.
* Evidence.
* Speed of updating jobs.

The administrator portal should prioritize:

* Data visibility.
* Filtering.
* Assignment.
* Analytics.
* Accountability.
* Reporting.

Use a consistent design system across all interfaces while giving each role an appropriate experience.

Use cards, tables, status badges, timelines, charts, filters, modals and clear call-to-action buttons.

### ROLE-BASED NAVIGATION

Student mobile:

Home | Reports | Notifications | Profile

Staff web:

Dashboard | My Tasks | Active Work | Materials | History | Notifications | Profile

Supervisor:

Dashboard | Requests | Assignments | Team | Materials | Verification | Analytics

Administrator:

Dashboard | Maintenance | Assignments | Staff | Locations | Categories | Departments | Materials | Analytics | Reports | Notifications | Audit Logs | Settings

### IMPORTANT ARCHITECTURE

Do not build the Student App, Staff Portal and Admin Portal as disconnected systems.

They must share:

ONE backend API
ONE PostgreSQL database
ONE authentication/authorization system
ONE maintenance ticket system
ONE location system
ONE notification system
ONE audit system.

The architecture should be:

Student Expo App
↓
Shared REST API
↓
PostgreSQL Database
↑
Staff Web Portal
↑
Admin Web Dashboard

### INTELLIGENT FEATURES

Design the architecture so intelligent functionality can be introduced later without rebuilding the core system.

Future capabilities may include:

* AI-assisted issue classification.
* Automatic category suggestion.
* Priority recommendations.
* Duplicate issue detection.
* Technician assignment recommendations.
* Workload optimization.
* Recurring problem detection.
* Predictive maintenance analytics.
* Maintenance forecasting.

These should NOT be allowed to compromise the reliability of the basic maintenance workflow.

### INITIAL MVP

The first production version must prioritize:

1. Authentication.
2. Student reporting.
3. Location management.
4. Categories.
5. Photo evidence.
6. Ticket generation.
7. Ticket tracking.
8. Staff assignments.
9. Technician task management.
10. Status updates.
11. Completion evidence.
12. Supervisor verification.
13. Student feedback.
14. Notifications.
15. Administrator dashboard.
16. Staff management.
17. Location management.
18. Basic analytics.
19. Audit logs.
20. Secure shared backend.

Advanced AI, predictive maintenance, advanced inventory/procurement, SMS integrations and complex external integrations should remain future phases.

### DEVELOPMENT PRINCIPLE

Build the system as a real institutional software platform, not as a simple student complaint application.

The final product should provide a complete digital chain:

REPORT → REVIEW → PRIORITIZE → ASSIGN → ACCEPT → REPAIR → VERIFY → CONFIRM → CLOSE → ANALYSE.

Every important action should be traceable, every maintenance request should have a complete lifecycle, and university management should be able to understand the state and performance of campus maintenance from a single dashboard.

The system must be scalable so that additional campuses, buildings, departments, users, maintenance categories and future integrations can be added without redesigning the core architecture.
