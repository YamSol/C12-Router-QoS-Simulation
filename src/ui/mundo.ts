import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import { rotulo, type PacoteVisivel, type Snapshot, type ThreadVisivel } from '../engine/simulacao';
import type { Pacote, Tipo } from '../model/tipos';

/*
 * O "mundo": a simulação desenhada à mão em SVG, refeita a cada snapshot.
 * Cada forma tem seed fixa (derivada de uma chave estável), para o traço não
 * "ferver" entre frames. Layout num viewBox de 1600×900, da esquerda para a
 * direita: fila → escalonador → threads → portas.
 */

const NS = 'http://www.w3.org/2000/svg';
const LARGURA = 1600;
const ALTURA = 900;

const TINTA = '#1e1e1e';
const VERMELHO = '#e03131';
const VERDE = '#2f9e44';
const CINZA = '#adb5bd';
const AMBAR = '#f08c00';
const HACHURA = '#ced4da';

const COR: Record<Tipo, string> = { VoIP: '#f08c00', HTTP: '#1971c2', UDP: '#9c36b5' };
const TEXTO_SOBRE: Record<Tipo, string> = { VoIP: TINTA, HTTP: '#ffffff', UDP: '#ffffff' };

const FILA = { x: 40, y: 90, w: 360, h: 780 };
const ESC = { x: 460, y: 300, w: 220, h: 320 };
const THREADS = { x: 740, y: 90, w: 400, h: 780 };
// As portas começam abaixo do HUD, que fica sobreposto no canto superior direito.
const PORTAS = { x: 1220, y: 370, w: 340, h: 150, gap: 14 };
const MAX_NA_FILA = 12;

export function criarMundo(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${LARGURA} ${ALTURA}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('class', 'mundo');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Simulação do roteador');
  return svg;
}

export function desenharMundo(svg: SVGSVGElement, s: Snapshot, anterior: Snapshot | undefined): void {
  svg.replaceChildren();
  const rc = rough.svg(svg);
  const d = new Desenho(svg, rc);

  desenharFila(d, s);
  desenharEscalonador(d, s);
  d.seta('seta-fila', FILA.x + FILA.w + 6, 460, ESC.x - 6, 460);
  d.seta('seta-esc', ESC.x + ESC.w + 6, 460, THREADS.x - 6, 460);
  desenharThreads(d, s, anterior);
  desenharPortas(d, s);
}

// ---------- zonas ----------

function desenharFila(d: Desenho, s: Snapshot): void {
  d.texto(FILA.x, 60, 'fila de entrada', { classe: 'mao', tamanho: 28 });
  d.forma('fila', (o) => d.rc.rectangle(FILA.x, FILA.y, FILA.w, FILA.h, conteiner(o)));

  s.fila.slice(0, MAX_NA_FILA).forEach((item, i) => {
    d.pacote(item, FILA.x + 16, FILA.y + 20 + i * 54);
  });
  const sobra = s.fila.length - MAX_NA_FILA;
  if (sobra > 0) d.texto(FILA.x + 16, FILA.y + 20 + MAX_NA_FILA * 54 + 28, `+${sobra}`, { classe: 'mono', tamanho: 26 });
  if (s.fila.length === 0) d.texto(FILA.x + 16, FILA.y + 44, 'vazia', { classe: 'mao', tamanho: 22, cor: CINZA });

  d.texto(FILA.x + 16, FILA.y + FILA.h - 20, `faltam chegar: ${s.faltamChegar}`, { classe: 'mono', tamanho: 18 });
}

function desenharEscalonador(d: Desenho, s: Snapshot): void {
  d.texto(ESC.x, ESC.y - 24, 'escalonador', { classe: 'mao', tamanho: 28 });
  d.forma('esc', (o) => d.rc.rectangle(ESC.x, ESC.y, ESC.w, ESC.h, conteiner(o)));
  d.texto(ESC.x + ESC.w / 2, ESC.y + 52, s.config.algoritmo, { classe: 'mao', tamanho: 40, ancora: 'middle' });

  quebrar(s.regra, 20).forEach((linha, i) => {
    d.texto(ESC.x + 14, ESC.y + 92 + i * 24, linha, { classe: 'mao', tamanho: 19 });
  });

  d.texto(ESC.x + 14, ESC.y + 210, 'próximos', { classe: 'mao', tamanho: 18, cor: '#495057' });
  s.proximos.forEach((item, i) => d.ficha(item.pacote, ESC.x + 14 + i * 66, ESC.y + 226, `prox-${i}`));
}

function desenharThreads(d: Desenho, s: Snapshot, anterior: Snapshot | undefined): void {
  d.texto(THREADS.x, 60, 'threads', { classe: 'mao', tamanho: 28 });
  const n = s.threads.length;
  const passo = Math.min(120, THREADS.h / n);
  const altura = passo - 14;

  s.threads.forEach((thread, i) => {
    const y = THREADS.y + i * passo;
    // Pacote que acabou de entrar na thread dá um pulo
    const antes = anterior?.threads[i]?.item?.pacote.id;
    const agora = thread.item?.pacote.id;
    const entrou = agora !== undefined && agora !== antes;
    const g = d.grupo(thread.estado === 'colisao' ? 'treme' : undefined);
    desenharMaquina(d.em(g), thread, i, y, altura, s.tick, entrou);

    // Conector até a porta de destino
    if (thread.item) {
      const p = thread.item.pacote.porta - 1;
      const yPorta = PORTAS.y + p * (PORTAS.h + PORTAS.gap) + PORTAS.h / 2;
      const cor = thread.estado === 'esperando' ? AMBAR : TINTA;
      d.forma(`con-${i}`, (o) =>
        d.rc.line(THREADS.x + THREADS.w + 4, y + altura / 2, PORTAS.x - 26, yPorta, {
          ...o,
          stroke: cor,
          strokeWidth: 2,
          strokeLineDash: thread.estado === 'esperando' ? [10, 8] : undefined,
        }),
      );
    }
  });
}

function desenharMaquina(
  d: Desenho,
  t: ThreadVisivel,
  i: number,
  y: number,
  h: number,
  tick: number,
  entrou: boolean,
): void {
  const x = THREADS.x;
  const w = THREADS.w;
  const chave = `thread-${i}`;

  if (t.estado === 'esperando') {
    // Hachura âmbar "pulsando" devagar: a intensidade alterna com o tick.
    const opacidade = tick % 4 < 2 ? 0.9 : 0.45;
    const g = d.forma(`${chave}-espera`, (o) =>
      d.rc.rectangle(x, y, w, h, { ...o, stroke: 'none', fill: AMBAR, fillStyle: 'hachure', hachureGap: 10 }),
    );
    g.setAttribute('opacity', String(opacidade));
  }

  const borda = t.estado === 'colisao' ? VERMELHO : t.estado === 'ociosa' ? CINZA : TINTA;
  d.forma(chave, (o) =>
    d.rc.rectangle(x, y, w, h, {
      ...o,
      stroke: borda,
      strokeWidth: t.estado === 'colisao' ? 3 : 2,
      strokeLineDash: t.estado === 'ociosa' ? [10, 8] : undefined,
      fill: t.estado === 'transmitindo' ? HACHURA : undefined,
      fillStyle: 'hachure',
      hachureGap: 12,
    }),
  );

  // Linha de cima: nome e estado; embaixo, o pacote.
  d.texto(x + 14, y + 30, `T${i + 1}`, { classe: 'mao', tamanho: 26 });
  const nomes = { ociosa: 'ociosa', transmitindo: 'transmitindo', esperando: 'esperando lock', colisao: 'colisão!' };
  d.texto(x + 66, y + 29, nomes[t.estado], {
    classe: 'mao',
    tamanho: 20,
    cor: t.estado === 'colisao' ? VERMELHO : '#495057',
  });

  if (t.item) d.pacote(t.item, x + 14, y + Math.max(38, h / 2 - 12), `maq-${i}`, entrou ? 'pula' : undefined);

  const cx = x + w - 30;
  const cy = y + h / 2;
  if (t.estado === 'transmitindo') d.engrenagem(cx, cy, tick, chave);
  if (t.estado === 'esperando') d.cadeado(cx - 10, cy - 14, true, AMBAR, chave);
  if (t.estado === 'colisao') d.explosao(cx, cy, chave);
}

function desenharPortas(d: Desenho, s: Snapshot): void {
  d.texto(PORTAS.x, PORTAS.y - 24, 'portas', { classe: 'mao', tamanho: 28 });

  s.portas.forEach((porta, p) => {
    const y = PORTAS.y + p * (PORTAS.h + PORTAS.gap);
    const g = d.grupo(porta.colisao ? 'treme' : undefined);
    const dp = d.em(g);

    dp.forma(`porta-${p}`, (o) =>
      dp.rc.rectangle(PORTAS.x, y, PORTAS.w, PORTAS.h, {
        ...conteiner(o),
        stroke: porta.colisao ? VERMELHO : TINTA,
        strokeWidth: porta.colisao ? 3 : 2,
      }),
    );
    dp.texto(PORTAS.x + 16, y + 34, `Porta ${p + 1}`, { classe: 'mao', tamanho: 26 });

    const status = porta.colisao ? 'colisão!' : porta.escritas > 0 ? 'transmitindo' : 'livre';
    dp.texto(PORTAS.x + PORTAS.w - 16, y + 34, status, {
      classe: 'mono',
      tamanho: 17,
      ancora: 'end',
      cor: porta.colisao ? VERMELHO : porta.escritas > 0 ? TINTA : '#868e96',
    });

    porta.ultimos.forEach((pacote, k) => dp.ficha(pacote, PORTAS.x + 16 + k * 64, y + 60, `ult-${p}-${k}`));
    if (porta.ultimos.length === 0) dp.texto(PORTAS.x + 16, y + 84, 'nada entregue ainda', { classe: 'mao', tamanho: 18, cor: CINZA });

    // Cadeado na entrada: só com sync; fecha quando a porta está em uso.
    if (s.config.sync) dp.cadeado(PORTAS.x - 22, y + PORTAS.h / 2 - 16, porta.escritas > 0, porta.escritas > 0 ? VERDE : TINTA, `cad-${p}`);
    if (porta.colisao) dp.explosao(PORTAS.x + PORTAS.w - 40, y + 100, `porta-${p}`);

    // Pacotes perdidos caem para fora do diagrama
    s.perdidosNoTick
      .filter((pacote) => pacote.porta === p + 1)
      .forEach((pacote, k) => {
        const gc = d.grupo('cai');
        d.em(gc).ficha(pacote, PORTAS.x + 120 + k * 70, y + PORTAS.h - 44, `perd-${pacote.id}`);
      });
  });
}

// ---------- primitivas ----------

interface OpcoesTexto {
  classe: 'mao' | 'mono';
  tamanho: number;
  ancora?: 'start' | 'middle' | 'end';
  cor?: string;
}

class Desenho {
  constructor(
    private readonly alvo: SVGElement,
    readonly rc: ReturnType<typeof rough.svg>,
  ) {}

  em(alvo: SVGElement): Desenho {
    return new Desenho(alvo, this.rc);
  }

  grupo(classe?: string): SVGGElement {
    const g = document.createElementNS(NS, 'g');
    if (classe) g.setAttribute('class', classe);
    this.alvo.appendChild(g);
    return g;
  }

  /** Desenha uma forma do rough.js com seed fixa derivada da chave. */
  forma(chave: string, criar: (o: Options) => SVGGElement): SVGGElement {
    const no = criar({ seed: seed(chave), roughness: 0.9, bowing: 0.6, stroke: TINTA, strokeWidth: 2 });
    this.alvo.appendChild(no);
    return no;
  }

  texto(x: number, y: number, conteudo: string, o: OpcoesTexto): void {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y));
    t.setAttribute('class', o.classe);
    t.setAttribute('font-size', String(o.tamanho));
    if (o.ancora) t.setAttribute('text-anchor', o.ancora);
    if (o.cor) t.setAttribute('style', `fill:${o.cor}`);
    t.textContent = conteudo;
    this.alvo.appendChild(t);
  }

  /** Pacote: comprimento proporcional ao que falta transmitir. */
  pacote(item: PacoteVisivel, x: number, y: number, prefixo = 'pac', classe?: string): void {
    const g = this.grupo(classe);
    const d = this.em(g);
    const w = 56 + (item.restante - 1) * 9;
    const h = 36;
    const tipo = item.pacote.tipo;
    d.forma(`${prefixo}-${item.pacote.id}`, (o) =>
      d.rc.rectangle(x, y, w, h, { ...o, fill: COR[tipo], fillStyle: 'solid' }),
    );
    d.texto(x + 8, y + 24, rotulo(item.pacote), { classe: 'mono', tamanho: 16, cor: TEXTO_SOBRE[tipo] });
    d.texto(x + w + 8, y + 24, String(item.restante), { classe: 'mono', tamanho: 16 });
  }

  /** Ficha de tamanho fixo, para trilhas e "próximos". */
  ficha(pacote: Pacote, x: number, y: number, chave: string): void {
    const tipo = pacote.tipo;
    this.forma(`ficha-${chave}-${pacote.id}`, (o) =>
      this.rc.rectangle(x, y, 58, 32, { ...o, fill: COR[tipo], fillStyle: 'solid' }),
    );
    this.texto(x + 29, y + 22, rotulo(pacote), { classe: 'mono', tamanho: 14, ancora: 'middle', cor: TEXTO_SOBRE[tipo] });
  }

  seta(chave: string, x1: number, y1: number, x2: number, y2: number): void {
    this.forma(chave, (o) => this.rc.line(x1, y1, x2, y2, o));
    this.forma(`${chave}-a`, (o) => this.rc.line(x2 - 14, y2 - 10, x2, y2, o));
    this.forma(`${chave}-b`, (o) => this.rc.line(x2 - 14, y2 + 10, x2, y2, o));
  }

  /** Engrenagem girando: o ângulo vem do tick, não de animação CSS. */
  engrenagem(cx: number, cy: number, tick: number, chave: string): void {
    const g = this.grupo();
    g.setAttribute('transform', `rotate(${(tick * 30) % 360} ${cx} ${cy})`);
    const d = this.em(g);
    d.forma(`${chave}-eng`, (o) => d.rc.circle(cx, cy, 30, o));
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      d.forma(`${chave}-eng-${k}`, (o) =>
        d.rc.line(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, o),
      );
    }
  }

  cadeado(x: number, y: number, fechado: boolean, cor: string, chave: string): void {
    this.forma(`${chave}-corpo`, (o) =>
      this.rc.rectangle(x, y + 12, 22, 18, { ...o, stroke: cor, fill: cor, fillStyle: 'solid' }),
    );
    // Alça: fechada encaixa no corpo; aberta fica levantada para o lado.
    const deslocamento = fechado ? 0 : 7;
    this.forma(`${chave}-alca-${fechado ? 'f' : 'a'}`, (o) =>
      this.rc.arc(x + 11 + deslocamento, y + 12 - deslocamento / 2, 16, 20, Math.PI, Math.PI * 2, false, {
        ...o,
        stroke: cor,
      }),
    );
  }

  /** Rabisco de explosão: estrela irregular vermelha. */
  explosao(cx: number, cy: number, chave: string): void {
    const pontos: [number, number][] = [];
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8;
      const r = k % 2 === 0 ? 30 : 13;
      pontos.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    this.forma(`${chave}-exp`, (o) =>
      this.rc.polygon(pontos, { ...o, stroke: VERMELHO, strokeWidth: 3, roughness: 1.6 }),
    );
  }
}

function conteiner(o: Options): Options {
  return { ...o, fill: HACHURA, fillStyle: 'hachure', hachureGap: 14, fillWeight: 1 };
}

/** Hash simples de string para seed estável (rough.js trata 0 como aleatório). */
function seed(chave: string): number {
  let h = 2166136261;
  for (let i = 0; i < chave.length; i++) {
    h ^= chave.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 1) % 2147483646 || 1;
}

function quebrar(frase: string, largura: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of frase.split(' ')) {
    if ((atual + ' ' + palavra).trim().length > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = (atual + ' ' + palavra).trim();
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}
