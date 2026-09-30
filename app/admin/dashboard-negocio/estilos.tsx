import React from "react";

/**
 * Estilos partilhados pelos separadores do Dashboard Negócio portados do
 * artefacto (Objetivos, Linha direta, Incentivos). As mesmas variáveis e
 * classes do artefacto, para o aspeto ficar igual. O separador Mapas tem os
 * seus próprios estilos (mapas-cliente.tsx); render-se um separador de cada
 * vez, por isso não há conflito.
 */
export function DashboardEstilos(): React.JSX.Element {
  return (
    <style>{`
      .viz-root {
        --brand-900:#4b5320; --brand-700:#5a6728; --brand-tint-bg:#eef1e4; --brand-tint-fg:#4b5320;
        --good-tint-bg:#e4f3e4; --good:#0ca30c; --bad-tint-bg:#fbe7e4; --bad:#c0392b; --pending-tint-bg:#f2f2ee;
        --surface-1:#ffffff; --surface-2:#f7f8f2; --page-plane:#ffffff;
        --text-primary:#111111; --text-secondary:#6b6f61; --text-muted:#8a8d80;
        --grid:#eeeeee; --axis:#dcded4; --border:rgba(75,83,32,0.22); --border-soft:rgba(75,83,32,0.14);
        --shadow:0 6px 18px rgba(75,83,32,0.14),0 1px 3px rgba(11,11,11,0.06);
        --brand-tint-bg2:#eef1e4;
        color:var(--text-primary); font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
      }
      .viz-root * { box-sizing:border-box; }
      .section-label { font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.05em; margin-bottom:10px; }
      .section-note { font-size:12.5px; color:var(--text-muted); line-height:1.5; margin:-4px 0 16px; max-width:760px; }
      .events-summary { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:18px; }
      .es-stat { background:var(--surface-1); border:1px solid var(--border); border-radius:12px; padding:12px 18px; box-shadow:var(--shadow); }
      .es-value { font-size:20px; font-weight:700; }
      .es-label { font-size:11.5px; color:var(--text-secondary); margin-top:2px; }
      .events-card { background:var(--surface-1); border:1px solid var(--border); border-radius:14px; padding:18px 20px; box-shadow:var(--shadow); margin-bottom:14px; }
      .events-card h3 { font-size:14.5px; font-weight:700; margin:0 0 14px; }
      .events-card-date { font-size:11.5px; font-weight:500; color:var(--text-muted); margin-left:8px; }
      .events-table-wrap { overflow-x:auto; }
      table.events-table { width:100%; border-collapse:collapse; font-size:13px; }
      table.events-table th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.03em; color:var(--text-secondary); font-weight:700; padding:0 10px 8px; border-bottom:1px solid var(--border); }
      table.events-table td { padding:9px 10px; border-bottom:1px solid var(--grid); }
      table.events-table tbody tr:hover { background:var(--brand-tint-bg); }
      table.events-table tfoot td { border-bottom:none; border-top:2px solid var(--border); font-weight:700; padding-top:10px; }
      table.events-table .ev-name { font-weight:600; color:var(--text-primary); }
      table.events-table .ev-user { font-size:11px; color:var(--text-muted); margin-left:4px; }
      table.events-table td.ev-num { text-align:right; font-weight:700; font-variant-numeric:tabular-nums; }
      .tbl-more-cell { text-align:center; cursor:pointer; padding:10px !important; color:var(--brand-700); font-weight:700; font-size:12.5px; background:var(--brand-tint-bg); }
      .tbl-more-cell:hover { background:var(--border-soft); }
      .stick0 th:first-child, .stick0 td:first-child { position:sticky; left:0; z-index:1; background:var(--surface-1); box-shadow:1px 0 0 var(--grid); }
      .stick0 tbody tr:hover td:first-child { background:var(--brand-tint-bg); }
      .stick0 tfoot td:first-child { position:sticky; left:0; background:var(--surface-1); }

      /* Objetivos */
      .proj-sim { display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:var(--surface-1); border:1px solid var(--border); border-radius:12px; padding:12px 16px; margin-bottom:16px; }
      .proj-sim label { font-size:12.5px; font-weight:700; color:var(--text-primary); }
      .proj-sim input[type="number"] { width:90px; font-size:13.5px; font-family:inherit; padding:6px 9px; border:1px solid var(--border); border-radius:8px; background:var(--surface-1); color:var(--text-primary); }
      .proj-sim input:focus { outline:2px solid var(--brand-700); outline-offset:1px; }
      .proj-sim-hint { font-size:11.5px; color:var(--text-muted); }
      .proj-sim button { font-family:inherit; font-size:12px; font-weight:600; background:var(--brand-tint-bg); color:var(--brand-tint-fg); border:1px solid var(--border); border-radius:8px; padding:6px 12px; cursor:pointer; }
      .goal-card { background:var(--surface-1); border:1px solid var(--border); border-radius:14px; padding:16px 18px 18px; margin-bottom:16px; box-shadow:var(--shadow); }
      .goal-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; margin-bottom:4px; }
      .goal-card h3 { font-size:14.5px; font-weight:700; margin:0 0 2px; }
      .goal-sub { font-size:11.5px; color:var(--text-muted); }
      .goal-caption { font-size:11px; color:var(--text-muted); margin-bottom:12px; }
      .goal-pace { margin:10px 0 14px; }
      .goal-pace-row { display:flex; align-items:baseline; justify-content:space-between; gap:10px; flex-wrap:wrap; font-size:11.5px; margin-bottom:5px; }
      .gp-label { color:var(--text-secondary); }
      .gp-values b { font-weight:700; } .gp-values b.exp { color:var(--text-primary); } .gp-values b.good { color:var(--good); } .gp-values b.bad { color:var(--bad); }
      .goal-pace-bar { position:relative; height:10px; border-radius:5px; background:rgba(11,11,11,0.07); }
      .goal-pace-fill { position:absolute; left:0; top:0; height:100%; border-radius:5px; }
      .goal-pace-fill.good { background:var(--good); } .goal-pace-fill.bad { background:var(--bad); }
      .goal-pace-marker { position:absolute; top:-3px; height:16px; width:2px; background:var(--text-primary); }
      .gp-marker-label { position:absolute; top:-15px; left:50%; transform:translateX(-50%); font-size:9.5px; font-weight:700; color:var(--text-primary); white-space:nowrap; }
      .goal-badge { display:flex; align-items:baseline; gap:6px; border-radius:10px; padding:6px 12px; white-space:nowrap; }
      .goal-badge.good { background:var(--good-tint-bg); } .goal-badge.bad { background:var(--bad-tint-bg); }
      .goal-badge .gv { font-size:15px; font-weight:700; } .goal-badge.good .gv { color:var(--good); } .goal-badge.bad .gv { color:var(--bad); }
      .goal-badge .gl { font-size:11px; color:var(--text-secondary); }
      .goal-cells { display:grid; grid-template-columns:repeat(12,1fr); gap:6px; }
      @media (max-width:780px){ .goal-cells { grid-template-columns:repeat(6,1fr); } }
      .goal-cell { border-radius:9px; padding:7px 4px 8px; text-align:center; border:1px solid var(--border); }
      .goal-cell.good { background:var(--good-tint-bg); border-color:rgba(12,163,12,0.35); }
      .goal-cell.bad { background:var(--bad-tint-bg); border-color:rgba(192,57,43,0.35); }
      .goal-cell.pending { background:var(--pending-tint-bg); border-color:var(--border-soft); }
      .gc-month { font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); letter-spacing:.02em; }
      .gc-real { font-size:10px; color:var(--text-primary); font-weight:600; margin-top:2px; white-space:nowrap; }
      .gc-target { font-size:9.5px; color:var(--text-muted); white-space:nowrap; }
      .gc-bar { height:4px; border-radius:2px; background:rgba(11,11,11,0.08); margin:5px 2px 4px; overflow:hidden; }
      .gc-bar-fill { height:100%; border-radius:2px; }
      .goal-cell.good .gc-bar-fill { background:var(--good); } .goal-cell.bad .gc-bar-fill { background:var(--bad); } .goal-cell.pending .gc-bar-fill { background:var(--text-muted); }
      .gc-pct { font-size:12.5px; font-weight:700; margin-top:1px; }
      .goal-cell.good .gc-pct { color:var(--good); } .goal-cell.bad .gc-pct { color:var(--bad); } .goal-cell.pending .gc-pct { color:var(--text-muted); font-weight:500; }

      /* Linha direta (V2) */
      .v2-tag { display:inline-block; margin-left:6px; font-size:9.5px; font-weight:700; color:var(--brand-700); background:var(--brand-tint-bg); border:1px solid var(--border-soft); border-radius:4px; padding:0 4px; vertical-align:1px; }
      .v2-anos { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:18px; }
      @media (max-width:780px){ .v2-anos { grid-template-columns:repeat(2,1fr); } }
      .v2-ano { background:var(--surface-1); border:1px solid var(--border); border-radius:12px; padding:12px 14px; box-shadow:var(--shadow); }
      .v2-ano-top { font-size:13px; display:flex; align-items:baseline; gap:6px; }
      .v2-ano-parcial { font-size:10px; color:var(--text-muted); font-weight:500; }
      .v2-ano-barra { height:5px; border-radius:3px; background:var(--grid); margin:8px 0 7px; overflow:hidden; }
      .v2-ano-barra span { display:block; height:100%; border-radius:3px; background:var(--brand-700); }
      .v2-ano-val { font-size:18px; font-weight:700; }
      .v2-ano-val span { font-size:10.5px; font-weight:500; color:var(--text-muted); }
      .v2-ano-sub { font-size:10.5px; color:var(--text-secondary); margin-top:2px; }

      /* Incentivos */
      .inc-corridas { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; margin-bottom:6px; }
      @media (max-width:780px){ .inc-corridas { grid-template-columns:1fr; } }
      .inc-corrida { margin-bottom:9px; }
      .inc-corrida-top { display:flex; justify-content:space-between; align-items:baseline; gap:10px; font-size:12px; margin-bottom:3px; }
      .inc-corrida-top span { font-size:11px; color:var(--text-muted); white-space:nowrap; }
      .inc-corrida-bar { height:7px; border-radius:4px; background:var(--grid); overflow:hidden; }
      .inc-corrida-bar span { display:block; height:100%; border-radius:4px; background:var(--brand-700); }
      .inc-premio { display:inline-flex; align-items:baseline; gap:5px; font-size:11.5px; line-height:1.3; background:var(--brand-tint-bg); border:1px solid var(--border-soft); border-radius:6px; padding:3px 8px; margin:2px 4px 2px 0; }
      .inc-premio .ip-mes { font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--text-muted); }
      .inc-premio .ip-nome { font-weight:600; color:var(--brand-900); }
      .inc-premio.falta { background:var(--bad-tint-bg); border-color:rgba(192,57,43,0.3); }
      .inc-premio.falta .ip-nome { color:var(--bad); }
    `}</style>
  );
}
