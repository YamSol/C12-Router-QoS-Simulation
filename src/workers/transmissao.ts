import {
  ESCRITAS,
  ESTADO,
  ESTADO_ESPERANDO,
  ESTADO_OCIOSA,
  ESTADO_TRANSMITINDO,
  FATIA,
  LIBERAR,
  OCUPADA,
  PORTA,
  SENHA,
  SYNC,
  TRANSMITIU,
  basePorta,
  baseThread,
} from '../sync/memoria';
import { liberar, pegarSenha, temAVez } from '../sync/mutex';

/*
 * O que uma thread faz em cada tick. Roda dentro do worker; fica separado do
 * loop do worker para poder ser testado sem threads.
 *
 * O tick tem duas fases, cada uma fechada por uma barreira:
 *   1. liberar: quem terminou a fatia no tick anterior solta o lock da porta
 *   2. transmitir: cada thread ocupada tenta a porta e transmite 1 unidade
 * Sem a fase 1, uma thread que solta o lock no último tick da fatia deixaria
 * outra escrever na mesma porta no mesmo tick.
 */

export function faseLiberar(memoria: Int32Array, thread: number): void {
  const b = baseThread(thread);
  const porta = Atomics.load(memoria, b + LIBERAR) - 1;
  if (porta < 0) return;
  liberar(memoria, porta);
  Atomics.store(memoria, b + LIBERAR, 0);
}

export function faseTransmitir(memoria: Int32Array, thread: number): void {
  const b = baseThread(thread);
  Atomics.store(memoria, b + TRANSMITIU, 0);

  if (Atomics.load(memoria, b + OCUPADA) === 0) {
    Atomics.store(memoria, b + ESTADO, ESTADO_OCIOSA);
    return;
  }

  const porta = Atomics.load(memoria, b + PORTA);
  const sync = Atomics.load(memoria, SYNC) === 1;

  if (sync) {
    let senha = Atomics.load(memoria, b + SENHA);
    if (senha < 0) {
      senha = pegarSenha(memoria, porta);
      Atomics.store(memoria, b + SENHA, senha);
    }
    if (!temAVez(memoria, porta, senha)) {
      Atomics.store(memoria, b + ESTADO, ESTADO_ESPERANDO);
      return;
    }
  }

  // Escreve na porta. Sem sync, nada impede outra thread de escrever junto;
  // a engine detecta a colisão contando as escritas do tick.
  Atomics.add(memoria, basePorta(porta) + ESCRITAS, 1);
  Atomics.store(memoria, b + TRANSMITIU, 1);
  Atomics.store(memoria, b + ESTADO, ESTADO_TRANSMITINDO);

  const restante = Atomics.sub(memoria, b + FATIA, 1) - 1;
  if (restante === 0) {
    if (sync) {
      Atomics.store(memoria, b + LIBERAR, porta + 1);
      Atomics.store(memoria, b + SENHA, -1);
    }
    Atomics.store(memoria, b + OCUPADA, 0);
  }
}
