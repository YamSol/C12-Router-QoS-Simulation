import type { Algoritmo, Pacote } from '../model/tipos';

/** Pacote na fila de entrada, com quanto ainda falta transmitir. */
export interface PacoteNaFila {
  pacote: Pacote;
  restante: number;
  /** Ordem de entrada na fila; cresce a cada (re)entrada. Usada no RR. */
  ordem: number;
}

/**
 * Interface comum dos escalonadores. Implementações são puras: não sabem de
 * threads, portas nem UI. A fila é um array simples, percorrido à mão.
 */
export interface Escalonador {
  readonly algoritmo: Algoritmo;
  /** A regra em uma frase, para a UI. */
  readonly regra: string;
  adicionar(item: PacoteNaFila): void;
  /** Remove e devolve o próximo pacote a transmitir. */
  proximo(): PacoteNaFila | undefined;
  /** Os próximos n, sem remover. */
  espiar(n: number): PacoteNaFila[];
  /** Quantos ticks a próxima fatia deste pacote dura. */
  fatia(item: PacoteNaFila): number;
  readonly tamanho: number;
}

/**
 * Base com a fila e a seleção por comparação. Cada algoritmo define só a
 * comparação ("a vem antes de b?") e o tamanho da fatia.
 */
abstract class EscalonadorBase implements Escalonador {
  abstract readonly algoritmo: Algoritmo;
  abstract readonly regra: string;
  protected fila: PacoteNaFila[] = [];

  protected abstract antes(a: PacoteNaFila, b: PacoteNaFila): boolean;

  fatia(item: PacoteNaFila): number {
    return item.restante;
  }

  adicionar(item: PacoteNaFila): void {
    this.fila.push(item);
  }

  proximo(): PacoteNaFila | undefined {
    const i = this.indiceDoMelhor(this.fila);
    if (i < 0) return undefined;
    const [item] = this.fila.splice(i, 1);
    return item;
  }

  espiar(n: number): PacoteNaFila[] {
    const copia = [...this.fila];
    const resultado: PacoteNaFila[] = [];
    while (resultado.length < n && copia.length > 0) {
      const i = this.indiceDoMelhor(copia);
      const [item] = copia.splice(i, 1);
      if (item) resultado.push(item);
    }
    return resultado;
  }

  get tamanho(): number {
    return this.fila.length;
  }

  private indiceDoMelhor(fila: PacoteNaFila[]): number {
    let melhor = -1;
    for (let i = 0; i < fila.length; i++) {
      const atual = fila[i];
      const candidato = melhor < 0 ? undefined : fila[melhor];
      if (atual && (!candidato || this.antes(atual, candidato))) melhor = i;
    }
    return melhor;
  }
}

/** Desempate comum: chegada, depois id. */
function porChegada(a: PacoteNaFila, b: PacoteNaFila): number {
  return a.pacote.chegada - b.pacote.chegada || a.pacote.id - b.pacote.id;
}

/** Menor tamanho primeiro, não preemptivo. */
export class Sjf extends EscalonadorBase {
  readonly algoritmo = 'SJF';
  readonly regra = 'O menor pacote da fila vai primeiro.';

  protected antes(a: PacoteNaFila, b: PacoteNaFila): boolean {
    return (a.pacote.tamanho - b.pacote.tamanho || porChegada(a, b)) < 0;
  }
}

/** Transmite por um quantum e volta ao fim da fila. */
export class RoundRobin extends EscalonadorBase {
  readonly algoritmo = 'RR';
  readonly regra: string;

  constructor(private readonly quantum: number) {
    super();
    this.regra = `Cada pacote transmite até ${quantum} ticks e volta ao fim da fila.`;
  }

  protected antes(a: PacoteNaFila, b: PacoteNaFila): boolean {
    return a.ordem < b.ordem;
  }

  override fatia(item: PacoteNaFila): number {
    return Math.min(this.quantum, item.restante);
  }
}

const PESO: Record<Pacote['tipo'], number> = { VoIP: 0, HTTP: 1, UDP: 2 };

/** VoIP > HTTP > UDP; empate por ordem de chegada; sem aging. */
export class Prioridade extends EscalonadorBase {
  readonly algoritmo = 'Prioridade';
  readonly regra = 'VoIP antes de HTTP antes de UDP; empate por chegada.';

  protected antes(a: PacoteNaFila, b: PacoteNaFila): boolean {
    return (PESO[a.pacote.tipo] - PESO[b.pacote.tipo] || porChegada(a, b)) < 0;
  }
}

export function criarEscalonador(algoritmo: Algoritmo, quantum: number): Escalonador {
  switch (algoritmo) {
    case 'SJF':
      return new Sjf();
    case 'RR':
      return new RoundRobin(quantum);
    case 'Prioridade':
      return new Prioridade();
  }
}
