"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LINKS = [
  { href: "/admin", label: "Sessões" },
  { href: "/admin/consultores", label: "Consultores" },
  { href: "/admin/eventos", label: "Eventos" },
];

/**
 * Menu fixo em todas as páginas do admin — antes só era possível ir a
 * Consultores/Eventos a partir do dashboard principal, nunca de uma página
 * de detalhe (ex: /admin/webinar/[id]) diretamente para as outras secções.
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
    <>
      <style>{`
        .ad-nav { background: #000000; padding: 0.9rem 1.25rem; }
        .ad-nav-caixa {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          gap: 1.25rem;
          align-items: center;
          justify-content: center;
        }
        .ad-nav a {
          color: #b3b0a6;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 0.3rem 0;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
        }
        .ad-nav a:hover { color: #ffffff; }
        .ad-nav a.ad-nav-ativo { color: #ffffff; border-bottom-color: #8a9a5b; }
        @media (min-width: 640px) {
          .ad-nav-caixa { justify-content: flex-start; gap: 1.5rem; }
        }
      `}</style>
      <nav className="ad-nav">
        <div className="ad-nav-caixa">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={ativo(l.href) ? "ad-nav-ativo" : ""}>
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </>
  );
}
