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
          <span>Ready for API data</span>
        </div>
        <div>
          <strong>In progress</strong>
          <span>Ready for API data</span>
        </div>
        <div>
          <strong>Completed</strong>
          <span>Ready for API data</span>
        </div>
      </section>
    </main>
  );
}
