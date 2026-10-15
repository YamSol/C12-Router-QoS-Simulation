import { describe, expect, it } from 'vitest';
import { RepositorioListas, armazenamentoEmMemoria } from './armazenamento';
import { gerarLista } from './gerador';
import { parseLista } from './parser';
import { presets } from './presets';

describe('parser', () => {
  it('aceita JSON válido, tipo sem diferenciar maiúsculas', () => {
    const r = parseLista('[{"id":1,"tipo":"voip","tamanho":3,"chegada":0,"porta":2}]');
    expect(r).toEqual({ ok: true, pacotes: [{ id: 1, tipo: 'VoIP', tamanho: 3, chegada: 0, porta: 2 }] });
  });

  it('aceita CSV com cabeçalho', () => {
    const r = parseLista('id,tipo,tamanho,chegada,porta\n1,HTTP,4,2,3\n2,UDP,1,0,1');
    expect(r.ok && r.pacotes.length).toBe(2);
  });

  it('rejeita a lista inteira e aponta cada linha inválida', () => {
    const r = parseLista('id,tipo,tamanho,chegada,porta\n1,HTTP,4,2,3\n1,FTP,21,-1,4');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erros).toHaveLength(1);
      expect(r.erros[0]).toMatch(/^linha 3: /);
      expect(r.erros[0]).toContain('repetido');
      expect(r.erros[0]).toContain('tipo');
      expect(r.erros[0]).toContain('tamanho');
      expect(r.erros[0]).toContain('chegada');
      expect(r.erros[0]).toContain('porta');
    }
  });

  it('rejeita cabeçalho errado e JSON quebrado', () => {
    expect(parseLista('a,b\n1,2').ok).toBe(false);
    expect(parseLista('[{').ok).toBe(false);
    expect(parseLista('').ok).toBe(false);
  });
});

describe('gerador', () => {
  const params = {
    quantidade: 30,
    percentuais: { VoIP: 50, HTTP: 30, UDP: 20 },
    tamanhoMin: 2,
    tamanhoMax: 5,
    janela: 10,
    seed: 42,
  };

  it('mesmo seed gera a mesma lista', () => {
    expect(gerarLista(params)).toEqual(gerarLista(params));
    expect(gerarLista(params)).not.toEqual(gerarLista({ ...params, seed: 43 }));
  });

  it('respeita faixas e gera listas válidas para o parser', () => {
    const lista = gerarLista(params);
    expect(lista).toHaveLength(30);
    for (const p of lista) {
      expect(p.tamanho).toBeGreaterThanOrEqual(2);
      expect(p.tamanho).toBeLessThanOrEqual(5);
      expect(p.chegada).toBeLessThanOrEqual(10);
    }
    expect(parseLista(JSON.stringify(lista)).ok).toBe(true);
  });

  it('presets são válidos', () => {
    const todos = presets();
    expect(todos).toHaveLength(4);
    for (const l of todos) expect(parseLista(JSON.stringify(l.pacotes)).ok).toBe(true);
  });
});

describe('repositório de listas', () => {
  it('semeia com presets e faz CRUD', () => {
    const repo = new RepositorioListas(armazenamentoEmMemoria());
    expect(repo.todas()).toHaveLength(4);

    repo.salvar({ nome: 'minha', pacotes: [] });
    expect(repo.carregar('minha')).toBeDefined();

    expect(repo.renomear('minha', 'Mista')).toBe(false);
    expect(repo.renomear('minha', 'outra')).toBe(true);
    expect(repo.carregar('outra')).toBeDefined();

    repo.apagar('outra');
    expect(repo.carregar('outra')).toBeUndefined();
    expect(repo.todas()).toHaveLength(4);
  });
});
