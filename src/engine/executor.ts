import { FEITOS, TICK } from '../sync/memoria';
import { faseLiberar, faseTransmitir } from '../workers/transmissao';

/** Faz as threads executarem um tick e resolve quando todas terminaram (barreira). */
export interface Executor {
  tick(): Promise<void>;
  encerrar(): void;
}

/** Threads reais: um Web Worker por thread, sincronizados pelo tick no buffer. */
export class ExecutorWorkers implements Executor {
  private readonly workers: Worker[] = [];

  constructor(
    private readonly memoria: Int32Array,
    private readonly threads: number,
  ) {
    for (let t = 0; t < threads; t++) {
      const worker = new Worker(new URL('../workers/transmissor.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.postMessage({ memoria: memoria.buffer, thread: t });
      this.workers.push(worker);
    }
  }

  private encerrado = false;

  /** Duas fases (liberar, transmitir), cada uma com barreira. */
  async tick(): Promise<void> {
    for (let fase = 0; fase < 2 && !this.encerrado; fase++) {
      Atomics.store(this.memoria, FEITOS, 0);
      Atomics.add(this.memoria, TICK, 1);
      Atomics.notify(this.memoria, TICK);
      await esperarBarreira(this.memoria, this.threads, () => this.encerrado);
    }
  }

  encerrar(): void {
    this.encerrado = true;
    for (const w of this.workers) w.terminate();
  }
}

/**
 * Executa as threads uma após a outra, na thread atual. Mesma lógica de tick,
 * sem Web Workers; usado nos testes.
 */
export class ExecutorSequencial implements Executor {
  constructor(
    private readonly memoria: Int32Array,
    private readonly threads: number,
  ) {}

  async tick(): Promise<void> {
    for (let t = 0; t < this.threads; t++) faseLiberar(this.memoria, t);
    for (let t = 0; t < this.threads; t++) faseTransmitir(this.memoria, t);
  }

  encerrar(): void {}
}

/**
 * A thread principal do navegador não pode usar Atomics.wait; usa waitAsync
 * quando existe e, senão, confere de novo no próximo ciclo do event loop.
 */
async function esperarBarreira(
  memoria: Int32Array,
  threads: number,
  cancelado: () => boolean,
): Promise<void> {
  for (;;) {
    const feitos = Atomics.load(memoria, FEITOS);
    if (feitos >= threads || cancelado()) return;
    if (typeof Atomics.waitAsync === 'function') {
      const r = Atomics.waitAsync(memoria, FEITOS, feitos, 1000);
      if (r.async) await r.value;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}
