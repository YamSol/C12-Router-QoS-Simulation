# Identidade visual

Excalidraw no visual, Factorio no comportamento. A simulação gráfica é a protagonista; pensado primeiro para projetor em sala.

## Princípios

- **Projetor primeiro**: se funciona projetado, funciona de perto. Alto contraste, texto grande, pouca coisa grande em vez de muita coisa pequena
- **Sensação de jogo**: o roteador é uma fábrica funcionando; pacotes correm como itens numa esteira, threads são máquinas
- **Metáfora**: diagrama de rede, com caixas e setas, pacotes percorrendo as linhas
- **Mundo rabiscado, chrome limpo**: a simulação (o "mundo") é desenhada à mão; controles, HUD, painéis e a tela Listas são limpos, como a UI do próprio Excalidraw
- **Sem som**

## Anti-referências

- Cores de saturação média com borda num tom mais escuro da mesma cor
- Dashboard SaaS genérico: cards, gradientes, sombras pesadas
- Tema escuro com cinzas próximos (some no projetor)

## Layout

- Canvas do mundo ocupa ~80% da tela
- Barra de player fina embaixo: ▶ ⏸ ↺ e velocidade
- HUD/placar sobreposto num canto, com as métricas
- Painel recolhível de configuração: algoritmo, quantum, threads, sync, lista
- Log em painel opcional, fechado por padrão
- Título descritivo no cabeçalho: "Simulador de Roteador com QoS", com wordmark simples
- Navegação por hash: `#/simulacao` e `#/listas`

## Mundo

- 4 zonas da esquerda para a direita: fila de entrada → escalonador → threads → portas, com espaços generosos e setas longas por onde os pacotes correm
- Precisa caber 8 máquinas de thread sem encolher texto
- Fila mostra até ~12 pacotes; depois disso, "+N"
- Fundo: papel com grade de pontos sutil (`#1E1E1E` a ~8% de opacidade, a cada 24px)

## Cores

| Papel | Hex |
|---|---|
| fundo (papel) | `#FAF9F6` |
| tinta (traço e texto) | `#1E1E1E` |
| VoIP | `#F08C00` (texto escuro) |
| HTTP | `#1971C2` (texto branco) |
| UDP | `#9C36B5` (texto branco) |
| colisão, sync desligado | `#E03131` |
| sync ligado, entregue | `#2F9E44` |
| inativo, ocioso | `#ADB5BD` |

Regra: tipo de pacote nunca usa vermelho nem verde; essas cores são só de estado.

## Forma e traço

- **Pacotes**: preenchimento sólido saturado + traço de tinta `#1E1E1E`, 2px
- **Contêineres** (fila, threads, portas): hachura diagonal clara + traço de tinta
- Borda sempre tinta preta, nunca um tom escuro da mesma cor
- Rabiscado leve: tremor sutil, ainda legível como diagrama
- **O tremor de cada forma é fixo (gerado por seed) e não muda entre frames**; senão tudo "ferve" na animação

## Tipografia

- **Excalifont** (manuscrita): rótulos e títulos dentro do mundo
- **Cascadia Code** (mono): números, IDs (`V-062`, `H-047`, `U-046`), HUD, tick
- **Sans neutra**: chrome limpo
- Mínimos em 1080p: rótulos no canvas ≥ 20px, IDs nos pacotes ≥ 16px, números do HUD ≥ 40px
- Fontes hospedadas localmente: o COEP `require-corp` pode bloquear fontes de outra origem

## Espaçamento

- Base de 8px

## Pacote

- Comprimento proporcional ao tamanho (1 a 20 unidades); encolhe enquanto transmite, como barra de progresso física
- Mostra o ID com letra do tipo (V/H/U) e o tamanho em número; tipo nunca só pela cor

## Estados

**Threads (máquinas)**
- **Ociosa**: traço cinza tracejado, vazia
- **Transmitindo**: traço de tinta, pacote dentro encolhendo, pequena engrenagem desenhada girando
- **Esperando lock**: hachura âmbar pulsando devagar + cadeado fechado apontando para a porta disputada
- **Colisão**: traço vermelho + rabisco de "explosão"; a máquina treme ~300ms

**Portas e sync**
- **Sync ligado**: cada porta tem um cadeado desenhado na entrada
- **Sync desligado**: sem cadeados; botão de sync vermelho

## Animação

Juice localizado: os efeitos mostram *onde* algo aconteceu, nunca afetam a tela inteira.
- Pacotes deslizam pelas setas entre as zonas
- Pacote dá um pequeno salto ao entrar na thread
- Cadeado fecha com clique visual quando a porta trava
- Colisão: porta treme com rabisco vermelho; pacotes perdidos caem para fora do diagrama
- Nada de tremer a tela inteira, partículas contínuas ou flashes

## O que cada tela precisa mostrar

**Simulação**
- Tick atual, lista escolhida, link para Listas
- Config: algoritmo (SJF, RR, Prioridade), quantum (só RR, 1 a 10), threads (1 a 8), sync, velocidade (0,5× a 4×)
- Escalonador: algoritmo, regra em uma frase, próximos pacotes
- HUD: espera média, turnaround médio, vazão, colisões, taxa de perda; espera por tipo; salvar e comparar execuções

**Listas**
- Salvas: nome, quantidade, proporção por tipo; carregar, renomear, apagar
- Gerar aleatória: quantidade, % por tipo, faixa de tamanho, janela de chegada, seed; "Gerar e salvar"
- Colar JSON/CSV: validação com "linha N: motivo" ou "válido · N pacotes"; nome; salvar

## Acessibilidade

- Elementos clicáveis são `<button>` ou `<a>` reais
- Alvos de pelo menos 36px de altura
- Tipo do pacote sempre também em texto
