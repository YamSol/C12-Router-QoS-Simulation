import type { Execucao, Lista } from '../model/tipos';
import { presets } from './presets';

const CHAVE_LISTAS = 'roteador-qos:listas';
const CHAVE_EXECUCOES = 'roteador-qos:execucoes';

/** Subconjunto de Storage usado aqui; permite trocar por um fake nos testes. */
export type Armazenamento = Pick<Storage, 'getItem' | 'setItem'>;

export class RepositorioListas {
  constructor(private readonly armazenamento: Armazenamento) {}

  /** Na primeira vez, semeia com os presets. */
  todas(): Lista[] {
    const bruto = this.armazenamento.getItem(CHAVE_LISTAS);
    if (bruto === null) {
      const iniciais = presets();
      this.gravar(iniciais);
      return iniciais;
    }
    return lerJson<Lista[]>(bruto, []);
  }

  carregar(nome: string): Lista | undefined {
    return this.todas().find((l) => l.nome === nome);
  }

  /** Salva ou sobrescreve pelo nome. */
  salvar(lista: Lista): void {
    const outras = this.todas().filter((l) => l.nome !== lista.nome);
    this.gravar([...outras, lista]);
  }

  renomear(antigo: string, novo: string): boolean {
    const listas = this.todas();
    if (novo.trim() === '' || listas.some((l) => l.nome === novo)) return false;
    const alvo = listas.find((l) => l.nome === antigo);
    if (!alvo) return false;
    alvo.nome = novo;
    this.gravar(listas);
    return true;
  }

  apagar(nome: string): void {
    this.gravar(this.todas().filter((l) => l.nome !== nome));
  }

  private gravar(listas: Lista[]): void {
    this.armazenamento.setItem(CHAVE_LISTAS, JSON.stringify(listas));
  }
}

export class RepositorioExecucoes {
  constructor(private readonly armazenamento: Armazenamento) {}

  todas(): Execucao[] {
    return lerJson<Execucao[]>(this.armazenamento.getItem(CHAVE_EXECUCOES), []);
  }

  salvar(execucao: Execucao): void {
    this.armazenamento.setItem(CHAVE_EXECUCOES, JSON.stringify([...this.todas(), execucao]));
  }

  apagar(id: string): void {
    const restantes = this.todas().filter((e) => e.id !== id);
    this.armazenamento.setItem(CHAVE_EXECUCOES, JSON.stringify(restantes));
  }
}

function lerJson<T>(bruto: string | null, padrao: T): T {
  if (bruto === null) return padrao;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return padrao;
  }
}

/** Armazenamento em memória, para testes. */
export function armazenamentoEmMemoria(): Armazenamento {
  const dados = new Map<string, string>();
  return {
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
  };
}
