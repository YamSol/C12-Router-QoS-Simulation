// Tipos compartilhados. Vocabulário segue CONTEXT.md.

export const TIPOS = ['VoIP', 'HTTP', 'UDP'] as const;
export type Tipo = (typeof TIPOS)[number];

export const NUM_PORTAS = 3;
export const MAX_THREADS = 8;
export const TAMANHO_MIN = 1;
export const TAMANHO_MAX = 20;
export const QUANTUM_MIN = 1;
export const QUANTUM_MAX = 10;
export const MS_POR_TICK = 100;

export interface Pacote {
  id: number;
  tipo: Tipo;
  tamanho: number;
  chegada: number;
  /** Porta de destino, de 1 a 3. */
  porta: number;
}

export interface Lista {
  nome: string;
  pacotes: Pacote[];
}

export const ALGORITMOS = ['SJF', 'RR', 'Prioridade'] as const;
export type Algoritmo = (typeof ALGORITMOS)[number];

export interface ConfigSimulacao {
  algoritmo: Algoritmo;
  quantum: number;
  threads: number;
  sync: boolean;
}

export type EstadoThread = 'ociosa' | 'transmitindo' | 'esperando' | 'colisao';

export interface ResultadoPacote {
  pacote: Pacote;
  /** Tick de entrega; ausente se o pacote foi perdido. */
  entrega?: number;
  perdido: boolean;
}

export interface Metricas {
  entregues: number;
  perdidos: number;
  esperaMedia: number;
  esperaPorTipo: Record<Tipo, number>;
  turnaroundMedio: number;
  vazao: number;
  colisoes: number;
  taxaPerda: number;
  ticks: number;
}

export interface Execucao {
  id: string;
  data: string;
  lista: string;
  config: ConfigSimulacao;
  metricas: Metricas;
}
