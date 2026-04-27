import { createFileRoute } from '@tanstack/react-router'
import { ArrowDown, ArrowUpRight, Bot, Heart, WalletCards } from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

type Project = {
  name: string
  href: string
  kind: string
  oneLiner: string
  accent: string
  Icon: LucideIcon
}

const projects: Project[] = [
  {
    name: 'Mithi',
    href: 'https://mithi.app',
    kind: 'Social wishlist',
    oneLiner: 'A social wishlist app for saving and sharing the things you love.',
    accent: '#e94f6f',
    Icon: Heart,
  },
  {
    name: 'Kamit',
    href: 'https://kamit.app',
    kind: 'Shared money goals',
    oneLiner:
      'A shared money-goals workspace that keeps contributions, pools, and progress visible to the whole squad.',
    accent: '#0f9f74',
    Icon: WalletCards,
  },
  {
    name: 'AIyos',
    href: 'https://aiyos.ph',
    kind: 'Done-for-you AI setup',
    oneLiner:
      'Done-for-you AI setup that configures an assistant around a real workflow, with handoff and local support.',
    accent: '#4f6df5',
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
    <main className="portfolio-index">
      <section className="personal-fold" aria-labelledby="portfolio-heading">
        <div className="index-masthead">
          <span>JuiceColored!</span>
          <span>Software developer, open for projects</span>
        </div>

        <div className="index-hero">
          <div className="index-hero-title">
            <h1 id="portfolio-heading">Niño Mollaneda</h1>
          </div>

          <div className="index-hero-copy">
            <p>I build thoughtful web apps, product systems, and useful tools for people who need polished software with a steady hand behind it.</p>
            <a className="index-hero-link" href="#projects">
              Selected work
              <ArrowDown size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="studio-section" id="projects" aria-labelledby="studio-heading">
        <div className="studio-intro">
          <div>
            <span className="index-kicker">{studio.name}</span>
            <h2 id="studio-heading">Small, focused software published through alt164.</h2>
          </div>
          <div className="studio-copy">
            <p>{studio.oneLiner}</p>
            <a href={studio.href} target="_blank" rel="noreferrer">
              Visit alt164
              <ArrowUpRight size={17} />
            </a>
          </div>
        </div>

        <div className="index-table" aria-label="Current projects">
          {projects.map((project) => {
            const ProjectIcon = project.Icon

            return (
              <a className="index-row" href={project.href} target="_blank" rel="noreferrer" key={project.name}>
                <span className="index-icon" style={{ color: project.accent }}>
                  <ProjectIcon size={22} />
                </span>
                <span className="index-name">{project.name}</span>
                <span className="index-kind">{project.kind}</span>
                <span className="index-line">{project.oneLiner}</span>
                <ArrowUpRight size={18} />
              </a>
            )
          })}
        </div>
      </section>

      <footer className="index-footer">
        <span></span>
        <a href={studio.email}>hey@alt164.ph</a>
      </footer>
    </main>
  )
}
