# Colisão perde o pacote, sem retransmissão

Sem sync, os pacotes envolvidos numa colisão são perdidos, não retransmitidos. Retransmitir faria o tempo total crescer com o número de colisões, e um roteador real não pode gastar tempo extra reprocessando, já que novos pacotes continuam chegando; o custo de não sincronizar aparece como perda, não como atraso. A decisão pode ser rediscutida no relatório.
