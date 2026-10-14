# Roteador com QoS

Simulador gráfico de roteador com escalonamento de pacotes (SJF, RR, Prioridade) e sincronismo entre threads (Web Workers + Atomics). Trabalho da disciplina C12.

## Antes de qualquer tarefa
- Leia CONTEXT.md, docs/descricao.md, docs/decisoes.md e docs/tasks.md
- O design de interface está em aberto e será refeito. Não invente estilo; pergunte antes de qualquer UI além do mínimo funcional

## Regras
- Trabalhe uma task de docs/tasks.md por vez e marque como feita ao terminar
- Não decida itens marcados "em aberto" em docs/decisoes.md; pergunte
- Os escalonadores e o mutex são implementados à mão: nada de bibliotecas de fila de prioridade, locks ou schedulers
- Todo escalonador implementa a mesma interface em src/scheduler/
- Lógica de simulação não depende da UI; a UI só lê estado
- TypeScript estrito, sem any
- Comentários e textos da interface em português

## Rodar
- npm install
- npm run dev  (headers COOP/COEP já configurados no Vite)

## Agent skills

### Issue tracker

Issues e specs ficam como markdown local em `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Labels padrão: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` na raiz, além de `docs/decisoes.md`. See `docs/agents/domain.md`.
