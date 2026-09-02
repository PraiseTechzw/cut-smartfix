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
          <strong>--</strong>
        </div>
        <div>
          <span>Assigned today</span>
          <strong>--</strong>
        </div>
        <div>
          <span>Average resolution</span>
          <strong>--</strong>
        </div>
      </section>
    </main>
  );
}
