import { SECTION_LINKS, type Section } from "./types";

interface SidebarRailProps {
  section: Section;
  onSelect: (path: string) => void;
}

export default function SidebarRail({ section, onSelect }: SidebarRailProps) {
  return (
    <aside className="nb-rail dash-left" aria-label="Dashboard sections">
      <h3>Workspace</h3>
      <div className="nb-rail-list">
        {SECTION_LINKS.map((link) => (
          <button
            key={link.section}
            type="button"
            className={`nb-rail-item ${section === link.section ? "is-active" : ""}`}
            onClick={() => onSelect(link.path)}
          >
            <span className="nb-rail-item-title">{link.label}</span>
            <span className="nb-rail-item-hint">{link.hint}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
