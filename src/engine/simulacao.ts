import { calcularMetricas } from '../metrics/metricas';
import {
  NUM_PORTAS,
  type ConfigSimulacao,
  type EstadoThread,
  type Metricas,
  type Pacote,
  type ResultadoPacote,
} from '../model/tipos';
import { criarEscalonador, type Escalonador, type PacoteNaFila } from '../scheduler/escalonador';
import {
  ESCRITAS,
  ESTADO,
  ESTADO_COLISAO,
  ESTADO_ESPERANDO,
  ESTADO_TRANSMITINDO,
  FATIA,
  OCUPADA,
  PORTA,
  SENHA,
  TRANSMITIU,
  basePorta,
  baseThread,
} from '../sync/memoria';
import type { Executor } from './executor';

export interface PacoteVisivel {
  pacote: Pacote;
  restante: number;
}

export interface ThreadVisivel {
  estado: EstadoThread;
  item?: PacoteVisivel;
}

export interface PortaVisivel {
  colisao: boolean;
  /** Threads escrevendo na porta neste tick. */
  escritas: number;
  /** Últimos pacotes entregues por esta porta, o mais recente primeiro. */
  ultimos: Pacote[];
}

export interface LinhaLog {
  tick: number;
  texto: string;
  colisao: boolean;
}

/** Retrato imutável de um tick; é tudo que a UI enxerga (ADR-0004). */
export interface Snapshot {
  tick: number;
  config: ConfigSimulacao;
  /** Regra do escalonador em uma frase. */
  regra: string;
  fila: PacoteVisivel[];
  faltamChegar: number;
  proximos: PacoteVisivel[];
  threads: ThreadVisivel[];
  portas: PortaVisivel[];
  perdidosNoTick: Pacote[];
  log: LinhaLog[];
  metricas: Metricas;
  terminou: boolean;
}

const ESTADOS: Record<number, EstadoThread> = {
  [ESTADO_TRANSMITINDO]: 'transmitindo',
  [ESTADO_ESPERANDO]: 'esperando',
  [ESTADO_COLISAO]: 'colisao',
};

const MAX_LOG = 200;
const MAX_ULTIMOS = 5;

/**
 * Engine: relógio de ticks, fila de entrada e escalonador central (ADR-0001).
 * As threads só transmitem; a engine lê o resultado no buffer depois da barreira.
 */
export class Simulacao {
  private readonly escalonador: Escalonador;
  private readonly pendentes: Pacote[];
  private proximaChegada = 0;
  private ordem = 0;
  private tick = 0;
  private colisoes = 0;
  private readonly atribuidos: (PacoteNaFila | undefined)[];
  private readonly resultados: ResultadoPacote[] = [];
  private readonly ultimosPorPorta: Pacote[][] = Array.from({ length: NUM_PORTAS }, () => []);
  private readonly log: LinhaLog[] = [];
  private perdidosNoTick: Pacote[] = [];
  private colisaoNaPorta: boolean[] = new Array<boolean>(NUM_PORTAS).fill(false);
  private escritasNaPorta: number[] = new Array<number>(NUM_PORTAS).fill(0);

  constructor(
    pacotes: Pacote[],
    private readonly config: ConfigSimulacao,
    private readonly memoria: Int32Array,
    private readonly executor: Executor,
  ) {
    this.escalonador = criarEscalonador(config.algoritmo, config.quantum);
    this.pendentes = [...pacotes].sort((a, b) => a.chegada - b.chegada || a.id - b.id);
    this.atribuidos = new Array<PacoteNaFila | undefined>(config.threads).fill(undefined);
  }

  get terminou(): boolean {
    return this.resultados.length === this.pendentes.length;
  }

  /** Executa um tick completo, na ordem de docs/decisoes.md. */
  async passo(): Promise<Snapshot> {
    if (this.terminou) return this.snapshot();
    const t = this.tick;
    this.perdidosNoTick = [];

    // 1. chegadas
    while (this.proximaChegada < this.pendentes.length) {
      const pacote = this.pendentes[this.proximaChegada];
      if (!pacote || pacote.chegada > t) break;
      this.escalonador.adicionar({ pacote, restante: pacote.tamanho, ordem: this.ordem++ });
      this.proximaChegada++;
    }

    // 2. escalonador entrega pacotes às threads ociosas, em ordem de id
    for (let i = 0; i < this.config.threads; i++) {
      if (this.atribuidos[i] || this.escalonador.tamanho === 0) continue;
      const item = this.escalonador.proximo();
      if (!item) break;
      const b = baseThread(i);
      this.memoria[b + OCUPADA] = 1;
      this.memoria[b + PORTA] = item.pacote.porta - 1;
      this.memoria[b + FATIA] = this.escalonador.fatia(item);
      this.memoria[b + SENHA] = -1;
      this.atribuidos[i] = item;
    }

    // 3. threads transmitem; barreira
    for (let p = 0; p < NUM_PORTAS; p++) this.memoria[basePorta(p) + ESCRITAS] = 0;
    await this.executor.tick();

    // 4. colisões: duas escritas ou mais na mesma porta no mesmo tick
    for (let p = 0; p < NUM_PORTAS; p++) {
      const escritas = this.memoria[basePorta(p) + ESCRITAS] ?? 0;
      this.escritasNaPorta[p] = escritas;
      this.colisaoNaPorta[p] = escritas >= 2;
      if (escritas < 2) continue;
      this.colisoes++;
      const perdidos: Pacote[] = [];
      for (let i = 0; i < this.config.threads; i++) {
        const b = baseThread(i);
        const item = this.atribuidos[i];
        if (!item || this.memoria[b + TRANSMITIU] !== 1 || this.memoria[b + PORTA] !== p) continue;
        perdidos.push(item.pacote);
        this.resultados.push({ pacote: item.pacote, perdido: true });
        this.memoria[b + OCUPADA] = 0;
        this.memoria[b + ESTADO] = ESTADO_COLISAO;
        this.atribuidos[i] = undefined;
      }
      this.perdidosNoTick.push(...perdidos);
      this.registrar(t, `colisão na porta ${p + 1}: ${perdidos.map(rotulo).join(', ')} perdidos`, true);
    }

    // 5. progresso, fim de fatia e entrega
    for (let i = 0; i < this.config.threads; i++) {
      const item = this.atribuidos[i];
      const b = baseThread(i);
      if (!item || this.memoria[b + TRANSMITIU] !== 1) continue;
      item.restante--;
      if (this.memoria[b + OCUPADA] === 1) continue;
      this.atribuidos[i] = undefined;
      if (item.restante === 0) {
        this.resultados.push({ pacote: item.pacote, entrega: t + 1, perdido: false });
        const ultimos = this.ultimosPorPorta[item.pacote.porta - 1];
        if (ultimos) {
          ultimos.unshift(item.pacote);
          ultimos.length = Math.min(ultimos.length, MAX_ULTIMOS);
        }
        this.registrar(t, `${rotulo(item.pacote)} entregue na porta ${item.pacote.porta} (thread ${i + 1})`, false);
      } else {
        // Round Robin: volta ao fim da fila
        item.ordem = this.ordem++;
        this.escalonador.adicionar(item);
      }
    }

    this.tick++;
    if (this.terminou) this.executor.encerrar();
    return this.snapshot();
  }

  snapshot(): Snapshot {
    const visivel = (item: PacoteNaFila): PacoteVisivel => ({ pacote: item.pacote, restante: item.restante });
    return {
      tick: this.tick,
      config: { ...this.config },
      regra: this.escalonador.regra,
      fila: this.escalonador.espiar(this.escalonador.tamanho).map(visivel),
      faltamChegar: this.pendentes.length - this.proximaChegada,
      proximos: this.escalonador.espiar(3).map(visivel),
      threads: this.atribuidos.map((item, i) => {
        const estado = ESTADOS[this.memoria[baseThread(i) + ESTADO] ?? 0] ?? 'ociosa';
        if (item) return { estado, item: visivel(item) };
        // Sem pacote, só a colisão do tick merece aparecer; o resto é ociosa.
        return { estado: estado === 'colisao' ? estado : 'ociosa' };
      }),
      portas: this.ultimosPorPorta.map((ultimos, p) => ({
        colisao: this.colisaoNaPorta[p] ?? false,
        escritas: this.escritasNaPorta[p] ?? 0,
        ultimos: [...ultimos],
      })),
      perdidosNoTick: [...this.perdidosNoTick],
      log: [...this.log],
      metricas: calcularMetricas(this.resultados, this.tick, this.colisoes),
      terminou: this.terminou,
    };
  }

  encerrar(): void {
    this.executor.encerrar();
  }

  private registrar(tick: number, texto: string, colisao: boolean): void {
    this.log.push({ tick, texto, colisao });
    if (this.log.length > MAX_LOG) this.log.shift();
  }
}

export function rotulo(pacote: Pacote): string {
  return `${pacote.tipo[0]}-${String(pacote.id).padStart(3, '0')}`;
}
