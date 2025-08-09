// === MAIN.TS - Portfolio Interactions ===

// Feature detection
const prefersReducedMotion: boolean = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

document.addEventListener("DOMContentLoaded", init);

function init(): void {
  setupSmoothScroll();
  setupProjectNotes();
  setupEmailCopy();
  if (!prefersReducedMotion) {
    setupAnimations();
  }
  setupAccessibility();
}

// === SMOOTH SCROLL ===
function setupSmoothScroll(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (e: MouseEvent) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const target = document.querySelector<HTMLElement>(targetId);
      if (!target) return;

      e.preventDefault();

      const header = document.querySelector<HTMLElement>(".header");
      const headerHeight = header?.offsetHeight ?? 0;
      const targetPosition = target.offsetTop - headerHeight - 20;

      window.scrollTo({
        top: targetPosition,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });

      // Update focus for accessibility
      target.setAttribute("tabindex", "-1");
      target.focus();
    });
  });
}

// === PROJECT NOTES MODAL ===
function setupProjectNotes(): void {
  const notesButtons = document.querySelectorAll<HTMLElement>("[data-project]");

  type Note = { title: string; content: string };
  const projectNotes: Record<string, Note> = {
    pearl: {
      title: "Pearl Properties - Process Notes",
      content: `
╔══════════════════════════════════════╗
║  PROJECT APPROACH                    ║
╚══════════════════════════════════════╝

▸ Challenge: Create intuitive property search
  for Philippine real estate market

▸ Solution: Implemented faceted search with
  location-based filtering and virtual tours

▸ Tech decisions:
  - React for dynamic UI updates
  - AWS Lambda for serverless scaling
  - CloudFront for fast asset delivery

▸ Result: 40% increase in user engagement
  and 25% faster property inquiries
        `,
    },
    achropix: {
      title: "Achropix - Process Notes",
      content: `
╔══════════════════════════════════════╗
║  PROJECT APPROACH                    ║
╚══════════════════════════════════════╝

▸ Challenge: Streamline custom printing
  workflow from design to production

▸ Solution: Built real-time preview system
  with automated quality checks

▸ Tech decisions:
  - Canvas API for design manipulation
  - Node.js for order processing
  - S3 for secure file storage

▸ Result: Reduced order processing time
  by 60% and improved print accuracy
        `,
    },
  };

  notesButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const projectKey = (button as HTMLElement).dataset.project;
      const notes = projectNotes[projectKey ?? ""];

      if (!notes) return;

      showNotesModal(notes);
    });
  });
}

function showNotesModal(notes: { title: string; content: string }): void {
  // Create modal backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-labelledby", "modal-title");
  backdrop.setAttribute("aria-modal", "true");

  // Create modal content
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
      <h2 id="modal-title">${notes.title}</h2>
      <pre class="modal__content">${notes.content}</pre>
      <button class="btn modal__close">[ Close × ]</button>
    `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Add styles
  const style = document.createElement("style");
  style.textContent = `
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        padding: var(--space-md);
      }

      .modal {
        background: var(--yellow-cream);
        border: 3px solid var(--ink-dark);
        padding: var(--space-md);
        max-width: 60ch;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
      }

      .modal h2 {
        margin-bottom: var(--space-md);
        color: var(--ink-dark);
      }

      .modal__content {
        color: var(--ink-medium);
        margin-bottom: var(--space-md);
        white-space: pre-wrap;
      }

      .modal__close {
        width: 100%;
      }
    `;
  document.head.appendChild(style);

  // Focus management
  const closeButton = modal.querySelector<HTMLButtonElement>(".modal__close");
  closeButton?.focus();

  // Close handlers
  const closeModal = (): void => {
    backdrop.remove();
    style.remove();
  };

  closeButton?.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e: MouseEvent) => {
    if (e.target === backdrop) closeModal();
  });

  // Escape key handler
  const escapeHandler = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escapeHandler);
    }
  };
  document.addEventListener("keydown", escapeHandler);
}

// === EMAIL COPY ===
function setupEmailCopy(): void {
  const copyButton = document.querySelector<HTMLButtonElement>(".btn--copy");
  if (!copyButton) return;

  copyButton.addEventListener("click", async () => {
    const email = copyButton.dataset.copy ?? "";

    try {
      await navigator.clipboard.writeText(email);

      // Visual feedback
      const originalText = copyButton.textContent ?? "";
      copyButton.textContent = "[ Copied! ✓ ]";
      (copyButton.style as CSSStyleDeclaration).background =
        "var(--yellow-deep)";

      setTimeout(() => {
        copyButton.textContent = originalText;
        (copyButton.style as CSSStyleDeclaration).background = "";
      }, 2000);
    } catch (_err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = email;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      copyButton.textContent = "[ Copied! ]";
      setTimeout(() => {
        copyButton.textContent = "[ Copy Email ]";
      }, 2000);
    }
  });
}

// === ANIMATIONS ===
function setupAnimations(): void {
  // Intersection Observer for fade-in animations
  const observerOptions: IntersectionObserverInit = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement;
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }
    });
  }, observerOptions);

  // Observe sections
  const sections = document.querySelectorAll<HTMLElement>("section");
  sections.forEach((section) => {
    section.style.opacity = "0";
    section.style.transform = "translateY(20px)";
    section.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(section);
  });

  // Parallax effect for hero
  let ticking = false;

  function updateParallax(): void {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector<HTMLElement>(".hero__art");

    if (hero && scrolled < window.innerHeight) {
      hero.style.transform = `translateY(${scrolled * 0.3}px)`;
    }

    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  });
}

// === ACCESSIBILITY ENHANCEMENTS ===
function setupAccessibility(): void {
  // Announce page navigation for screen readers
  const announcer = document.createElement("div");
  announcer.setAttribute("aria-live", "polite");
  announcer.setAttribute("aria-atomic", "true");
  announcer.className = "sr-only";
  announcer.style.position = "absolute";
  announcer.style.left = "-10000px";
  announcer.style.width = "1px";
  announcer.style.height = "1px";
  announcer.style.overflow = "hidden";
  document.body.appendChild(announcer);

  // Keyboard navigation enhancements
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    // Press '/' to focus search/nav
    if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const firstNavLink = document.querySelector<HTMLElement>(".nav__link");
      firstNavLink?.focus();
    }

    // Press 'g' then 'h' to go home
    if (e.key === "g") {
      let nextKey = "";
      const keyHandler = (event: KeyboardEvent) => {
        nextKey = event.key;
        if (nextKey === "h") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        document.removeEventListener("keydown", keyHandler);
      };
      document.addEventListener("keydown", keyHandler);

      // Clear listener after 1 second
      setTimeout(() => {
        document.removeEventListener("keydown", keyHandler);
      }, 1000);
    }
  });

  // Ensure focus styles are visible
  const style = document.createElement("style");
  style.textContent = `
      *:focus-visible {
        outline: 3px solid var(--ink-dark) !important;
        outline-offset: 2px !important;
      }
    `;
  document.head.appendChild(style);
}

// === PERFORMANCE MONITORING ===
if ("PerformanceObserver" in window) {
  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // eslint-disable-next-line no-console
        console.log(
          `Performance: ${entry.name} - ${Math.round(entry.startTime)}ms`
        );
      }
    });
    paintObserver.observe({ entryTypes: ["paint"] });
  } catch (_e) {
    // Silent fail for unsupported browsers
  }
}
