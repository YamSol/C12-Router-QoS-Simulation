import { MS_POR_TICK, type ConfigSimulacao, type Pacote } from '../model/tipos';
import { criarMemoria } from '../sync/memoria';
import { ExecutorWorkers } from './executor';
import { Simulacao, type Snapshot } from './simulacao';

type Ouvinte = (snapshot: Snapshot, rodando: boolean) => void;

/**
 * Liga a simulação ao tempo real: play, pausa, reiniciar e velocidade.
 * Config e lista só mudam ao reiniciar; velocidade e pausa mudam ao vivo.
 */
export class Controlador {
  private simulacao: Simulacao | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private rodando = false;
  private ocupado = false;
  velocidade = 1;

  constructor(private readonly ouvinte: Ouvinte) {}

  reiniciar(pacotes: Pacote[], config: ConfigSimulacao): void {
    this.pausar();
    this.simulacao?.encerrar();
    const memoria = criarMemoria(config.sync);
    this.simulacao = new Simulacao(pacotes, config, memoria, new ExecutorWorkers(memoria, config.threads));
    this.ouvinte(this.simulacao.snapshot(), false);
  }

  tocar(): void {
    if (!this.simulacao || this.simulacao.terminou) return;
    this.rodando = true;
    this.agendar();
  }

  pausar(): void {
    this.rodando = false;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.simulacao) this.ouvinte(this.simulacao.snapshot(), false);
  }

  /** Avança um tick com a simulação pausada. */
  async avancar(): Promise<void> {
    if (this.rodando) return;
    await this.executarPasso();
  }

  /** Para tudo e encerra os workers. */
  destruir(): void {
    this.rodando = false;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.simulacao?.encerrar();
    this.simulacao = undefined;
  }

  get estaRodando(): boolean {
    return this.rodando;
  }

  private agendar(): void {
    this.timer = setTimeout(async () => {
      await this.executarPasso();
      if (this.rodando && this.simulacao && !this.simulacao.terminou) this.agendar();
      else if (this.rodando) this.pausar();
    }, MS_POR_TICK / this.velocidade);
  }

  private async executarPasso(): Promise<void> {
    if (!this.simulacao || this.ocupado) return;
    this.ocupado = true;
    try {
      const snapshot = await this.simulacao.passo();
      this.ouvinte(snapshot, this.rodando && !snapshot.terminou);
    } finally {
      this.ocupado = false;
    }
  }
}
