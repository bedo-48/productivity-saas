import { useMemo } from "react";

/**
 * Decorative background layer that scatters short task-like phrases
 * across the page in a handwritten font. Purely cosmetic — pointer-events
 * disabled, aria-hidden, never receives focus.
 *
 * Designed to sit behind the real content. The parent must be position:
 * relative (or fixed/absolute) for the backdrop to fill it.
 */

const PHRASES: string[] = [
  // English — universal
  "do your homework",
  "call your friends",
  "buy groceries",
  "pay the bills",
  "finish the report",
  "book a flight",
  "team standup at 9",
  "review the PR",
  "water the plants",
  "renew the gym pass",
  "send the invoice",
  "plan the weekend",
  "fix the bug",
  "ship it before Friday",
  "drink more water",
  "read 10 pages",
  "go for a walk",
  "feed the cat",
  "clean the desk",
  "back up the laptop",
  "reply to mom",
  "schedule the dentist",
  "write the blog post",
  "stretch for 5 min",
  "draft the email",
  // Français — touche personnelle
  "appeler maman",
  "réviser les maths",
  "déjeuner avec Léa",
  "préparer le pitch",
  "acheter du pain",
  "envoyer la facture",
  "ranger le bureau",
  "courir 5 km",
  "relire le contrat",
  "régler l'abonnement",
  "passer au pressing",
  "préparer la réunion",
  "arroser les plantes",
  "rappeler Tom",
  "finir le chapitre",
  "noter les idées",
  "trier les mails",
  "prévoir le voyage",
  "appeler le médecin",
  "réserver le resto",
  "payer le loyer",
  "écrire trois lignes",
  "méditer 10 minutes",
  "remercier Sophie",
  "préparer le café",
];

interface ScatteredPhrase {
  text: string;
  /** % from left within the parent container */
  left: number;
  /** % from top within the parent container */
  top: number;
  /** rotation in degrees */
  rotate: number;
  /** font size in rem */
  size: number;
  /** opacity 0..1 */
  opacity: number;
}

/**
 * Tiny deterministic PRNG so positions stay stable between renders within
 * a session (no jitter on every state change), but vary between mounts.
 */
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLayout(seed: number, count: number): ScatteredPhrase[] {
  const rand = mulberry32(seed);
  // Shuffle a copy of PHRASES, then take the first `count`.
  const pool = [...PHRASES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picks = pool.slice(0, Math.min(count, pool.length));
  return picks.map((text) => ({
    text,
    left: rand() * 96,
    top: rand() * 96,
    rotate: (rand() - 0.5) * 28, // -14° .. +14°
    size: 0.95 + rand() * 0.85, // 0.95rem .. 1.8rem
    opacity: 0.18 + rand() * 0.22, // 0.18 .. 0.40
  }));
}

interface NotebookBackdropProps {
  /**
   * "dark" — light text on dark surfaces (e.g. auth desk).
   * "light" — warm brown text on cream surfaces (e.g. dashboard).
   */
  palette?: "dark" | "light";
  /** Number of phrases to scatter. Default 32. */
  density?: number;
  /** Stable seed so the layout doesn't reshuffle on every render. */
  seed?: number;
}

export default function NotebookBackdrop({
  palette = "light",
  density = 32,
  seed = 1337,
}: NotebookBackdropProps) {
  const phrases = useMemo(() => buildLayout(seed, density), [seed, density]);

  const baseColor =
    palette === "dark" ? "rgba(255, 248, 232, 0.85)" : "rgba(74, 56, 44, 0.78)";

  return (
    <div className="notebook-backdrop" aria-hidden="true">
      <style>{`
        .notebook-backdrop {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          font-family: "Patrick Hand", "Caveat", cursive;
          user-select: none;
        }
        .notebook-backdrop .scribble {
          position: absolute;
          white-space: nowrap;
          letter-spacing: 0.01em;
          line-height: 1;
          color: ${baseColor};
          transform-origin: center;
          will-change: transform;
        }
        .notebook-backdrop .scribble::before {
          content: "✓";
          margin-right: 6px;
          opacity: 0.55;
          font-family: inherit;
        }
      `}</style>
      {phrases.map((phrase, index) => (
        <span
          key={`${phrase.text}-${index}`}
          className="scribble"
          style={{
            left: `${phrase.left}%`,
            top: `${phrase.top}%`,
            transform: `translate(-50%, -50%) rotate(${phrase.rotate}deg)`,
            fontSize: `${phrase.size}rem`,
            opacity: phrase.opacity,
          }}
        >
          {phrase.text}
        </span>
      ))}
    </div>
  );
}
