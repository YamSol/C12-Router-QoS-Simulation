import { FEITOS, TICK } from '../sync/memoria';
import { faseLiberar, faseTransmitir } from './transmissao';

interface Setup {
  memoria: SharedArrayBuffer;
  thread: number;
}

// Cada worker é uma thread. Ele dorme até a engine avançar a fase, executa a
// fase e avisa a barreira. Fases ímpares liberam, pares transmitem.
self.onmessage = (evento: MessageEvent<Setup>) => {
  const memoria = new Int32Array(evento.data.memoria);
  const thread = evento.data.thread;
  // A geração começa em 0; se a engine já avançou, o wait retorna na hora.
  let geracao = 0;
  for (;;) {
    Atomics.wait(memoria, TICK, geracao);
    geracao++;
    if (geracao % 2 === 1) faseLiberar(memoria, thread);
    else faseTransmitir(memoria, thread);
    Atomics.add(memoria, FEITOS, 1);
    Atomics.notify(memoria, FEITOS);
  }
};
