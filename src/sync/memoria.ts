import { MAX_THREADS, NUM_PORTAS } from '../model/tipos';

/*
 * Layout do SharedArrayBuffer (Int32Array) compartilhado entre engine e threads.
 *
 *   controle  [0..3]   TICK, FEITOS, -, SYNC
 *   portas    4 ints por porta:  PROXIMA_SENHA, ATENDENDO, ESCRITAS, -
 *   threads   8 ints por thread: OCUPADA, PORTA, FATIA, SENHA, ESTADO, TRANSMITIU, LIBERAR, -
 */

export const TICK = 0;
export const FEITOS = 1;
export const SYNC = 3;

const BASE_PORTAS = 4;
const INTS_POR_PORTA = 4;
export const PROXIMA_SENHA = 0;
export const ATENDENDO = 1;
export const ESCRITAS = 2;

const BASE_THREADS = BASE_PORTAS + NUM_PORTAS * INTS_POR_PORTA;
const INTS_POR_THREAD = 8;
export const OCUPADA = 0;
/** Porta de destino, de 0 a 2. */
export const PORTA = 1;
/** Ticks que faltam na fatia atual. */
export const FATIA = 2;
/** Senha do ticket lock; -1 quando a thread não pegou senha. */
export const SENHA = 3;
export const ESTADO = 4;
/** 1 se a thread escreveu na porta neste tick. */
export const TRANSMITIU = 5;
/** Porta + 1 cujo lock a thread deve liberar no início do próximo tick; 0 se nenhuma. */
export const LIBERAR = 6;

export const ESTADO_OCIOSA = 0;
export const ESTADO_TRANSMITINDO = 1;
export const ESTADO_ESPERANDO = 2;
export const ESTADO_COLISAO = 3;

const TOTAL_INTS = BASE_THREADS + MAX_THREADS * INTS_POR_THREAD;

export function criarMemoria(sync: boolean): Int32Array {
  const memoria = new Int32Array(new SharedArrayBuffer(TOTAL_INTS * Int32Array.BYTES_PER_ELEMENT));
  memoria[SYNC] = sync ? 1 : 0;
  for (let t = 0; t < MAX_THREADS; t++) memoria[baseThread(t) + SENHA] = -1;
  return memoria;
}

export function basePorta(porta: number): number {
  return BASE_PORTAS + porta * INTS_POR_PORTA;
}

export function baseThread(thread: number): number {
  return BASE_THREADS + thread * INTS_POR_THREAD;
}
