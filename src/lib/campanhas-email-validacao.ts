export function validarCampanha(valor: unknown) {
 const v = valor as Record<string, unknown> | null;
 const assunto = typeof v?.assunto === 'string' ? v.assunto.trim() : '';
 const corpo = typeof v?.corpo === 'string' ? v.corpo.trim() : '';
 const listas = Array.isArray(v?.listas) ? [...new Set(v.listas)] : [];
 if (!assunto || assunto.length > 200 || !corpo || corpo.length > 50000) throw new Error('Preenche o assunto (até 200 caracteres) e o texto (até 50.000 caracteres).');
 if (!listas.length || listas.length > 100 || listas.some(l => typeof l !== 'string' || l.length > 260)) throw new Error('Escolhe pelo menos uma lista válida.');
 const local = typeof v?.data === 'string' ? v.data : '';
 if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error('Escolhe a data e a hora de Lisboa.');
 const qrEvento = v?.qrEvento === true || v?.qrEvento === '1';
 return { assunto, corpo, listas: listas as string[], local, qrEvento };
}

export function deduplicarDestinatarios(rows: {email: string}[]) {
 return [...new Set(rows.map(r => r.email.trim().toLowerCase()).filter(e => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))].sort();
}
