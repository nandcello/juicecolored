import { SmallPleasures } from "./small-pleasures";
import {
  Cover,
  Introduction,
  IndependentProjects,
  Studio,
  StudioProjects,
  Contact,
} from "./spreads";
import { useBookNavigation } from "./use-book-navigation";

import type { PortfolioStatusProps } from "./small-pleasures";

const chapters = [
  { id: "cover", className: "cover", name: "Cover" },
  { id: "introduction", className: "introduction", name: "An introduction" },
  { id: "independent", className: "personal", name: "Independent builds" },
  { id: "studio", className: "studio", name: "The studio" },
  { id: "studio-projects", className: "studio-projects", name: "Mithi & Kamit" },
  { id: "small-pleasures", className: "pleasures", name: "Small pleasures" },
  { id: "contact", className: "contact", name: "The next chapter" },
];

export function PortfolioBook(props: PortfolioStatusProps) {
  const { bookRef, current, contentsOpen, setContentsOpen, go } = useBookNavigation(
    chapters.length,
  );
  const spreads = [
    <Cover key="cover" onNavigate={go} />,
    <Introduction key="introduction" />,
    <IndependentProjects key="independent" />,
    <Studio key="studio" onNavigate={go} />,
    <StudioProjects key="studio-projects" />,
    <SmallPleasures key="pleasures" {...props} />,
    <Contact key="contact" onNavigate={go} />,
  ];

  return (
    <div className="portfolio">
      <a className="skip" href="#book">
        Skip to portfolio
      </a>
      <header className="masthead">
        <a
          href="#cover"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            go(0);
          }}
        >
          JuiceColored<span>!</span>
        </a>
        <span className="edition">THE COLLECTED WORK OF NIÑO MOLLANEDA</span>
        <button
          id="contents-button"
          aria-expanded={contentsOpen}
          aria-controls="contents"
          onClick={() => setContentsOpen(!contentsOpen)}
        >
          Contents <span aria-hidden="true">☰</span>
        </button>
      </header>
      <nav id="contents" hidden={!contentsOpen} aria-label="Book contents">
        <span className="eyebrow">In this volume</span>
        <h2>
          A few good
          <br />
          <em>things.</em>
        </h2>
        <div id="contents-list">
          {chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              onClick={() => go(index)}
              aria-current={current === index ? "page" : undefined}
            >
              {chapter.name}
              <span>{String(index + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      </nav>
      <main ref={bookRef} id="book" tabIndex={-1} aria-label="Portfolio book" inert={contentsOpen}>
        {chapters.map((chapter, index) => (
          <section
            key={chapter.id}
            id={chapter.id}
            className={`page ${chapter.className}${current === index ? " turn-in" : ""}`}
            aria-label={chapter.name}
            inert={current !== index}
            aria-hidden={current !== index}
          >
            {spreads[index]}
          </section>
        ))}
      </main>
      <footer className="reader" inert={contentsOpen}>
        <span id="chapter-label">{chapters[current].name.toUpperCase()}</span>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${((current + 1) / chapters.length) * 100}%` }} />
        </div>
        <div className="reader-controls">
          <button
            aria-label="Previous spread"
            disabled={current === 0}
            onClick={() => go(current - 1)}
          >
            ←
          </button>
          <span aria-live="polite" aria-atomic="true">
            {String(current + 1).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")}
          </span>
          <button
            aria-label="Next spread"
            disabled={current === chapters.length - 1}
            onClick={() => go(current + 1)}
          >
            →
          </button>
        </div>
      </footer>
    </div>
  );
}
