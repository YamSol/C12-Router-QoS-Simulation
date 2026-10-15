import { NUM_PORTAS, TIPOS, type Pacote, type Tipo } from '../model/tipos';

export interface ParamsGerador {
  quantidade: number;
  /** Percentual por tipo; é normalizado, não precisa somar 100. */
  percentuais: Record<Tipo, number>;
  tamanhoMin: number;
  tamanhoMax: number;
  /** Chegadas sorteadas em [0, janela]. */
  janela: number;
  seed: number;
}

/** mulberry32: gerador pseudoaleatório pequeno e determinístico. */
export function criarRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mesmo seed e mesmos parâmetros geram sempre a mesma lista. */
export function gerarLista(params: ParamsGerador): Pacote[] {
  const rng = criarRng(params.seed);
  const sorteia = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const total = TIPOS.reduce((s, t) => s + Math.max(0, params.percentuais[t]), 0);

  const pacotes: Pacote[] = [];
  for (let i = 0; i < params.quantidade; i++) {
    pacotes.push({
      id: i + 1,
      tipo: sortearTipo(rng(), params.percentuais, total),
      tamanho: sorteia(params.tamanhoMin, params.tamanhoMax),
      chegada: sorteia(0, params.janela),
      porta: sorteia(1, NUM_PORTAS),
    });
  }
  return ordenarPorChegada(pacotes);
}

function sortearTipo(r: number, percentuais: Record<Tipo, number>, total: number): Tipo {
  if (total <= 0) return TIPOS[Math.floor(r * TIPOS.length)] ?? 'UDP';
  let acumulado = 0;
  for (const t of TIPOS) {
    acumulado += Math.max(0, percentuais[t]) / total;
    if (r < acumulado) return t;
  }
  return 'UDP';
}

export function ordenarPorChegada(pacotes: Pacote[]): Pacote[] {
  return [...pacotes].sort((a, b) => a.chegada - b.chegada || a.id - b.id);
}
