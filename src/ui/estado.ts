import type { ConfigSimulacao } from '../model/tipos';
import { RepositorioExecucoes, RepositorioListas } from '../lists/armazenamento';

/** Estado da interface que sobrevive à troca de tela. */
export interface EstadoApp {
  lista: string;
  config: ConfigSimulacao;
  velocidade: number;
  listas: RepositorioListas;
  execucoes: RepositorioExecucoes;
}

export function criarEstado(armazenamento: Storage): EstadoApp {
  const listas = new RepositorioListas(armazenamento);
  return {
    lista: listas.todas()[0]?.nome ?? '',
    config: { algoritmo: 'SJF', quantum: 3, threads: 3, sync: true },
    velocidade: 1,
    listas,
    execucoes: new RepositorioExecucoes(armazenamento),
  };
}
