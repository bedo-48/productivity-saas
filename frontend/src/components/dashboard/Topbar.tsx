import { NavLink, useLocation } from "react-router-dom";
import { NAV_LINKS } from "./types";

interface TopbarProps {
  userName?: string | null;
  userEmail?: string | null;
  onLogout: () => void;
}

function avatarInitial(name?: string | null, email?: string | null) {
  const source = (name && name.trim()) || (email && email.trim()) || "?";
  return source.charAt(0).toUpperCase();
}

export default function Topbar({ userName, userEmail, onLogout }: TopbarProps) {
  const { pathname } = useLocation();
  return (
    <header className="nb-topbar dash-topbar">
      <div className="nb-brand">
        <span className="nb-brand-kicker">Paper productivity</span>
        <span className="nb-brand-name">TaskLedger</span>
      </div>

      <nav className="nb-nav" aria-label="Primary">
        {NAV_LINKS.map((link) => {
          const active = link.match ? link.match(pathname) : pathname.startsWith(link.path);
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={`nb-nav-link ${active ? "is-active" : ""}`}
              end={link.path === "/dashboard"}
            >
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="nb-user">
        <div className="nb-avatar" aria-hidden="true">
          {avatarInitial(userName, userEmail)}
        </div>
        <span className="nb-user-name">{userName || userEmail || "Signed in"}</span>
        <button type="button" className="nb-logout" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
