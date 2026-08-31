"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function IconSessoes(): React.JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function IconConsultores(): React.JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" strokeLinecap="round" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M15.8 14.3c2.7.3 4.7 2.4 4.7 5.7" strokeLinecap="round" />
    </svg>
  );
}

function IconEventos(): React.JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 2.4 3.2H4Z" />
      <path d="M20 9.5a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0-2.4 3.2H20Z" />
      <path d="M6 5h12v9.5c0 4-2.7 6.5-6 6.5s-6-2.5-6-6.5V5Z" />
      <path d="M12 15.5v4" strokeLinecap="round" />
    </svg>
  );
}

const LINKS = [
  { href: "/admin", label: "Sessões", icon: IconSessoes },
  { href: "/admin/consultores", label: "Consultores", icon: IconConsultores },
  { href: "/admin/eventos", label: "Eventos", icon: IconEventos },
];

/**
 * Menu lateral fixo em todas as páginas do admin — antes era uma barra
 * horizontal no topo; passou a menu lateral (ícone + texto) a pedido, para
 * ficar mais parecido com um painel de administração "a sério". Em ecrãs
 * estreitos deita-se na horizontal no topo (uma barra lateral fixa não
 * cabe em telemóvel).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  function ativo(href: string): boolean {
    if (href === "/admin") {
      return pathname === "/admin" || pathname.startsWith("/admin/webinar");
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="ad-shell">
      <style>{`
        .ad-shell { display: flex; min-height: 100vh; background: #ffffff; }
        .ad-sidebar {
          flex-shrink: 0;
          width: 220px;
          background: #4b5320;
          border-right: 1px solid #3a4019;
          padding: 1.5rem 1rem;
          position: sticky;
          top: 0;
          align-self: flex-start;
          height: 100vh;
          overflow-y: auto;
          box-sizing: border-box;
        }
        .ad-sidebar-marca {
          font-weight: 800;
          font-size: 1.05rem;
          color: #ffffff;
          margin: 0 0 2rem;
          padding: 0 0.5rem;
        }
        .ad-sidebar-nav { display: flex; flex-direction: column; gap: 0.3rem; }
        .ad-sidebar-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem 0.75rem;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.75);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .ad-sidebar-item:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; }
        .ad-sidebar-item.ad-sidebar-ativo { background: #ffffff; color: #4b5320; }
        .ad-sidebar-item svg { flex-shrink: 0; }
        .ad-conteudo { flex: 1; min-width: 0; }

        @media (max-width: 720px) {
          .ad-shell { flex-direction: column; min-height: 0; }
          .ad-sidebar {
            width: 100%;
            height: auto;
            position: static;
            border-right: none;
            border-bottom: 1px solid #3a4019;
            padding: 0.75rem 1rem;
          }
          .ad-sidebar-marca { display: none; }
          .ad-sidebar-nav { flex-direction: row; overflow-x: auto; gap: 0.4rem; }
          .ad-sidebar-item { flex-shrink: 0; }
        }
      `}</style>
      <aside className="ad-sidebar">
        <p className="ad-sidebar-marca">Admin</p>
        <nav className="ad-sidebar-nav">
          {LINKS.map((l) => {
            const Icone = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`ad-sidebar-item${ativo(l.href) ? " ad-sidebar-ativo" : ""}`}
              >
                <Icone />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="ad-conteudo">{children}</div>
    </div>
  );
}
