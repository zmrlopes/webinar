import assert from "node:assert/strict";
import { resumirPresencasEvento } from "../src/lib/eventos-presencas";

const bilhete = (id: string, presente: boolean) => ({ id, rotulo: id, presente, presenteEm: presente ? new Date("2026-11-14T09:00:00Z") : null });
const grupo = { adultos: 2, criancasMais10: 1, criancasMenos10: 1, bilhetes: [bilhete("adulto-1", true), bilhete("adulto-2", false), bilhete("crianca-1", true), bilhete("crianca-2", false)] };
assert.deepEqual(resumirPresencasEvento([grupo]), { total: 4, presentes: 2, semCheckin: 2 }, "Um check-in não confirma a inscrição inteira; contar crianças e acompanhantes individualmente.");
assert.deepEqual(resumirPresencasEvento([]), { total: 0, presentes: 0, semCheckin: 0 });
assert.deepEqual(resumirPresencasEvento([{ adultos: 1, criancasMais10: 0, criancasMenos10: 0, bilhetes: [] }]), { total: 1, presentes: 0, semCheckin: 1 }, "Inscrições sem bilhetes emitidos continuam no total sem check-in.");
assert.deepEqual(resumirPresencasEvento([grupo, { adultos: 1, criancasMais10: 0, criancasMenos10: 0, bilhetes: [bilhete("outro", true)] }]), { total: 5, presentes: 3, semCheckin: 2 });
assert.deepEqual(resumirPresencasEvento([{ ...grupo, bilhetes: grupo.bilhetes.map(b => ({ ...b, presente: true })) }]), { total: 4, presentes: 4, semCheckin: 0 });
console.log("Presenças dos eventos: contagens individuais e inscrições parciais verificadas.");
