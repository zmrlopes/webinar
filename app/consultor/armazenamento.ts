const CHAVE = "backoffice-consultor-email";

/** Silencioso de propósito — localStorage pode estar bloqueado (modo privado, etc.), não é motivo para partir a página. */
export function lerEmailGuardado(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function guardarEmail(email: string): void {
  try {
    window.localStorage.setItem(CHAVE, email);
  } catch {
    // ignora
  }
}

export function limparEmailGuardado(): void {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // ignora
  }
}
