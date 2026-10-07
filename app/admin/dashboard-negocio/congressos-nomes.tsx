import { dataEvento, eventosAnalisados, type DadosEventos } from "@/lib/eventos-dashboard";
import styles from "./eventos.module.css";

export function CongressosNomes({ dados }: { dados: DadosEventos }): React.JSX.Element {
  const eventos = eventosAnalisados(dados).sort((a, b) => b.inicio.localeCompare(a.inicio));
  return <details className={styles.details}>
    <summary>Eventos considerados <span>{eventos.length}</span></summary>
    <div className={styles.detailsBody}>
      <p className={styles.description}>Congressos e convenções com lista disponível. ✓ indica check-in registado.</p>
      {!eventos.length && <p className={styles.empty}>Ainda não há listas disponíveis.</p>}
      {eventos.map(e => <details key={e.id} className={styles.event}>
        <summary><div><strong>{e.nome}</strong><small>{dataEvento(e)}{e.local && ` · ${e.local}`}</small></div><span>{e.pessoas!.length} inscritos</span></summary>
        <div className={styles.names}>{e.pessoas!.map(p => <span key={p.email.trim().toLowerCase() || p.id} className={p.checkin ? styles.checked : styles.name}>{p.nome}{p.checkin ? " ✓" : ""}</span>)}</div>
        {e.nota && <p className={styles.description}>{e.nota}</p>}
      </details>)}
    </div>
  </details>;
}
