import { describe, expect, it } from 'vitest';
import type { ConfigSimulacao, Pacote } from '../model/tipos';
import { criarMemoria } from '../sync/memoria';
import { ExecutorSequencial } from './executor';
import { Simulacao, type Snapshot } from './simulacao';

async function rodar(pacotes: Pacote[], parcial: Partial<ConfigSimulacao> = {}) {
  const config: ConfigSimulacao = { algoritmo: 'SJF', quantum: 3, threads: 1, sync: true, ...parcial };
  const memoria = criarMemoria(config.sync);
  const sim = new Simulacao(pacotes, config, memoria, new ExecutorSequencial(memoria, config.threads));
  const snapshots: Snapshot[] = [];
  for (let i = 0; i < 1000 && !sim.terminou; i++) snapshots.push(await sim.passo());
  return { final: sim.snapshot(), snapshots };
}

const p = (id: number, tipo: Pacote['tipo'], tamanho: number, chegada: number, porta: number): Pacote => ({
  id,
  tipo,
  tamanho,
  chegada,
  porta,
});

describe('simulação', () => {
  it('um pacote sozinho: entrega no tick tamanho, espera zero', async () => {
    const { final } = await rodar([p(1, 'VoIP', 4, 0, 1)]);
    expect(final.terminou).toBe(true);
    expect(final.tick).toBe(4);
    expect(final.metricas.esperaMedia).toBe(0);
    expect(final.metricas.turnaroundMedio).toBe(4);
  });

  it('SJF com uma thread: espera bate com a conta à mão', async () => {
    // Chegam juntos; ordem SJF: 2 (tam 1), 3 (tam 2), 1 (tam 3).
    // Esperas: 0, 1, 3 → média 4/3.
    const { final } = await rodar([p(1, 'UDP', 3, 0, 1), p(2, 'UDP', 1, 0, 2), p(3, 'UDP', 2, 0, 3)]);
    expect(final.metricas.esperaMedia).toBeCloseTo(4 / 3);
    expect(final.metricas.entregues).toBe(3);
  });

  it('RR alterna fatias entre pacotes', async () => {
    const { final } = await rodar([p(1, 'UDP', 4, 0, 1), p(2, 'UDP', 2, 0, 2)], { algoritmo: 'RR', quantum: 2 });
    // 1 transmite 0-1, 2 transmite 2-3 (entrega 4), 1 transmite 4-5 (entrega 6).
    const entregas = final.log.filter((l) => l.texto.includes('entregue')).map((l) => l.tick);
    expect(entregas).toEqual([3, 5]);
  });

  it('com sync, threads na mesma porta esperam e não colidem', async () => {
    const pacotes = [p(1, 'UDP', 3, 0, 1), p(2, 'UDP', 3, 0, 1), p(3, 'UDP', 3, 0, 1)];
    const { final, snapshots } = await rodar(pacotes, { threads: 3, sync: true });
    expect(final.metricas.colisoes).toBe(0);
    expect(final.metricas.entregues).toBe(3);
    expect(final.tick).toBe(9);
    expect(snapshots[0]?.threads.filter((t) => t.estado === 'esperando')).toHaveLength(2);
  });

  it('sem sync, threads na mesma porta colidem e perdem os pacotes', async () => {
    const pacotes = [p(1, 'UDP', 3, 0, 1), p(2, 'UDP', 3, 0, 1), p(3, 'UDP', 3, 0, 2)];
    const { final, snapshots } = await rodar(pacotes, { threads: 3, sync: false });
    expect(final.metricas.colisoes).toBe(1);
    expect(final.metricas.perdidos).toBe(2);
    expect(final.metricas.entregues).toBe(1);
    expect(snapshots[0]?.portas[0]?.colisao).toBe(true);
    expect(snapshots[0]?.perdidosNoTick.map((x) => x.id).sort()).toEqual([1, 2]);
  });

  it('mais threads em portas diferentes aumentam a vazão', async () => {
    const pacotes = [p(1, 'UDP', 4, 0, 1), p(2, 'UDP', 4, 0, 2), p(3, 'UDP', 4, 0, 3)];
    const uma = await rodar(pacotes, { threads: 1 });
    const tres = await rodar(pacotes, { threads: 3 });
    expect(tres.final.metricas.vazao).toBeGreaterThan(uma.final.metricas.vazao);
  });

  it('Prioridade favorece VoIP', async () => {
    const pacotes = [p(1, 'UDP', 3, 0, 1), p(2, 'HTTP', 3, 0, 1), p(3, 'VoIP', 3, 0, 1)];
    const { final } = await rodar(pacotes, { algoritmo: 'Prioridade' });
    expect(final.metricas.esperaPorTipo.VoIP).toBe(0);
    expect(final.metricas.esperaPorTipo.UDP).toBe(6);
  });
});
