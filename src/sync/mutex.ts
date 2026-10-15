import { ATENDENDO, PROXIMA_SENHA, basePorta } from './memoria';

/*
 * Ticket lock feito à mão com Atomics, um por porta.
 *
 * Quem quer a porta pega uma senha (incremento atômico de PROXIMA_SENHA) e só
 * entra quando ATENDENDO chega na sua senha. Liberar é avançar ATENDENDO. A
 * ordem é FIFO por ordem de pedido; pedidos no mesmo tick disputam a senha na
 * corrida real entre as threads (ver ADR-0002).
 *
 * A espera não bloqueia a thread: como as threads andam presas ao tick, quem
 * não tem a vez passa o tick no estado "esperando" e confere de novo no próximo.
 */

export function pegarSenha(memoria: Int32Array, porta: number): number {
  return Atomics.add(memoria, basePorta(porta) + PROXIMA_SENHA, 1);
}

export function temAVez(memoria: Int32Array, porta: number, senha: number): boolean {
  return Atomics.load(memoria, basePorta(porta) + ATENDENDO) === senha;
}

export function liberar(memoria: Int32Array, porta: number): void {
  Atomics.add(memoria, basePorta(porta) + ATENDENDO, 1);
}
