type Filho = Node | string | number | null | undefined | false;
type Atributo = string | number | boolean | undefined | ((evento: Event) => void);

/** Cria um elemento. Atributos "on..." viram listeners; booleanos viram presença do atributo. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  atributos: Record<string, Atributo> = {},
  ...filhos: Filho[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === false) continue;
    if (typeof valor === 'function') el.addEventListener(nome.slice(2), valor);
    else if (valor === true) el.setAttribute(nome, '');
    else el.setAttribute(nome, String(valor));
  }
  for (const filho of filhos) {
    if (filho === null || filho === undefined || filho === false) continue;
    el.append(typeof filho === 'number' ? String(filho) : filho);
  }
  return el;
}

/** Botões segmentados com um valor escolhido. */
export function segmentado<T extends string>(
  opcoes: readonly T[],
  atual: T,
  rotulo: (v: T) => string,
  aoEscolher: (v: T) => void,
  nome: string,
): HTMLElement {
  return h(
    'div',
    { class: 'segmentado', role: 'group', 'aria-label': nome },
    ...opcoes.map((v) =>
      h('button', { type: 'button', 'aria-pressed': String(v === atual), onclick: () => aoEscolher(v) }, rotulo(v)),
    ),
  );
}

export function formatar(n: number, casas = 1): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
