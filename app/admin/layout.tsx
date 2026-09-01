"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function IconInicio(): React.JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.5 10.5 12 4l8.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9v10a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

function IconSair(): React.JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A autenticação do admin é HTTP Basic Auth (proxy.ts), sem sessão/cookie
 * próprio — o browser é que guarda as credenciais e envia-as sempre que
 * pede algo em /admin. Não há um "logout" real do lado do servidor; o
 * truque é sobrepor as credenciais guardadas com umas inválidas (o browser
 * substitui-as mesmo o pedido falhando), para que da próxima vez que se
 * tente entrar em /admin o browser envie as credenciais erradas e volte a
 * pedir a password.
 */
async function terminarSessao(): Promise<void> {
  try {
    await fetch("/admin", {
      headers: { Authorization: `Basic ${btoa("sair:sair")}` },
      cache: "no-store",
    });
  } catch {
    // esperado — as credenciais são inválidas de propósito
  } finally {
    window.location.href = "/";
  }
}

const LINKS = [
  { href: "/admin", label: "Início", icon: IconInicio },
  { href: "/admin/sessoes", label: "Sessões", icon: IconSessoes },
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
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/sessoes") {
      return (
        pathname.startsWith("/admin/sessoes") ||
        pathname.startsWith("/admin/webinar") ||
        pathname.startsWith("/admin/formacoes")
      );
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="ad-shell">
      <style>{`
        .ad-shell { display: flex; min-height: 100vh; background: #ffffff; }
        .menu-lateral {
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
          display: flex;
          flex-direction: column;
        }
        .menu-lateral-marca {
          font-weight: 800;
          font-size: 1.05rem;
          color: #ffffff;
          margin: 0 0 2rem;
          padding: 0 0.5rem;
        }
        .menu-lateral-nav { display: flex; flex-direction: column; gap: 0.3rem; }
        .menu-lateral-item {
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
        .menu-lateral-item:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; }
        .menu-lateral-item.menu-lateral-ativo { background: #ffffff; color: #4b5320; }
        .menu-lateral-item svg { flex-shrink: 0; }
        .menu-lateral-sair {
          margin-top: auto;
          background: none;
          border: none;
          width: 100%;
          font: inherit;
          text-align: left;
        }
        .ad-conteudo { flex: 1; min-width: 0; }

        @media (max-width: 720px) {
          .ad-shell { flex-direction: column; min-height: 0; }
          .menu-lateral {
            width: 100%;
            height: auto;
            position: static;
            border-right: none;
            border-bottom: 1px solid #3a4019;
            padding: 0.75rem 1rem;
          }
          .menu-lateral-marca { display: none; }
          .menu-lateral-nav { flex-direction: row; overflow-x: auto; gap: 0.4rem; }
          .menu-lateral-item { flex-shrink: 0; }
        }
      `}</style>
      <aside className="menu-lateral">
        <p className="menu-lateral-marca">Admin</p>
        <nav className="menu-lateral-nav">
          {LINKS.map((l) => {
            const Icone = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`menu-lateral-item${ativo(l.href) ? " menu-lateral-ativo" : ""}`}
              >
                <Icone />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button type="button" className="menu-lateral-item menu-lateral-sair" onClick={terminarSessao}>
          <IconSair />
          Sair
        </button>
      </aside>
      <div className="ad-conteudo">{children}</div>
    </div>
  );
}
