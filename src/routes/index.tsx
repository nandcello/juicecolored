import { createFileRoute } from '@tanstack/react-router'
import { ArrowDown, ArrowUpRight, Bot, Heart, WalletCards } from 'lucide-react'

import type { AnchorHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

type ProjectAccent = 'aiyos' | 'kamit' | 'mithi'

type Project = {
  name: string
  href: string
  kind: string
  oneLiner: string
  accent: ProjectAccent
  Icon: LucideIcon
}

type TextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className'> & {
  children: ReactNode
}

const projects: Project[] = [
  {
    name: 'Mithi',
    href: 'https://mithi.app',
    kind: 'Social wishlist',
    oneLiner: 'A social wishlist app for saving and sharing the things you love.',
    accent: 'mithi',
    Icon: Heart,
  },
  {
    name: 'Kamit',
    href: 'https://kamit.app',
    kind: 'Shared money goals',
    oneLiner:
      'A shared money-goals workspace that keeps contributions, pools, and progress visible to the whole squad.',
    accent: 'kamit',
    Icon: WalletCards,
  },
  {
    name: 'AIyos',
    href: 'https://aiyos.ph',
    kind: 'Done-for-you AI setup',
    oneLiner:
      'Done-for-you AI setup that configures an assistant around a real workflow, with handoff and local support.',
    accent: 'aiyos',
    Icon: Bot,
  },
]

const studio = {
  name: 'alt164',
  href: 'https://alt164.ph',
  email: 'mailto:hey@alt164.ph',
  oneLiner:
    'A software publishing studio for calm, focused tools, shipping and maintaining small apps with care.',
}

function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-[#fafaf7] bg-[linear-gradient(90deg,rgba(16,16,16,0.05)_1px,transparent_1px),linear-gradient(180deg,rgb(250_250_247),rgb(240_244_236))] bg-size-[28px_28px,auto] px-10.5 py-7.5 text-[#101010] max-sm:px-4.5 max-sm:py-6">
      <PersonalFold />
      <ProjectsSection />
      <SiteFooter />
    </main>
  )
}

function PersonalFold() {
  return (
    <section className="grid min-h-[calc(100svh-60px)] grid-rows-[auto_1fr] max-sm:min-h-[calc(100svh-48px)]" aria-labelledby="portfolio-heading">
      <Masthead />
      <Hero />
    </section>
  )
}

function Masthead() {
  return (
    <div className="flex items-center justify-between gap-4 font-mono text-[0.86rem] font-bold max-sm:flex-col max-sm:items-start">
      <span>JuiceColored!</span>
      <span>Software developer, open for projects</span>
    </div>
  )
}

function Hero() {
  return (
    <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(280px,0.42fr)] items-end gap-8 self-center py-18 max-[980px]:grid-cols-1 max-sm:pb-8.5 max-sm:pt-11.5">
      <div className="grid gap-5.5">
        <h1 className="m-0 max-w-225 font-serif text-[clamp(4.2rem,12vw,10.8rem)] font-normal leading-[0.82] max-sm:text-[4.5rem]" id="portfolio-heading">
          Niño Mollaneda
        </h1>
      </div>

      <div className="grid max-w-97.5 gap-5.5 max-sm:max-w-none">
        <BodyCopy>
          I build thoughtful web apps, product systems, and useful tools for people who need polished software with a steady hand behind it.
        </BodyCopy>
        <TextLink href="#projects">
          Selected work
          <ArrowDown size={18} />
        </TextLink>
      </div>
    </div>
  )
}

function ProjectsSection() {
  return (
    <section className="grid gap-10.5 pt-22 max-sm:pt-18" id="projects" aria-labelledby="studio-heading">
      <StudioIntro />
      <ProjectList />
    </section>
  )
}

function StudioIntro() {
  return (
    <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(280px,0.45fr)] items-end gap-8 max-[980px]:grid-cols-1">
      <div>
        <span className="font-mono text-[0.78rem] font-bold uppercase tracking-normal">{studio.name}</span>
        <h2 className="mb-0 mt-4.5 max-w-190 font-serif text-[4.4rem] font-normal leading-[0.95] max-[980px]:text-[3.6rem] max-sm:text-[2.82rem]" id="studio-heading">
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
  )
}

function ProjectList() {
  return (
    <div className="grid border-t-2 border-[#101010]" aria-label="Current projects">
      {projects.map((project) => (
        <ProjectRow key={project.name} project={project} />
      ))}
    </div>
  )
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <a className="grid min-h-19.5 grid-cols-[38px_150px_190px_minmax(0,1fr)_24px] items-center gap-4 border-b border-[rgba(16,16,16,0.24)] transition-[background,padding-left] duration-180 ease-in-out hover:bg-[rgba(16,16,16,0.04)] hover:pl-2.5 focus-visible:bg-[rgba(16,16,16,0.04)] focus-visible:pl-2.5 focus-visible:outline-none max-[980px]:grid-cols-[34px_130px_minmax(0,1fr)_20px] max-sm:grid-cols-[30px_minmax(96px,0.35fr)_minmax(0,1fr)] max-sm:gap-3 max-sm:py-4 max-sm:hover:pl-0 max-sm:focus-visible:pl-0" href={project.href} target="_blank" rel="noreferrer">
      <ProjectIconMark project={project} />
      <span className="font-serif text-[2.2rem] max-sm:text-[1.72rem]">{project.name}</span>
      <span className="font-mono text-[0.76rem] font-bold uppercase max-[980px]:hidden">{project.kind}</span>
      <span className="leading-normal text-[rgba(16,16,16,0.66)]">{project.oneLiner}</span>
      <ArrowUpRight className="max-sm:hidden" size={18} />
    </a>
  )
}

function ProjectIconMark({ project }: { project: Project }) {
  const ProjectIcon = project.Icon

  if (project.accent === 'mithi') {
    return (
      <span className="inline-flex text-[#e94f6f]">
        <ProjectIcon size={22} />
      </span>
    )
  }

  if (project.accent === 'kamit') {
    return (
      <span className="inline-flex text-[#0f9f74]">
        <ProjectIcon size={22} />
      </span>
    )
  }

  return (
    <span className="inline-flex text-[#4f6df5]">
      <ProjectIcon size={22} />
    </span>
  )
}

function BodyCopy({ children }: { children: ReactNode }) {
  return <p className="mb-2.5 mt-0 text-[1.08rem] leading-[1.65] text-[rgba(16,16,16,0.66)]">{children}</p>
}

function TextLink({ children, ...anchorProps }: TextLinkProps) {
  return (
    <a {...anchorProps} className="inline-flex w-fit items-center gap-2.25 border-b-2 border-current font-mono text-[0.82rem] font-bold">
      {children}
    </a>
  )
}

function SiteFooter() {
  return (
    <footer className="mt-7 flex items-center justify-between gap-4 font-mono text-[0.86rem] font-bold max-sm:flex-col max-sm:items-start">
      <span></span>
      <a className="inline-flex items-center gap-2" href={studio.email}>hey@alt164.ph</a>
    </footer>
  )
}
