import { h } from './dom';
import { criarEstado } from './estado';
import { montarListas } from './telaListas';
import { montarSimulacao } from './telaSimulacao';

/** Rotas por hash numa página só: #/simulacao e #/listas. */
export function iniciarApp(raiz: HTMLElement): void {
  if (!crossOriginIsolated) {
    raiz.replaceChildren(
      h(
        'main',
        { class: 'listas' },
        h('h1', {}, 'SharedArrayBuffer indisponível'),
        h('p', {}, 'A página precisa dos headers COOP/COEP. Rode com "npm run dev" ou "npm run preview".'),
      ),
    );
    return;
  }

  const estado = criarEstado(localStorage);
  let limpar = () => {};

  function navegar(): void {
    limpar();
    if (location.hash === '#/listas') limpar = montarListas(raiz, estado);
    else limpar = montarSimulacao(raiz, estado);
  }

  window.addEventListener('hashchange', navegar);
  navegar();
}
