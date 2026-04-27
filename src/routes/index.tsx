import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, Bot, Building2, Heart, WalletCards } from "lucide-react";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

type ProjectAccent = "aiyos" | "f1realty" | "kamit" | "mithi";

type Project = {
  name: string;
  href: string;
  kind: string;
  oneLiner: string;
  accent: ProjectAccent;
  Icon: LucideIcon;
};

type TextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & {
  children: ReactNode;
};

const personalProjects: Project[] = [
  {
    name: "F1 Realty",
    href: "https://f1realty.ph",
    kind: "Real estate platform",
    oneLiner:
      "A property platform for browsing homes, listings, and local opportunities in the Philippines.",
    accent: "f1realty",
    Icon: Building2,
  },
  {
    name: "AIyos",
    href: "https://aiyos.ph",
    kind: "Done-for-you AI setup",
    oneLiner:
      "Done-for-you AI setup that configures an assistant around a real workflow, with handoff and local support.",
    accent: "aiyos",
    Icon: Bot,
  },
];

const studioProjects: Project[] = [
  {
    name: "Mithi",
    href: "https://mithi.app",
    kind: "Social wishlist",
    oneLiner: "A social wishlist app for saving and sharing the things you love.",
    accent: "mithi",
    Icon: Heart,
  },
  {
    name: "Kamit",
    href: "https://kamit.app",
    kind: "Shared money goals",
    oneLiner:
      "A shared money-goals workspace that keeps contributions, pools, and progress visible to the whole squad.",
    accent: "kamit",
    Icon: WalletCards,
  },
];

const studio = {
  name: "alt164",
  href: "https://alt164.ph",
  oneLiner:
    "A software publishing studio for calm, focused tools, shipping and maintaining small apps with care.",
};

function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-[#fafaf7] bg-[linear-gradient(90deg,rgba(16,16,16,0.05)_1px,transparent_1px),linear-gradient(180deg,rgb(250_250_247),rgb(240_244_236))] bg-size-[28px_28px,auto] px-10.5 py-7.5 text-[#101010] max-sm:px-4.5 max-sm:py-6">
      <PersonalFold />
      <ProjectsSection />
      <SiteFooter />
    </main>
  );
}

function PersonalFold() {
  return (
    <section
      className="grid min-h-[calc(100svh-60px)] grid-rows-[auto_minmax(0,1fr)_auto] gap-8 max-sm:min-h-[calc(100svh-48px)] max-sm:gap-6"
      aria-labelledby="portfolio-heading"
    >
      <Masthead />
      <Hero />
      <PersonalProjectShelf />
    </section>
  );
}

function Masthead() {
  return (
    <div className="flex items-center justify-between gap-4 font-mono text-[0.86rem] font-bold max-sm:flex-col max-sm:items-start">
      <span>JuiceColored!</span>
      <span>Software developer, open for projects</span>
    </div>
  );
}

function Hero() {
  return (
    <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(280px,0.42fr)] items-end gap-8 self-center py-12 max-[980px]:grid-cols-1 max-sm:pb-4 max-sm:pt-9">
      <div className="grid gap-5.5">
        <h1
          className="m-0 max-w-225 font-serif text-[clamp(4.2rem,12vw,10.8rem)] font-normal leading-[0.82] max-sm:text-[4.5rem]"
          id="portfolio-heading"
        >
          Niño Mollaneda
        </h1>
      </div>

      <div className="grid max-w-97.5 gap-5.5 max-sm:max-w-none">
        <BodyCopy>
          I build thoughtful web apps, product systems, and useful tools for people who need
          polished software with a steady hand behind it.
        </BodyCopy>
        <TextLink href="#studio-projects">
          Studio projects
          <ArrowDown size={18} />
        </TextLink>
      </div>
    </div>
  );
}

function PersonalProjectShelf() {
  return (
    <section
      className="grid gap-4.5 border-t-2 border-[#101010] pt-4.5"
      aria-labelledby="personal-projects-heading"
    >
      <div className="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
        <div className="grid gap-1.5">
          <span className="font-mono text-[0.74rem] font-bold uppercase tracking-normal">
            Personal projects
          </span>
          <h2
            className="m-0 font-serif text-[2.55rem] font-normal leading-none max-sm:text-[2.2rem]"
            id="personal-projects-heading"
          >
            Independent builds in the wild.
          </h2>
        </div>
        <span className="max-w-92 font-mono text-[0.72rem] font-bold uppercase leading-[1.55] text-[rgba(16,16,16,0.56)]">
          Built outside the studio, designed as a growing shelf.
        </span>
      </div>

      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17.5rem),1fr))] gap-3"
        aria-label="Personal project links"
      >
        {personalProjects.map((project) => (
          <PersonalProjectCard key={project.name} project={project} />
        ))}
      </div>
    </section>
  );
}

function PersonalProjectCard({ project }: { project: Project }) {
  return (
    <a
      className="group grid min-h-36 grid-cols-[auto_minmax(0,1fr)_auto] content-start gap-x-3.5 gap-y-3 rounded-lg border border-[rgba(16,16,16,0.2)] bg-[rgba(255,255,255,0.62)] p-4 shadow-[0_16px_44px_rgba(16,16,16,0.07)] backdrop-blur transition-[background,border-color,transform] duration-180 ease-in-out hover:-translate-y-0.75 hover:border-[rgba(16,16,16,0.42)] hover:bg-white focus-visible:-translate-y-0.75 focus-visible:border-[rgba(16,16,16,0.42)] focus-visible:bg-white focus-visible:outline-none max-sm:min-h-32"
      href={project.href}
      target="_blank"
      rel="noreferrer"
    >
      <ProjectIconMark project={project} />
      <span className="self-center font-mono text-[0.72rem] font-bold uppercase leading-tight text-[rgba(16,16,16,0.56)]">
        {project.kind}
      </span>
      <ArrowUpRight
        className="transition-transform duration-180 ease-in-out group-hover:translate-x-0.75 group-hover:-translate-y-0.75 group-focus-visible:translate-x-0.75 group-focus-visible:-translate-y-0.75"
        size={17}
      />
      <span className="col-span-3 font-serif text-[2.15rem] leading-none max-sm:text-[1.9rem]">
        {project.name}
      </span>
      <span className="col-span-3 text-[0.95rem] leading-[1.48] text-[rgba(16,16,16,0.66)]">
        {project.oneLiner}
      </span>
    </a>
  );
}

function ProjectsSection() {
  return (
    <section
      className="grid gap-10.5 pt-22 max-sm:pt-18"
      id="studio-projects"
      aria-labelledby="studio-heading"
    >
      <StudioIntro />
      <ProjectList />
    </section>
  );
}

function StudioIntro() {
  return (
    <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(280px,0.45fr)] items-end gap-8 max-[980px]:grid-cols-1">
      <div>
        <span className="font-mono text-[0.78rem] font-bold uppercase tracking-normal">
          {studio.name}
        </span>
        <h2
          className="mb-0 mt-4.5 max-w-190 font-serif text-[4.4rem] font-normal leading-[0.95] max-[980px]:text-[3.6rem] max-sm:text-[2.82rem]"
          id="studio-heading"
        >
          Small, focused software published through alt164.
        </h2>
      </div>

      <div className="grid gap-4.5">
        <BodyCopy>{studio.oneLiner}</BodyCopy>
        <TextLink href={studio.href} target="_blank" rel="noreferrer">
          Visit alt164
          <ArrowUpRight size={17} />
        </TextLink>
      </div>
    </div>
  );
}

function ProjectList() {
  return (
    <div className="grid border-t-2 border-[#101010]" aria-label="Studio projects">
      {studioProjects.map((project) => (
        <ProjectRow key={project.name} project={project} />
      ))}
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <a
      className="grid min-h-19.5 grid-cols-[38px_150px_190px_minmax(0,1fr)_24px] items-center gap-4 border-b border-[rgba(16,16,16,0.24)] transition-[background,padding-left] duration-180 ease-in-out hover:bg-[rgba(16,16,16,0.04)] hover:pl-2.5 focus-visible:bg-[rgba(16,16,16,0.04)] focus-visible:pl-2.5 focus-visible:outline-none max-[980px]:grid-cols-[34px_130px_minmax(0,1fr)_20px] max-sm:grid-cols-[30px_minmax(96px,0.35fr)_minmax(0,1fr)] max-sm:gap-3 max-sm:py-4 max-sm:hover:pl-0 max-sm:focus-visible:pl-0"
      href={project.href}
      target="_blank"
      rel="noreferrer"
    >
      <ProjectIconMark project={project} />
      <span className="font-serif text-[2.2rem] max-sm:text-[1.72rem]">{project.name}</span>
      <span className="font-mono text-[0.76rem] font-bold uppercase max-[980px]:hidden">
        {project.kind}
      </span>
      <span className="leading-normal text-[rgba(16,16,16,0.66)]">{project.oneLiner}</span>
      <ArrowUpRight className="max-sm:hidden" size={18} />
    </a>
  );
}

function ProjectIconMark({ project }: { project: Project }) {
  const ProjectIcon = project.Icon;

  if (project.accent === "f1realty") {
    return (
      <span className="inline-flex text-[#b35c20]">
        <ProjectIcon size={22} />
      </span>
    );
  }

  if (project.accent === "mithi") {
    return (
      <span className="inline-flex text-[#e94f6f]">
        <ProjectIcon size={22} />
      </span>
    );
  }

  if (project.accent === "kamit") {
    return (
      <span className="inline-flex text-[#0f9f74]">
        <ProjectIcon size={22} />
      </span>
    );
  }

  return (
    <span className="inline-flex text-[#4f6df5]">
      <ProjectIcon size={22} />
    </span>
  );
}

function BodyCopy({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2.5 mt-0 text-[1.08rem] leading-[1.65] text-[rgba(16,16,16,0.66)]">
      {children}
    </p>
  );
}

function TextLink({ children, ...anchorProps }: TextLinkProps) {
  return (
    <a
      {...anchorProps}
      className="inline-flex w-fit items-center gap-2.25 border-b-2 border-current font-mono text-[0.82rem] font-bold"
    >
      {children}
    </a>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-7 flex items-center justify-between gap-4 font-mono text-[0.86rem] font-bold max-sm:flex-col max-sm:items-start">
      <span></span>
      <a className="inline-flex items-center gap-2" href="mailto:hey@juicecolored.com">
        hey@juicecolored.com
      </a>
    </footer>
  );
}
