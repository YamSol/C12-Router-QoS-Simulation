import { describe, expect, it } from 'vitest';
import type { Pacote, Tipo } from '../model/tipos';
import { Prioridade, RoundRobin, Sjf, type Escalonador, type PacoteNaFila } from './escalonador';

let ordem = 0;
function item(id: number, tipo: Tipo, tamanho: number, chegada = 0): PacoteNaFila {
  const pacote: Pacote = { id, tipo, tamanho, chegada, porta: 1 };
  return { pacote, restante: tamanho, ordem: ordem++ };
}

function esvaziar(e: Escalonador): number[] {
  const ids: number[] = [];
  for (let i = e.proximo(); i; i = e.proximo()) ids.push(i.pacote.id);
  return ids;
}

describe('SJF', () => {
  it('escolhe o menor tamanho, desempatando por chegada e id', () => {
    const e = new Sjf();
    e.adicionar(item(1, 'UDP', 5));
    e.adicionar(item(2, 'VoIP', 2, 3));
    e.adicionar(item(3, 'HTTP', 2, 1));
    e.adicionar(item(4, 'HTTP', 9));
    expect(esvaziar(e)).toEqual([3, 2, 1, 4]);
  });

  it('transmite o pacote inteiro numa fatia (não preemptivo)', () => {
    expect(new Sjf().fatia(item(1, 'UDP', 7))).toBe(7);
  });
});

describe('Round Robin', () => {
  it('segue a ordem de entrada na fila', () => {
    const e = new RoundRobin(3);
    e.adicionar(item(1, 'UDP', 9));
    e.adicionar(item(2, 'VoIP', 1));
    e.adicionar(item(3, 'HTTP', 4));
    expect(esvaziar(e)).toEqual([1, 2, 3]);
  });

  it('limita a fatia ao quantum', () => {
    const e = new RoundRobin(3);
    expect(e.fatia(item(1, 'UDP', 9))).toBe(3);
    expect(e.fatia(item(2, 'UDP', 2))).toBe(2);
  });

  it('pacote que volta vai para o fim da fila', () => {
    const e = new RoundRobin(2);
    const a = item(1, 'UDP', 5);
    e.adicionar(a);
    e.adicionar(item(2, 'HTTP', 2));
    const primeiro = e.proximo();
    expect(primeiro?.pacote.id).toBe(1);
    a.ordem = ordem++;
    e.adicionar(a);
    expect(esvaziar(e)).toEqual([2, 1]);
  });
});

describe('Prioridade', () => {
  it('VoIP > HTTP > UDP, empate por chegada', () => {
    const e = new Prioridade();
    e.adicionar(item(1, 'UDP', 1, 0));
    e.adicionar(item(2, 'HTTP', 1, 2));
    e.adicionar(item(3, 'VoIP', 9, 5));
    e.adicionar(item(4, 'HTTP', 1, 1));
    e.adicionar(item(5, 'VoIP', 1, 4));
    expect(esvaziar(e)).toEqual([5, 3, 4, 2, 1]);
  });

  it('espiar não remove', () => {
    const e = new Prioridade();
    e.adicionar(item(1, 'UDP', 1));
    e.adicionar(item(2, 'VoIP', 1));
    expect(e.espiar(3).map((i) => i.pacote.id)).toEqual([2, 1]);
    expect(e.tamanho).toBe(2);
  });
});
