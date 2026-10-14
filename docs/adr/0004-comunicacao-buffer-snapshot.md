# Workers escrevem no buffer, UI lê só snapshots

O estado das threads e das portas vive no SharedArrayBuffer: os workers escrevem, a engine lê, e `postMessage` serve só para o setup (enviar buffer e configuração). A UI nunca lê o buffer; a engine publica um snapshot imutável a cada tick e a UI só renderiza esse snapshot. Isso mantém a regra "a UI só lê estado", deixa a lógica de simulação testável sem DOM e evita que a renderização veja um tick pela metade.
