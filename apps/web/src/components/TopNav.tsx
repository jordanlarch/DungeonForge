import { Link, useLocation } from "react-router-dom";

const NAV = [
  { to: "/forge", label: "Forge" },
  { to: "/characters", label: "Characters" },
  { to: "/play", label: "Play" },
];

export default function TopNav() {
  const { pathname } = useLocation();

  return (
    <header className="header top-nav">
      <div>
        <p className="eyebrow">SRD 5.2.1 · CC-BY 4.0</p>
        <h1>DungeonForge</h1>
      </div>
      <nav className="main-nav">
        {NAV.map(({ to, label }) => (
          <Link key={to} to={to} className={pathname.startsWith(to) ? "active" : ""}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
