export default function StaffHome() {
  return (
    <main>
      <p className="eyebrow">CUT SMARTFIX / STAFF</p>
      <h1>Today&apos;s maintenance work.</h1>
      <p className="lede">
        A focused workspace for technicians and supervisors to triage, update,
        and close campus jobs.
      </p>
      <section className="grid">
        <div>
          <strong>My tasks</strong>
          <span>Tasks assigned to your profile</span>
        </div>
        <div>
          <strong>In progress</strong>
          <span>Jobs currently being worked</span>
        </div>
        <div>
          <strong>Completed</strong>
          <span>Resolved work awaiting review</span>
        </div>
      </section>
      <nav className="modules" aria-label="Staff modules"><a href="/tasks">My tasks</a><a href="/materials">Material requests</a><a href="/evidence">Repair evidence</a><a href="/completed">Completed jobs</a></nav>
    </main>
  );
}
