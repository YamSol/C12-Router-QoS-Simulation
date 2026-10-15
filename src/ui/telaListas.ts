import { gerarLista } from '../lists/gerador';
import { parseLista } from '../lists/parser';
import { TAMANHO_MAX, TAMANHO_MIN, TIPOS, type Lista, type Pacote } from '../model/tipos';
import { h } from './dom';
import type { EstadoApp } from './estado';

const COR_TIPO = { VoIP: 'var(--voip)', HTTP: 'var(--http)', UDP: 'var(--udp)' } as const;

/** Monta a tela Listas: salvas, gerar aleatória e colar. */
export function montarListas(raiz: HTMLElement, estado: EstadoApp): () => void {
  let renomeando: string | undefined;
  let textoColado = '';
  let nomeColado = '';
  let mensagem = '';

  function render(): void {
    raiz.replaceChildren(
      h(
        'main',
        { class: 'listas' },
        h('header', {}, h('h1', {}, 'Listas de pacotes'), h('a', { class: 'botao', href: '#/simulacao' }, '← Simulação')),
        mensagem ? h('p', { class: 'validacao ok', role: 'status' }, mensagem) : null,
        secaoSalvas(),
        secaoGerar(),
        secaoColar(),
      ),
    );
  }

  function avisar(texto: string): void {
    mensagem = texto;
    render();
  }

  function nomeLivre(nome: string): boolean {
    return nome.trim() !== '' && !estado.listas.carregar(nome.trim());
  }

  // ---------- salvas ----------

  function secaoSalvas(): HTMLElement {
    const listas = estado.listas.todas();
    return h(
      'section',
      { class: 'ilha' },
      h('h2', {}, 'Salvas'),
      listas.length === 0 ? h('p', {}, 'Nenhuma lista salva.') : null,
      ...listas.map((l) => linhaLista(l)),
    );
  }

  function linhaLista(l: Lista): HTMLElement {
    const emEdicao = renomeando === l.nome;
    const campoNome = h('input', { value: l.nome, 'aria-label': 'Novo nome' });
    const nome = emEdicao
      ? h('label', { class: 'campo' }, campoNome)
      : h('span', {}, l.nome, l.nome === estado.lista ? h('span', { class: 'mono' }, ' · em uso') : null);

    const acoes = emEdicao
      ? [
          h('button', {
            type: 'button',
            class: 'botao primario',
            onclick: () => {
              const novo = campoNome.value.trim();
              if (!estado.listas.renomear(l.nome, novo)) return avisar('Nome vazio ou já usado.');
              if (estado.lista === l.nome) estado.lista = novo;
              renomeando = undefined;
              avisar(`Renomeada para "${novo}".`);
            },
          }, 'Salvar'),
          h('button', { type: 'button', class: 'botao', onclick: () => { renomeando = undefined; render(); } }, 'Cancelar'),
        ]
      : [
          h('button', { type: 'button', class: 'botao primario', onclick: () => { estado.lista = l.nome; location.hash = '#/simulacao'; } }, 'Carregar'),
          h('button', { type: 'button', class: 'botao', onclick: () => { renomeando = l.nome; render(); } }, 'Renomear'),
          h('button', {
            type: 'button',
            class: 'botao',
            onclick: () => {
              estado.listas.apagar(l.nome);
              if (estado.lista === l.nome) estado.lista = estado.listas.todas()[0]?.nome ?? '';
              avisar(`"${l.nome}" apagada.`);
            },
          }, 'Apagar'),
        ];

    return h(
      'div',
      { class: 'linha-lista' },
      nome,
      h('span', { class: 'mono' }, l.pacotes.length),
      proporcao(l.pacotes),
      h('div', { class: 'acoes' }, ...acoes),
    );
  }

  // ---------- gerar ----------

  function secaoGerar(): HTMLElement {
    const campos = {
      nome: entrada('Nome', 'text', `Aleatória ${Date.now() % 10000}`),
      quantidade: entrada('Quantidade', 'number', '40', 1, 500),
      voip: entrada('% VoIP', 'number', '34', 0, 100),
      http: entrada('% HTTP', 'number', '33', 0, 100),
      udp: entrada('% UDP', 'number', '33', 0, 100),
      tamanhoMin: entrada('Tamanho mín.', 'number', '1', TAMANHO_MIN, TAMANHO_MAX),
      tamanhoMax: entrada('Tamanho máx.', 'number', '10', TAMANHO_MIN, TAMANHO_MAX),
      janela: entrada('Janela de chegada (ticks)', 'number', '40', 0, 10000),
      seed: entrada('Seed', 'number', '1', 0),
    };

    function gerar(): void {
      const num = (c: { input: HTMLInputElement }) => Math.round(Number(c.input.value));
      const nome = campos.nome.input.value.trim();
      const quantidade = num(campos.quantidade);
      const min = Math.max(TAMANHO_MIN, Math.min(num(campos.tamanhoMin), TAMANHO_MAX));
      const max = Math.max(min, Math.min(num(campos.tamanhoMax), TAMANHO_MAX));
      if (!nomeLivre(nome)) return avisar('Escolha um nome que ainda não existe.');
      if (!(quantidade > 0)) return avisar('Quantidade deve ser maior que zero.');
      const pacotes = gerarLista({
        quantidade,
        percentuais: { VoIP: num(campos.voip), HTTP: num(campos.http), UDP: num(campos.udp) },
        tamanhoMin: min,
        tamanhoMax: max,
        janela: Math.max(0, num(campos.janela)),
        seed: num(campos.seed),
      });
      estado.listas.salvar({ nome, pacotes });
      avisar(`"${nome}" gerada com ${pacotes.length} pacotes.`);
    }

    return h(
      'section',
      { class: 'ilha' },
      h('h2', {}, 'Gerar aleatória'),
      h('div', { class: 'grade-form' }, ...Object.values(campos).map((c) => c.campo)),
      h('div', {}, h('button', { type: 'button', class: 'botao primario', onclick: gerar }, 'Gerar e salvar')),
    );
  }

  // ---------- colar ----------

  function secaoColar(): HTMLElement {
    const validacao = h('div', { class: 'validacao', 'aria-live': 'polite' });
    const nome = h('input', { value: nomeColado, 'aria-label': 'Nome da lista' });
    const salvar = h('button', { type: 'button', class: 'botao primario' }, 'Salvar');
    const area = h('textarea', {
      'aria-label': 'Lista em JSON ou CSV',
      placeholder: 'id,tipo,tamanho,chegada,porta\n1,VoIP,3,0,1\n2,HTTP,5,1,2',
    });
    area.value = textoColado;

    let pacotes: Pacote[] | undefined;
    function validar(): void {
      textoColado = area.value;
      nomeColado = nome.value;
      pacotes = undefined;
      if (area.value.trim() === '') {
        validacao.className = 'validacao';
        validacao.textContent = 'Cole JSON (array de {id, tipo, tamanho, chegada, porta}) ou CSV com cabeçalho.';
      } else {
        const r = parseLista(area.value);
        if (r.ok) {
          pacotes = r.pacotes;
          validacao.className = 'validacao ok';
          validacao.textContent = `válido · ${r.pacotes.length} pacotes`;
        } else {
          validacao.className = 'validacao erro';
          validacao.textContent = r.erros.join('\n');
        }
      }
      salvar.disabled = !pacotes || !nomeLivre(nome.value);
    }

    area.addEventListener('input', validar);
    nome.addEventListener('input', validar);
    salvar.addEventListener('click', () => {
      if (!pacotes || !nomeLivre(nome.value)) return;
      const n = nome.value.trim();
      estado.listas.salvar({ nome: n, pacotes });
      textoColado = '';
      nomeColado = '';
      avisar(`"${n}" salva com ${pacotes.length} pacotes.`);
    });
    validar();

    return h(
      'section',
      { class: 'ilha' },
      h('h2', {}, 'Colar lista'),
      area,
      validacao,
      h('div', { class: 'linha-form' }, h('label', { class: 'campo' }, h('span', {}, 'Nome'), nome), salvar),
    );
  }

  render();
  return () => {};
}

function entrada(rotulo: string, tipo: string, valor: string, min?: number, max?: number) {
  const input = h('input', { type: tipo, value: valor, min, max });
  return { input, campo: h('label', { class: 'campo' }, h('span', {}, rotulo), input) };
}

function proporcao(pacotes: Pacote[]): HTMLElement {
  const total = Math.max(1, pacotes.length);
  return h(
    'div',
    { class: 'proporcao', role: 'img', 'aria-label': TIPOS.map((t) => `${t} ${pacotes.filter((p) => p.tipo === t).length}`).join(', ') },
    ...TIPOS.map((t) =>
      h('div', { style: `width:${(pacotes.filter((p) => p.tipo === t).length / total) * 100}%;background:${COR_TIPO[t]}` }),
    ),
  );
}
