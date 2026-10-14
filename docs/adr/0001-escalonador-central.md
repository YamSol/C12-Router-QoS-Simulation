# Escalonador central, threads só transmitem

O escalonamento acontece num único ponto (a engine, na thread principal), que escolhe o próximo pacote e o entrega a uma thread ociosa; as threads (Web Workers) só transmitem. Rejeitamos o modelo em que cada worker tira da fila compartilhada e escalona sozinho, porque o projeto precisa do papel de um escalonador que distribui trabalho, como numa CPU, e isso mantém o escalonador como lógica pura e testável.

## Consequências

- O sincronismo exigido pela disciplina fica nas portas (um mutex por porta), não na fila.
- O escalonador não sabe se a porta de destino está ocupada: entregar trabalho a uma porta disputada é justamente o que gera espera por lock (com sync) ou colisão (sem sync).
