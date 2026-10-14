# Relógio lógico de ticks com threads reais

As threads são Web Workers de verdade, mas avançam presas a um relógio lógico global de ticks (como o loop de um jogo); colisão é definida logicamente como duas threads na mesma porta no mesmo tick. Escolhemos isso em vez de deixar a corrida acontecer em tempo real porque resultados reproduzíveis entre execuções são necessários para comparar algoritmos, e o controle do tick simplifica pausa, velocidade e animação.

## Exceção aceita

Com sync, o mutex é um ticket lock real (FIFO por ordem de pedido). Quando duas threads pedem o lock da mesma porta no mesmo tick, quem chega primeiro é decidido pela corrida real, então a espera com sync pode variar levemente entre execuções idênticas. Aceitamos isso para manter o mutex honesto, em vez de forçar uma ordem artificial dentro do tick.
