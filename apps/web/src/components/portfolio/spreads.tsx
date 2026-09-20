// Content and artwork ported from the approved Sites portfolio.

export function Cover({ onNavigate }: { onNavigate: (index: number) => void }) {
  return (
    <>
      <div className="cover-top">
        <span>SOFTWARE, WITH A LITTLE SOUL.</span>
        <span>
          INDEPENDENT DEVELOPER
          <br />& SOFTWARE PUBLISHER
        </span>
      </div>
      <div className="cover-title">
        <h1>
          <span>Juice</span>
          <em>Colored!</em>
        </h1>
        <span className="round-note">
          THOUGHTFULLY
          <br />
          BUILT.
          <br />
          <i>Always.</i>
        </span>
      </div>
      <div className="cover-bottom">
        <div>
          <span className="eyebrow">A PORTFOLIO BY</span>
          <p>Niño Mollaneda</p>
        </div>
        <p className="cover-intro">
          Thoughtful web apps,
          <br />
          product systems,
          <br />
          and useful tools.
        </p>
        <button className="open-book" onClick={() => onNavigate(1)}>
          Open the book <span>↗</span>
        </button>
      </div>
      <span className="cover-spine">JUICECOLORED! — SELECTED WORKS & SMALL PLEASURES</span>
    </>
  );
}

export function Introduction() {
  return (
    <>
      <div className="spread-label">
        <span>01 — AN INTRODUCTION</span>
        <span>NIÑO MOLLANEDA</span>
      </div>
      <div className="intro-layout">
        <h2>
          A steady
          <br />
          <em>hand.</em>
          <br />A curious
          <br />
          <em>mind.</em>
        </h2>
        <div className="intro-copy">
          <span className="eyebrow">HELLO, I'M NIÑO.</span>
          <p className="large-copy">
            I build thoughtful web apps, product systems, and useful tools for people who need
            polished software with a steady hand behind it.
          </p>
          <p>Software developer, open for projects.</p>
          <a className="text-link" href="mailto:hey@juicecolored.com">
            hey@juicecolored.com ↗
          </a>
        </div>
      </div>
      <div className="folio">
        <span>THE PERSON BEHIND THE WORK</span>
        <span>02 / 03</span>
      </div>
    </>
  );
}

export function IndependentProjects() {
  return (
    <>
      <div className="spread-label">
        <span>02 — INDEPENDENT BUILDS</span>
        <span>OUT IN THE WILD</span>
      </div>
      <div className="personal-heading">
        <h2>
          A growing
          <br />
          <em>shelf.</em>
        </h2>
        <p>
          Built outside the studio.
          <br />
          Made for real life.
        </p>
      </div>
      <div className="personal-grid">
        <article className="f1-project">
          <span className="eyebrow">01 / REAL ESTATE PLATFORM</span>
          <a
            href="https://f1realty.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="project-title"
          >
            <h3>F1 Realty</h3>
            <span>↗</span>
          </a>
          <p>
            A property platform for browsing homes, listings, and local opportunities in the
            Philippines.
          </p>
          <span className="project-url">F1REALTY.PH</span>
        </article>
        <article className="ai-project">
          <div className="ai-copy">
            <span className="eyebrow">02 / DONE-FOR-YOU AI SETUP</span>
            <a
              href="https://aiyos.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="project-title"
            >
              <h3>AIyos</h3>
              <span>↗</span>
            </a>
            <p>
              Done-for-you AI setup that configures an assistant around a real workflow, with
              handoff and local support.
            </p>
            <span className="project-url">AIYOS.PH</span>
          </div>
          <a
            href="https://aiyos.ph"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit AIyos"
          >
            <img
              src="/portfolio/aiyos.jpg"
              width="1400"
              height="732"
              alt="AIyos — AI setup, done for you"
              loading="lazy"
            />
          </a>
        </article>
      </div>
      <div className="folio">
        <span>PERSONAL PROJECTS</span>
        <span>04 / 05</span>
      </div>
    </>
  );
}

export function Studio({ onNavigate }: { onNavigate: (index: number) => void }) {
  return (
    <>
      <div className="spread-label">
        <span>03 — THE STUDIO</span>
        <span>ALT164</span>
      </div>
      <div className="studio-layout">
        <div className="studio-word">
          <h2>
            Small.
            <br />
            Focused.
            <br />
            <em>Useful.</em>
          </h2>
          <a
            href="https://alt164.ph"
            className="studio-brand"
            target="_blank"
            rel="noopener noreferrer"
          >
            alt164 <span>↗</span>
          </a>
        </div>
        <div className="studio-copy">
          <span className="eyebrow">SOFTWARE, PUBLISHED WITH CARE.</span>
          <p className="large-copy">Small, focused software published through alt164.</p>
          <p>
            A software publishing studio for calm, focused tools, shipping and maintaining small
            apps with care.
          </p>
          <button className="text-link" onClick={() => onNavigate(4)}>
            Explore the studio projects →
          </button>
        </div>
      </div>
      <div className="folio">
        <span>A STUDIO FOR CALM, FOCUSED TOOLS</span>
        <span>06 / 07</span>
      </div>
    </>
  );
}

export function StudioProjects() {
  return (
    <>
      <div className="spread-label">
        <span>04 — FROM THE STUDIO</span>
        <span>TWO TOOLS, BUILT WITH CARE</span>
      </div>
      <div className="studio-project-grid">
        <article>
          <span className="eyebrow">01 / SOCIAL WISHLIST</span>
          <a
            href="https://mithi.app"
            target="_blank"
            rel="noopener noreferrer"
            className="project-image"
          >
            <img
              src="/portfolio/mithi.jpg"
              width="1400"
              height="735"
              alt="Mithi.app — The simplest way to share what you love"
              loading="lazy"
            />
          </a>
          <a
            className="project-title"
            href="https://mithi.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2>Mithi</h2>
            <span>↗</span>
          </a>
          <p>A social wishlist app for saving and sharing the things you love.</p>
        </article>
        <article>
          <span className="eyebrow">02 / SHARED MONEY GOALS</span>
          <a
            href="https://kamit.app"
            target="_blank"
            rel="noopener noreferrer"
            className="project-image"
          >
            <img
              src="/portfolio/kamit.jpg"
              width="1400"
              height="739"
              alt="Kamit — Achieve together"
              loading="lazy"
            />
          </a>
          <a
            className="project-title"
            href="https://kamit.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2>Kamit</h2>
            <span>↗</span>
          </a>
          <p>
            A shared money-goals workspace that keeps contributions, pools, and progress visible to
            the whole squad.
          </p>
        </article>
      </div>
      <div className="folio">
        <span>PUBLISHED THROUGH ALT164</span>
        <span>08 / 09</span>
      </div>
    </>
  );
}

export function Contact({ onNavigate }: { onNavigate: (index: number) => void }) {
  return (
    <>
      <div className="spread-label">
        <span>06 — THE NEXT CHAPTER</span>
        <span>OPEN FOR PROJECTS</span>
      </div>
      <div className="contact-main">
        <span className="eyebrow">HAVE SOMETHING IN MIND?</span>
        <h2>
          Let's make
          <br />
          <em>something</em>
          <br />
          good.
        </h2>
        <a className="contact-email" href="mailto:hey@juicecolored.com">
          hey@juicecolored.com <span>↗</span>
        </a>
      </div>
      <div className="contact-bottom">
        <span>
          Niño Mollaneda
          <br />
          Software developer & publisher
        </span>
        <button className="text-link" onClick={() => onNavigate(0)}>
          Back to the cover ↑
        </button>
      </div>
      <div className="folio">
        <a href="https://juicecolored.com/" target="_blank" rel="noopener noreferrer">
          JUICECOLORED.COM ↗
        </a>
        <span>12 / 13</span>
      </div>
    </>
  );
}
