# Decisões

Termos em **negrito** seguem o glossário em `CONTEXT.md`. Decisões difíceis de reverter têm ADR em `docs/adr/`.

## Fechadas

### Stack e infraestrutura
- **Stack**: TypeScript + Vite, sem framework de UI por enquanto
- **Threads**: Web Workers
- **Sincronismo**: SharedArrayBuffer + Atomics; um mutex por **porta**, implementado à mão
- **Isolamento**: headers COOP `same-origin` e COEP `require-corp` configurados no `vite.config.ts` (dev e preview)
- **Testes**: Vitest
- **Persistência**: localStorage para **listas** e para **execuções** salvas (execução guarda configuração, nome da lista e métricas finais, sem log de eventos)
- **Navegação**: rotas por hash numa página só (`#/simulacao`, `#/listas`)

### Modelo da simulação
- **Escalonador central** ([ADR-0001](adr/0001-escalonador-central.md)): a engine, na thread principal, escolhe o próximo pacote e o entrega a uma **thread** ociosa; threads só transmitem; qualquer thread usa qualquer porta. Cada worker não escalona sozinho
- **Relógio lógico** ([ADR-0002](adr/0002-relogio-logico.md)): threads reais avançam presas a um **tick** global, como o loop de um jogo
- **Tempo**: 1 unidade de **tamanho** = 1 tick de transmissão; tudo inteiro; 1 tick = 100 ms na velocidade 1×, e a velocidade multiplica isso
- **Colisão** ([ADR-0003](adr/0003-colisao-perde-pacote.md)): duas threads na mesma porta no mesmo tick, só sem sync; os pacotes envolvidos são **perdidos**, sem retransmissão
- **Escalonador não enxerga as portas**: entrega o próximo pacote à próxima thread ociosa sem saber se a porta de destino está ocupada
- **Ordem dentro de um tick**:
  1. pacotes com `chegada == tick` entram na fila de entrada
  2. o escalonador entrega pacotes às threads ociosas, em ordem de id de thread
  3. cada thread ocupada transmite 1 unidade, espera o lock ou colide
  4. a engine só avança o tick quando todas as threads terminaram o tick (barreira)

  Um pacote que chega no tick t pode começar a transmitir no próprio tick t
- **Detalhe da colisão**: todos os pacotes na porta naquele tick são perdidos (inclusive um que já transmitia havia vários ticks) e as threads ficam ociosas; conta 1 colisão por porta por tick
- **Mutex**: ticket lock com Atomics (FIFO por ordem de pedido); empates no mesmo tick ficam para a corrida real, então a espera com sync pode variar levemente entre execuções idênticas (exceção registrada na ADR-0002)
- **Comunicação** ([ADR-0004](adr/0004-comunicacao-buffer-snapshot.md)): estado de threads e portas no SharedArrayBuffer (workers escrevem, engine lê); `postMessage` só para setup; a UI nunca lê o buffer, só um snapshot imutável que a engine publica a cada tick
- **Fim da execução**: quando todo pacote foi entregue ou perdido
- **Mudanças ao vivo**: algoritmo, quantum, threads, sync e lista só mudam ao reiniciar; velocidade e pausa mudam ao vivo
- **Portas**: 3, fixas
- **Threads configuráveis**: de 1 a 8
- **Entrada de pacotes**: só listas estáticas (coladas em JSON/CSV ou geradas uma vez com seed); sem gerador em tempo real

### Escalonadores
- 3, implementados à mão, com a mesma interface
- **SJF**: menor tamanho primeiro, **não preemptivo**
- **Round Robin**: transmite por um quantum e volta ao fim da fila
  - quantum em ticks, de 1 a 10, padrão 3
  - ao fim do quantum, o pacote volta ao fim da fila de entrada e libera thread e porta; a próxima fatia pode ir para qualquer thread
  - colisão numa fatia posterior perde o pacote inteiro
- **Prioridade**: VoIP > HTTP > UDP, empate por ordem de chegada, **sem aging** (o starvation do UDP é um resultado a mostrar)

### Métricas
- **Turnaround** = tick de entrega − chegada
- **Espera** = turnaround − tamanho (inclui fila, espera por lock e intervalo entre fatias do RR)
- **Vazão** = pacotes entregues ÷ ticks totais
- **Pacotes perdidos** ficam fora das médias de espera e turnaround; aparecem à parte como contagem e taxa de perda
- **Colisões**: 1 por porta por tick com colisão

### Listas
- **JSON**: array de objetos `{id, tipo, tamanho, chegada, porta}`
- **CSV**: cabeçalho `id,tipo,tamanho,chegada,porta`
- **Validação**: `tipo` sem diferenciar maiúsculas (VoIP/HTTP/UDP); `id` inteiro e único; `tamanho` inteiro de 1 a 20; `chegada` inteiro ≥ 0; `porta` de 1 a 3
- **Entrada inválida**: rejeita a lista inteira, mostrando "linha N: motivo" para cada erro; não salva lista parcialmente válida
- **Gerador aleatório**: quantidade, % por tipo, faixa de tamanho, janela de chegada (ticks, padrão = quantidade) e seed; chegada uniforme em [0, janela], porta uniforme de 1 a 3; mesmo seed e mesmos parâmetros geram a mesma lista
- **Presets** (4):
  - mista: ~40 pacotes equilibrados
  - VoIP pesado: 60% VoIP, mostra o starvation do UDP na Prioridade
  - pacote gigante: um pacote de tamanho 20 entre vários pequenos, mostra o starvation no SJF
  - contenção de porta: quase tudo na porta 1, mostra colisões sem sync e o gargalo

### Escopo
- Formato de entrega e prazo ficam fora do repo; o repo cuida só do código e da simulação
- O design de interface anterior foi descartado; não havia mockup aprovado

## Em aberto

Não decidir sozinho.

- [ ] **Design de interface**: será refeito do zero (visual, fontes, telas). Até lá, nada de UI estilizada
