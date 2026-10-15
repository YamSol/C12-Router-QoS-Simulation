import type { Lista, Pacote } from '../model/tipos';
import { gerarLista, ordenarPorChegada } from './gerador';

export function presets(): Lista[] {
  return [
    {
      nome: 'Mista',
      pacotes: gerarLista({
        quantidade: 40,
        percentuais: { VoIP: 34, HTTP: 33, UDP: 33 },
        tamanhoMin: 1,
        tamanhoMax: 10,
        janela: 40,
        seed: 1,
      }),
    },
    {
      nome: 'VoIP pesado',
      pacotes: gerarLista({
        quantidade: 40,
        percentuais: { VoIP: 60, HTTP: 20, UDP: 20 },
        tamanhoMin: 2,
        tamanhoMax: 8,
        janela: 25,
        seed: 2,
      }),
    },
    { nome: 'Pacote gigante', pacotes: pacoteGigante() },
    { nome: 'Contenção de porta', pacotes: contencaoDePorta() },
  ];
}

/** Um pacote de tamanho 20 no meio de vários pequenos: mostra starvation no SJF. */
function pacoteGigante(): Pacote[] {
  const pequenos = gerarLista({
    quantidade: 24,
    percentuais: { VoIP: 34, HTTP: 33, UDP: 33 },
    tamanhoMin: 1,
    tamanhoMax: 4,
    janela: 20,
    seed: 3,
  });
  const gigante: Pacote = { id: 25, tipo: 'UDP', tamanho: 20, chegada: 2, porta: 2 };
  return ordenarPorChegada([...pequenos, gigante]);
}

/** Quase tudo na porta 1: mostra colisões sem sync e o gargalo. */
function contencaoDePorta(): Pacote[] {
  const base = gerarLista({
    quantidade: 30,
    percentuais: { VoIP: 34, HTTP: 33, UDP: 33 },
    tamanhoMin: 2,
    tamanhoMax: 6,
    janela: 15,
    seed: 4,
  });
  return base.map((p, i) => ({ ...p, porta: i % 6 === 5 ? 2 : 1 }));
}
