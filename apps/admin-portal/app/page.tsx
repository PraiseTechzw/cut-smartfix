export default function AdminHome() {
  return (
    <main>
      <header>
        <p className="eyebrow">CHINHOYI UNIVERSITY OF TECHNOLOGY</p>
        <h1>Facilities command center.</h1>
        <p className="lede">
          Monitor campus maintenance demand, assign work, and keep a clear audit
          trail.
        </p>
      </header>
      <section className="metrics">
        <div>
          <span>Open requests</span>
          <strong>Live</strong>
        </div>
        <div>
          <span>Assigned today</span>
          <strong>Live</strong>
        </div>
        <div>
          <span>Average resolution</span>
          <strong>Live</strong>
        </div>
      </section>
      <nav className="modules" aria-label="Administration modules"><a href="/requests">Requests</a><a href="/assignments">Assignments</a><a href="/staff">Staff</a><a href="/buildings">Buildings and rooms</a><a href="/analytics">Analytics</a><a href="/audit">Audit logs</a></nav>
    </main>
  );
}
