import { TIPOS, NUM_PORTAS, TAMANHO_MAX, TAMANHO_MIN, type Pacote, type Tipo } from '../model/tipos';

export type ResultadoParse =
  | { ok: true; pacotes: Pacote[] }
  | { ok: false; erros: string[] };

const CAMPOS = ['id', 'tipo', 'tamanho', 'chegada', 'porta'] as const;

/** Aceita JSON (array de objetos) ou CSV com cabeçalho. Qualquer erro rejeita a lista inteira. */
export function parseLista(texto: string): ResultadoParse {
  const limpo = texto.trim();
  if (limpo === '') return { ok: false, erros: ['lista vazia'] };
  return limpo.startsWith('[') ? parseJson(limpo) : parseCsv(limpo);
}

function parseJson(texto: string): ResultadoParse {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    return { ok: false, erros: ['JSON inválido'] };
  }
  if (!Array.isArray(dados)) return { ok: false, erros: ['JSON deve ser um array'] };
  const brutos = dados.map((item: unknown) => {
    const obj = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
    return CAMPOS.map((c) => obj[c]);
  });
  // No JSON, "linha" é a posição no array, começando em 1.
  return validar(brutos, 1);
}

function parseCsv(texto: string): ResultadoParse {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  const cabecalho = (linhas[0] ?? '').split(',').map((c) => c.trim().toLowerCase());
  const indices = CAMPOS.map((c) => cabecalho.indexOf(c));
  if (indices.some((i) => i < 0)) {
    return { ok: false, erros: [`linha 1: cabeçalho deve ser ${CAMPOS.join(',')}`] };
  }
  const brutos = linhas.slice(1).map((l) => {
    const cols = l.split(',').map((c) => c.trim());
    return indices.map((i) => cols[i]);
  });
  // A linha 1 é o cabeçalho; dados começam na 2.
  return validar(brutos, 2);
}

function validar(brutos: unknown[][], primeiraLinha: number): ResultadoParse {
  const erros: string[] = [];
  const pacotes: Pacote[] = [];
  const ids = new Set<number>();
  if (brutos.length === 0) return { ok: false, erros: ['lista sem pacotes'] };

  brutos.forEach((campos, i) => {
    const linha = i + primeiraLinha;
    const [idB, tipoB, tamanhoB, chegadaB, portaB] = campos;
    const motivos: string[] = [];

    const id = inteiro(idB);
    if (id === undefined) motivos.push('id deve ser inteiro');
    else if (ids.has(id)) motivos.push(`id ${id} repetido`);

    const tipo = normalizarTipo(tipoB);
    if (tipo === undefined) motivos.push('tipo deve ser VoIP, HTTP ou UDP');

    const tamanho = inteiro(tamanhoB);
    if (tamanho === undefined || tamanho < TAMANHO_MIN || tamanho > TAMANHO_MAX) {
      motivos.push(`tamanho deve ser inteiro de ${TAMANHO_MIN} a ${TAMANHO_MAX}`);
    }

    const chegada = inteiro(chegadaB);
    if (chegada === undefined || chegada < 0) motivos.push('chegada deve ser inteiro ≥ 0');

    const porta = inteiro(portaB);
    if (porta === undefined || porta < 1 || porta > NUM_PORTAS) {
      motivos.push(`porta deve ser de 1 a ${NUM_PORTAS}`);
    }

    if (motivos.length > 0) {
      erros.push(`linha ${linha}: ${motivos.join('; ')}`);
      return;
    }
    // Todos validados acima.
    ids.add(id!);
    pacotes.push({ id: id!, tipo: tipo!, tamanho: tamanho!, chegada: chegada!, porta: porta! });
  });

  return erros.length > 0 ? { ok: false, erros } : { ok: true, pacotes };
}

function inteiro(valor: unknown): number | undefined {
  if (typeof valor === 'number') return Number.isInteger(valor) ? valor : undefined;
  if (typeof valor === 'string' && /^-?\d+$/.test(valor.trim())) return Number(valor);
  return undefined;
}

function normalizarTipo(valor: unknown): Tipo | undefined {
  if (typeof valor !== 'string') return undefined;
  const v = valor.trim().toLowerCase();
  return TIPOS.find((t) => t.toLowerCase() === v);
}

/** Serializa para JSON no mesmo formato aceito pelo parser. */
export function paraJson(pacotes: Pacote[]): string {
  return JSON.stringify(pacotes, null, 2);
}
