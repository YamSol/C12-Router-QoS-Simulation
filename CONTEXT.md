# Roteador com QoS

Simulação de um roteador que recebe pacotes de uma lista estática, escalona-os por tipo e os transmite por 3 portas usando threads, com e sem sincronismo.

## Linguagem

### Pacotes e listas

**Pacote**:
Unidade de trabalho do roteador, com id, tipo, tamanho, chegada e porta de destino.
_Evitar_: job, processo, mensagem

**Tipo**:
Classe de serviço do pacote: VoIP, HTTP ou UDP.
_Evitar_: categoria, classe

**Tamanho**:
Número inteiro de 1 a 20 que é, ao mesmo tempo, a quantidade de ticks que a transmissão do pacote ocupa.
_Evitar_: bytes, peso, duração

**Chegada**:
Tick em que o pacote passa a existir na fila de entrada.
_Evitar_: timestamp, arrival

**Lista**:
Conjunto estático e nomeado de pacotes que alimenta uma execução.
_Evitar_: dataset, cenário, arquivo

**Preset**:
Lista que já vem com o projeto, montada para evidenciar um comportamento específico.

### Tempo

**Tick**:
Unidade lógica de tempo da simulação; todo tempo (chegada, espera, transmissão) é medido em ticks inteiros.
_Evitar_: passo, frame, ciclo

### Roteador

**Fila de entrada**:
Pacotes que já chegaram e ainda não foram entregues a uma thread.
_Evitar_: buffer, pool

**Escalonador**:
Papel único e central que escolhe qual pacote da fila de entrada vai para a próxima thread ociosa, segundo um algoritmo (SJF, Round Robin ou Prioridade).
_Evitar_: scheduler (fora do código), dispatcher

**Thread**:
Executor que recebe um pacote do escalonador e o transmite na porta de destino; qualquer thread pode usar qualquer porta.
_Evitar_: worker (fora do código), transmissor, núcleo

**Porta**:
Uma das 3 saídas do roteador; transmite um pacote por vez.
_Evitar_: interface, link, canal

### Sincronismo

**Sync**:
Modo em que a thread só transmite numa porta depois de obter o lock exclusivo dela.

**Colisão**:
Situação, possível só sem sync, em que duas threads escrevem na mesma porta no mesmo tick.

**Pacote perdido**:
Pacote envolvido numa colisão; sai da simulação sem ser entregue e não é retransmitido.
_Evitar_: descartado, dropado

**Pacote entregue**:
Pacote cuja transmissão terminou sem colisão.

### Round Robin

**Quantum**:
Número máximo de ticks que um pacote transmite antes de voltar ao fim da fila de entrada.
_Evitar_: time slice

**Fatia**:
Trecho contínuo da transmissão de um pacote dentro de um quantum; um pacote pode ter várias fatias, em threads diferentes.

### Métricas

**Turnaround**:
Ticks entre a chegada e a entrega de um pacote.

**Espera**:
Turnaround menos o tamanho: todo tick em que o pacote existia sem estar transmitindo (na fila, esperando lock ou entre fatias).
_Evitar_: latência, atraso

**Vazão**:
Pacotes entregues por tick ao longo de uma execução.
_Evitar_: throughput

**Taxa de perda**:
Fração dos pacotes da lista que foram perdidos.

### Execução

**Execução**:
Uma rodada completa da simulação sobre uma lista com uma configuração fixa (algoritmo, quantum, threads, sync), resumida pelas suas métricas.
_Evitar_: run, rodada, teste
