# Contribuições

## Identificação

- Artur Assis Guerra — 23.1.8006
- Joao Pedro Ferreira Lobo — 23.2.8013

Repositório original: https://github.com/knadh/listmonk
Fork: https://github.com/Arturgrr/listmonk

## Caminho A — Manutenção evolutiva

Issue escolhida: https://github.com/knadh/listmonk/issues/2693 — "Support ongoing Welcome campaigns that stay active for new subscribers".

Solução: implementamos e-mails de boas-vindas por lista, enviados automaticamente a cada novo assinante ao ingressar na lista, atendendo ao pedido da issue por mensagens de boas-vindas contínuas para novos assinantes. O PR foi aberto no repositório original em https://github.com/knadh/listmonk/pull/3151.

## Caminho B — Engenharia de qualidade e refatoração

Refatoramos o código de configurações e dos webhooks de bounce para melhorar a qualidade interna, guiados pela análise de code smells e padrões documentada no Tópico 5. O PR foi aberto no repositório original em https://github.com/knadh/listmonk/pull/3150.

## Pull Requests criados

| # | Contribuição | PR |
|---|--------------|----|
| PR1 | Arquitetura | https://github.com/Arturgrr/listmonk/pull/2 |
| PR2 | Padrões e code smells | https://github.com/Arturgrr/listmonk/pull/1 |
| PR3 | Refatoração (Caminho B) | https://github.com/knadh/listmonk/pull/3150 |
| PR4 | Testes | https://github.com/Arturgrr/listmonk/pull/3 |
| PR5 | DevOps | https://github.com/Arturgrr/listmonk/pull/4 |
| PR6 | Contribuições | https://github.com/Arturgrr/listmonk/pull/5 |

Solução da issue (Caminho A) no repositório original: https://github.com/knadh/listmonk/pull/3151

## Papel de cada integrante

- Artur Assis Guerra — contribuições de código no repositório original: feature de e-mails de boas-vindas (Caminho A) e refatoração de settings e webhooks de bounce (Caminho B); configuração do fork e da CI.
- Joao Pedro Ferreira Lobo — análise e documentação: arquitetura, padrões e code smells, testes de aceitação e DevOps.
