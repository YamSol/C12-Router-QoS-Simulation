import { TIPOS, type Metricas, type ResultadoPacote, type Tipo } from '../model/tipos';

/*
 * Definições (docs/decisoes.md):
 *   turnaround = tick de entrega − chegada
 *   espera     = turnaround − tamanho
 *   vazão      = entregues ÷ ticks
 * Pacotes perdidos ficam fora das médias de espera e turnaround.
 */
export function calcularMetricas(
  resultados: ResultadoPacote[],
  ticks: number,
  colisoes: number,
): Metricas {
  const entregues = resultados.filter((r) => !r.perdido && r.entrega !== undefined);
  const perdidos = resultados.length - entregues.length;

  const turnaround = (r: ResultadoPacote) => (r.entrega ?? 0) - r.pacote.chegada;
  const espera = (r: ResultadoPacote) => turnaround(r) - r.pacote.tamanho;

  const esperaPorTipo = {} as Record<Tipo, number>;
  for (const tipo of TIPOS) {
    esperaPorTipo[tipo] = media(entregues.filter((r) => r.pacote.tipo === tipo).map(espera));
  }

  return {
    entregues: entregues.length,
    perdidos,
    esperaMedia: media(entregues.map(espera)),
    esperaPorTipo,
    turnaroundMedio: media(entregues.map(turnaround)),
    vazao: ticks > 0 ? entregues.length / ticks : 0,
    colisoes,
    taxaPerda: resultados.length > 0 ? perdidos / resultados.length : 0,
    ticks,
  };
}

function media(valores: number[]): number {
  return valores.length === 0 ? 0 : valores.reduce((s, v) => s + v, 0) / valores.length;
}
