# workers

Worker de transmissão: cada instância é uma thread que transmite pacotes na porta de destino.
Com sync, pega o mutex da porta; sem sync, escreve direto e a colisão é detectada.
