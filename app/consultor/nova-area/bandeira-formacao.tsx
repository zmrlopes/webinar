import { LINGUAS_FORMACOES, type LinguaFormacao } from "@/lib/formacoes-forum-icligo";
import type { ReactNode } from "react";

/** SVG para as bandeiras também ficarem visíveis nos navegadores Windows. */
export function BandeiraFormacao({ lingua, className }: { lingua?: LinguaFormacao | null; className?: string }) {
  if (!lingua) return null;
  let desenho: ReactNode;
  switch (lingua) {
    case "pt": desenho = <><path fill="#da291c" d="M0 0h30v20H0z" /><path fill="#046a38" d="M0 0h12v20H0z" /><circle cx="12" cy="10" r="4" fill="#ffcc00" /><path d="M9.5 6.5h5v5c0 3-5 3-5 0z" fill="#fff" stroke="#da291c" strokeWidth="1.2" /><path d="M11 8h2v4h-2z" fill="#003399" /></>; break;
    case "es": desenho = <><path fill="#aa151b" d="M0 0h30v20H0z" /><path fill="#f1bf00" d="M0 5h30v10H0z" /><path d="M8 8h4v4l-2 2-2-2z" fill="#aa151b" /><path d="M7 7h6v2H7z" fill="#b58500" /></>; break;
    case "gb": desenho = <><path fill="#012169" d="M0 0h30v20H0z" /><path d="m0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="5" /><path d="m0 0 30 20M30 0 0 20" stroke="#c8102e" strokeWidth="2" /><path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="7" /><path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="4" /></>; break;
    case "us": desenho = <><path fill="#fff" d="M0 0h30v20H0z" />{Array.from({ length: 7 }, (_, i) => <rect key={i} x="0" y={i * 40 / 13} width="30" height={20 / 13} fill="#b31942" />)}<path fill="#0a3161" d="M0 0h13v10.8H0z" />{Array.from({ length: 9 }, (_, linha) => Array.from({ length: linha % 2 ? 5 : 6 }, (_, coluna) => <circle key={`${linha}-${coluna}`} cx={1 + coluna * 2.1 + (linha % 2 ? 1 : 0)} cy={1 + linha * 1.1} r=".35" fill="#fff" />))}</>; break;
    case "fr": desenho = <><path fill="#fff" d="M0 0h30v20H0z" /><path fill="#002395" d="M0 0h10v20H0z" /><path fill="#ed2939" d="M20 0h10v20H20z" /></>; break;
    case "de": desenho = <><path d="M0 0h30v20H0z" fill="#ffce00" /><path d="M0 0h30v13.333H0z" fill="#d00" /><path d="M0 0h30v6.667H0z" fill="#000" /></>; break;
    case "it": desenho = <><path fill="#fff" d="M0 0h30v20H0z" /><path fill="#009246" d="M0 0h10v20H0z" /><path fill="#ce2b37" d="M20 0h10v20H20z" /></>; break;
    case "br": desenho = <><path fill="#009739" d="M0 0h30v20H0z" /><path fill="#fedf00" d="m15 2 12 8-12 8L3 10z" /><circle cx="15" cy="10" r="5" fill="#002776" /><path d="M10 9q5-1 10 3" stroke="#fff" fill="none" strokeWidth="1" /></>; break;
  }
  return <span className={className} role="img" aria-label={LINGUAS_FORMACOES[lingua].nome} title={LINGUAS_FORMACOES[lingua].nome} data-lingua={lingua}>
    <svg width="24" height="16" viewBox="0 0 30 20" fill="none" aria-hidden="true" style={{ display: "block", overflow: "hidden", borderRadius: 2 }}>{desenho}</svg>
  </span>;
}
