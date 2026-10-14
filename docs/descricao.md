# Descrição do projeto

## Objetivo
Simular graficamente um roteador que escalona pacotes por tipo e os envia por 3 portas usando threads reais, com e sem sincronismo. Trabalho da disciplina C12 (professor Jonas), em dupla.

## Requisitos da disciplina
- Simular algo usando threads
- Implementar à mão no mínimo 2 algoritmos de escalonamento (vamos fazer 3)
- Mostrar sincronismo: o projeto deve rodar com e sem ele
- Pacotes vêm de listas estáticas, sem gerador em tempo real

## Stack
- TypeScript + Vite
- Web Workers (threads)
- SharedArrayBuffer + Atomics (sincronismo)
- localStorage para as listas salvas

## Pacote
- `id`
- `tipo`: VoIP, HTTP ou UDP
- `tamanho`: define o tempo de transmissão
- `chegada`: tick em que o pacote chega
- `porta`: destino, 1 a 3

## Listas de pacotes
- Obtidas de duas formas:
  - Colar com Ctrl+V (JSON ou CSV)
  - Gerar uma vez com dados aleatórios: quantidade, % por tipo, faixa de tamanho, janela de chegada, seed
- CRUD de listas salvas: salvar, carregar, renomear, apagar

## Configuração da simulação
- Algoritmo: SJF, Round Robin ou Prioridade
- Quantum, usado só no RR
- Número de threads (1 a 8)
- Sincronismo ligado ou desligado
- Velocidade da animação

## Fluxo
1. O loader carrega a lista escolhida
2. Os pacotes entram na fila conforme o tick de chegada
3. O escalonador escolhe o próximo pacote entre os que já chegaram
4. Os workers transmitem na porta de destino
5. Com sync: um mutex por porta, implementado com Atomics, e a thread espera a porta liberar. Sem sync: duas threads podem escrever na mesma porta; a colisão é detectada, registrada e os pacotes envolvidos são perdidos

Detalhes e regras exatas em `docs/decisoes.md`; vocabulário em `CONTEXT.md`.

## Escalonadores
Implementados à mão, todos com a mesma interface.
- **SJF**: menor tamanho primeiro
- **Round Robin**: transmite por um quantum e volta ao fim da fila
- **Prioridade**: VoIP > HTTP > UDP; empate desempata por ordem de chegada

## Métricas
- Espera média, no geral e por tipo
- Turnaround
- Vazão
- Número de colisões e taxa de perda
- Comparação entre execuções salvas

## Conclusões esperadas
- Prioridade favorece VoIP, mostrando o QoS
- SJF tem a menor espera média, mas causa starvation nos pacotes grandes
- RR é o mais justo
- Mais threads aumentam a vazão até as 3 portas virarem o gargalo
- Sem sync aparecem colisões; com sync elas somem, ao custo de mais espera

## Módulos

```
src/
  model/        tipos (Packet, PacketList, SimConfig, Metrics)
  lists/        loader, parser JSON/CSV, gerador aleatório, CRUD em localStorage
  scheduler/    interface Scheduler + sjf.ts, roundRobin.ts, priority.ts
  sync/         mutex com Atomics sobre SharedArrayBuffer
  workers/      worker de transmissão
  engine/       relógio de ticks, orquestra fila, escalonador e workers
  metrics/      coleta e cálculo das métricas
  ui/           renderização e animação
docs/
```
