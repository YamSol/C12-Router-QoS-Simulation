import { Controlador } from '../engine/controlador';
import type { Snapshot } from '../engine/simulacao';
import {
  ALGORITMOS,
  MAX_THREADS,
  QUANTUM_MAX,
  QUANTUM_MIN,
  TIPOS,
  type ConfigSimulacao,
  type Execucao,
} from '../model/tipos';
import { formatar, h, segmentado } from './dom';
import type { EstadoApp } from './estado';
import { criarMundo, desenharMundo } from './mundo';

const VELOCIDADES = ['0.5', '1', '2', '4'] as const;
const COR_TIPO = { VoIP: 'var(--voip)', HTTP: 'var(--http)', UDP: 'var(--udp)' } as const;

/** Monta a tela Simulação. Devolve a função de limpeza (encerra os workers). */
export function montarSimulacao(raiz: HTMLElement, estado: EstadoApp): () => void {
  let snapshot: Snapshot | undefined;
  let anterior: Snapshot | undefined;
  let rodando = false;
  let painelConfig = false;
  let painelLog = false;
  let painelComparar = false;
  let execucaoSalva = false;

  const mundo = criarMundo();
  const tick = h('span', { class: 'tick', 'aria-live': 'off' }, 'tick 0');
  const hud = h('div', { class: 'hud ilha', 'aria-label': 'Métricas' });
  const log = h('div', { class: 'painel-log ilha', 'aria-label': 'Log' });
  const botaoTocar = h('button', { type: 'button', class: 'botao primario', onclick: () => alternarTocar() });
  const botaoPasso = h('button', { type: 'button', class: 'botao', onclick: () => void controlador.avancar(), title: 'Avançar um tick' }, '⏭ passo');
  const botaoSalvar = h('button', { type: 'button', class: 'botao', onclick: () => salvarExecucao() }, 'Salvar execução');
  const fim = h('span', { class: 'estado-fim' });

  const controlador = new Controlador((s, r) => {
    anterior = snapshot;
    snapshot = s;
    rodando = r;
    atualizar();
  });
  controlador.velocidade = estado.velocidade;

  function reiniciar(): void {
    const lista = estado.listas.carregar(estado.lista);
    execucaoSalva = false;
    snapshot = undefined;
    anterior = undefined;
    controlador.reiniciar(lista?.pacotes ?? [], { ...estado.config });
  }

  function mudarConfig(parcial: Partial<ConfigSimulacao>): void {
    // Config só muda ao reiniciar (docs/decisoes.md): mudar já reinicia.
    estado.config = { ...estado.config, ...parcial };
    render();
    reiniciar();
  }

  function alternarTocar(): void {
    if (controlador.estaRodando) controlador.pausar();
    else controlador.tocar();
  }

  function salvarExecucao(): void {
    if (!snapshot?.terminou || execucaoSalva) return;
    const execucao: Execucao = {
      id: String(Date.now()),
      data: new Date().toLocaleString('pt-BR'),
      lista: estado.lista,
      config: { ...snapshot.config },
      metricas: snapshot.metricas,
    };
    estado.execucoes.salvar(execucao);
    execucaoSalva = true;
    atualizar();
  }

  // ---------- partes que mudam a cada tick ----------

  function atualizar(): void {
    if (!snapshot) return;
    desenharMundo(mundo, snapshot, anterior);
    tick.textContent = `tick ${snapshot.tick}`;
    desenharHud(hud, snapshot);
    if (painelLog) desenharLog(log, snapshot);

    botaoTocar.textContent = rodando ? '⏸ pausar' : '▶ tocar';
    botaoTocar.disabled = snapshot.terminou;
    botaoPasso.disabled = rodando || snapshot.terminou;
    botaoSalvar.disabled = !snapshot.terminou || execucaoSalva;
    botaoSalvar.textContent = execucaoSalva ? 'Execução salva' : 'Salvar execução';
    fim.textContent = snapshot.terminou ? 'fim da execução' : '';
  }

  // ---------- partes que mudam por ação do usuário ----------

  function render(): void {
    const c = estado.config;
    const palco = h('div', { class: 'palco' }, mundo, hud);
    if (painelConfig) palco.append(painelDeConfig(c));
    if (painelLog) palco.append(log);
    if (painelComparar) palco.append(painelDeComparacao());

    raiz.replaceChildren(
      h(
        'div',
        { class: 'simulacao' },
        h(
          'header',
          { class: 'cabecalho' },
          h('h1', {}, 'Simulador de Roteador com QoS'),
          tick,
          h('button', { type: 'button', class: 'botao', 'aria-expanded': String(painelConfig), onclick: () => { painelConfig = !painelConfig; render(); } }, '⚙ Configuração'),
          h('button', { type: 'button', class: 'botao', 'aria-expanded': String(painelLog), onclick: () => { painelLog = !painelLog; render(); } }, 'Log'),
          h('a', { class: 'botao', href: '#/listas' }, 'Listas'),
        ),
        palco,
        h(
          'footer',
          { class: 'player ilha' },
          botaoTocar,
          botaoPasso,
          h('button', { type: 'button', class: 'botao', onclick: () => reiniciar() }, '↺ reiniciar'),
          segmentado(
            VELOCIDADES,
            String(estado.velocidade) as (typeof VELOCIDADES)[number],
            (v) => `${v.replace('.', ',')}×`,
            (v) => {
              estado.velocidade = Number(v);
              controlador.velocidade = estado.velocidade;
              render();
            },
            'Velocidade',
          ),
          h(
            'button',
            {
              type: 'button',
              class: `botao ${c.sync ? 'sync-on' : 'sync-off'}`,
              'aria-pressed': String(c.sync),
              onclick: () => mudarConfig({ sync: !c.sync }),
            },
            c.sync ? 'sync ligado' : 'sync desligado',
          ),
          h('span', { class: 'mono' }, `${estado.lista} · ${c.algoritmo}${c.algoritmo === 'RR' ? ` q=${c.quantum}` : ''} · ${c.threads} threads`),
          fim,
          h('span', { class: 'espaco' }),
          botaoSalvar,
          h('button', { type: 'button', class: 'botao', onclick: () => { painelComparar = !painelComparar; render(); } }, 'Comparar'),
        ),
      ),
    );
    atualizar();
  }

  function painelDeConfig(c: ConfigSimulacao): HTMLElement {
    const listas = estado.listas.todas();
    const select = h(
      'select',
      {
        onchange: (e) => {
          estado.lista = (e.target as HTMLSelectElement).value;
          render();
          reiniciar();
        },
      },
      ...listas.map((l) => h('option', { value: l.nome, selected: l.nome === estado.lista }, `${l.nome} (${l.pacotes.length})`)),
    );

    return h(
      'aside',
      { class: 'painel ilha', 'aria-label': 'Configuração' },
      h('h2', {}, 'Configuração'),
      h('p', { class: 'rotulo' }, 'Mudar qualquer item reinicia a execução.'),
      h('label', { class: 'campo' }, h('span', {}, 'Lista'), select),
      h(
        'div',
        { class: 'campo' },
        h('span', {}, 'Algoritmo'),
        segmentado(ALGORITMOS, c.algoritmo, (a) => a, (a) => mudarConfig({ algoritmo: a }), 'Algoritmo'),
      ),
      contador('Quantum (só RR)', c.quantum, QUANTUM_MIN, QUANTUM_MAX, (q) => mudarConfig({ quantum: q }), c.algoritmo !== 'RR'),
      contador('Threads', c.threads, 1, MAX_THREADS, (n) => mudarConfig({ threads: n })),
      h(
        'div',
        { class: 'campo' },
        h('span', {}, 'Sincronismo'),
        h(
          'button',
          { type: 'button', class: `botao ${c.sync ? 'sync-on' : 'sync-off'}`, 'aria-pressed': String(c.sync), onclick: () => mudarConfig({ sync: !c.sync }) },
          c.sync ? 'sync ligado' : 'sync desligado',
        ),
      ),
      h('button', { type: 'button', class: 'botao', onclick: () => { painelConfig = false; render(); } }, 'Fechar'),
    );
  }

  function painelDeComparacao(): HTMLElement {
    const execucoes = estado.execucoes.todas();
    const n = (v: number, casas = 1) => h('td', { class: 'n' }, formatar(v, casas));
    return h(
      'section',
      { class: 'painel-comparar ilha', 'aria-label': 'Comparar execuções' },
      h('div', { class: 'linha-form' }, h('h2', { style: 'flex:1;margin:0' }, 'Execuções salvas'), h('button', { type: 'button', class: 'botao', onclick: () => { painelComparar = false; render(); } }, 'Fechar')),
      execucoes.length === 0
        ? h('p', {}, 'Nenhuma execução salva. Rode uma execução até o fim e clique em "Salvar execução".')
        : h(
            'table',
            {},
            h('thead', {}, h('tr', {}, ...['Lista', 'Algoritmo', 'Threads', 'Sync', 'Espera', 'Turnaround', 'Vazão', 'Colisões', 'Perda', 'Ticks', ''].map((t) => h('th', {}, t)))),
            h(
              'tbody',
              {},
              ...execucoes.map((e) =>
                h(
                  'tr',
                  {},
                  h('td', {}, e.lista),
                  h('td', {}, e.config.algoritmo === 'RR' ? `RR q=${e.config.quantum}` : e.config.algoritmo),
                  h('td', { class: 'n' }, e.config.threads),
                  h('td', {}, e.config.sync ? 'sim' : 'não'),
                  n(e.metricas.esperaMedia),
                  n(e.metricas.turnaroundMedio),
                  n(e.metricas.vazao, 2),
                  h('td', { class: 'n' }, e.metricas.colisoes),
                  h('td', { class: 'n' }, `${formatar(e.metricas.taxaPerda * 100, 0)}%`),
                  h('td', { class: 'n' }, e.metricas.ticks),
                  h('td', {}, h('button', { type: 'button', class: 'botao', onclick: () => { estado.execucoes.apagar(e.id); render(); } }, 'Apagar')),
                ),
              ),
            ),
          ),
    );
  }

  render();
  reiniciar();
  return () => controlador.destruir();
}

function contador(
  rotulo: string,
  valor: number,
  min: number,
  max: number,
  aoMudar: (v: number) => void,
  desabilitado = false,
): HTMLElement {
  return h(
    'div',
    { class: 'campo' },
    h('span', {}, rotulo),
    h(
      'div',
      { class: 'contador' },
      h('button', { type: 'button', class: 'botao', 'aria-label': `diminuir ${rotulo}`, disabled: desabilitado || valor <= min, onclick: () => aoMudar(valor - 1) }, '−'),
      h('output', {}, valor),
      h('button', { type: 'button', class: 'botao', 'aria-label': `aumentar ${rotulo}`, disabled: desabilitado || valor >= max, onclick: () => aoMudar(valor + 1) }, '+'),
    ),
  );
}

function desenharHud(hud: HTMLElement, s: Snapshot): void {
  const m = s.metricas;
  const item = (rotulo: string, valor: string, classe = '') =>
    h('div', { class: classe }, h('div', { class: 'numero' }, valor), h('div', { class: 'rotulo' }, rotulo));
  const maior = Math.max(1, ...TIPOS.map((t) => m.esperaPorTipo[t]));

  hud.replaceChildren(
    item('espera média (ticks)', formatar(m.esperaMedia)),
    item('turnaround médio', formatar(m.turnaroundMedio)),
    item('vazão (pacotes/tick)', formatar(m.vazao, 2)),
    item(`colisões · perda ${formatar(m.taxaPerda * 100, 0)}%`, String(m.colisoes), 'colisoes'),
    h(
      'div',
      { class: 'tipos' },
      h('div', { class: 'rotulo' }, `espera por tipo · ${m.entregues} entregues, ${m.perdidos} perdidos`),
      ...TIPOS.map((t) =>
        h(
          'div',
          { class: 'barra-tipo' },
          h('span', {}, t),
          h('div', { class: 'trilho' }, h('div', { class: 'preenchido', style: `width:${(m.esperaPorTipo[t] / maior) * 100}%;background:${COR_TIPO[t]}` })),
          h('span', {}, formatar(m.esperaPorTipo[t])),
        ),
      ),
    ),
  );
}

function desenharLog(log: HTMLElement, s: Snapshot): void {
  log.replaceChildren(
    ...[...s.log].reverse().slice(0, 60).map((l) =>
      h('div', { class: `linha${l.colisao ? ' colisao' : ''}` }, h('span', {}, String(l.tick)), h('span', {}, l.texto)),
    ),
  );
  if (s.log.length === 0) log.append(h('div', {}, 'nada ainda'));
}
