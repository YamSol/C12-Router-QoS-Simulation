# Tasks

## 0. Decisões
- [x] Fechar os itens em aberto de docs/decisoes.md (exceto design de interface, que fica para a seção 5)

## 1. Base
- [x] Configurar Vitest
- [x] Tipos em src/model
- [x] Parser JSON/CSV com validação
- [x] Gerador aleatório com seed
- [x] CRUD de listas em localStorage
- [x] 3 ou 4 listas preset (mista, VoIP pesado, pacote gigante)

## 2. Motor
- [x] Relógio de ticks e fila de chegada
- [x] Interface Scheduler
- [x] SJF
- [x] Round Robin
- [x] Prioridade
- [x] Testes unitários dos 3 escalonadores com listas pequenas

## 3. Threads e sincronismo
- [x] Estado das portas e da fila em SharedArrayBuffer
- [x] Worker de transmissão
- [x] Mutex com Atomics
- [x] Modo sem sync com detecção de colisão
- [x] Número de threads configurável

## 4. Métricas
- [x] Coleta por pacote
- [x] Médias gerais e por tipo, vazão, colisões
- [x] Salvar e comparar execuções

## 5. Interface
- [x] Definir a identidade visual (docs/design.md)
- [ ] Desenhar as telas no Claude Design
- [x] Tela Simulação (versão simples)
- [ ] Animação dos pacotes entre colunas (feito: pulo ao entrar na thread, tremor e queda na colisão; falta o deslizamento pelas setas)
- [x] Tela Listas
- [x] Log

## 6. Entrega
- [x] README com como rodar e conclusões (conclusões medidas só na contenção de porta; faltam as dos outros presets)
- [ ] Execuções de comparação com os presets
