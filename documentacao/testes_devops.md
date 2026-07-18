# Testes e DevOps — listmonk

Seção de Testes do Tópico 6. A seção de DevOps está na branch `trabalho/devops`.

## Testes de aceitação (Cypress)

O listmonk já usa Cypress v15.8.1 para testes E2E, com 11 specs em `frontend/cypress/e2e/`, config em `frontend/cypress.config.js` com `baseUrl` `http://localhost:9000` e `testIsolation: false`, e comandos customizados em `frontend/cypress/support/commands.js` como `cy.resetDB` e `cy.loginAndVisit`.

Adicionamos 4 testes de aceitação em `frontend/cypress/e2e/trabalho.cy.js`, no mesmo padrão da suíte. Todos partem do banco recriado por `cy.resetDB()`, que semeia 2 listas, 2 assinantes — `john@example.com` e `anon@example.com` — e 1 campanha em rascunho.

### Cenários (Gherkin)

```gherkin
Funcionalidade: Gestão de listas e assinantes

  Cenário 1: Criar uma nova lista pública
    Quando crio a lista "Lista Newsletter" (pública, opt-in simples)
    Então ela aparece na tabela de listas

  Cenário 2: Cadastrar assinante e encontrá-lo pela busca
    Quando cadastro "maria@example.com" ("Maria Souza") em uma lista
    E busco por "maria@example.com"
    Então exatamente 1 assinante é exibido, com esse e-mail e nome

  Cenário 3: Formulário público exibe listas públicas
    Dado que existe a lista pública "Lista Pública Trabalho" (criada via API)
    Quando acesso /subscription/form
    Então a lista é exibida como opção

  Cenário 4: Dashboard exibe a contagem de assinantes
    Quando acesso o dashboard
    Então o contador de assinantes é >= 3 e o de listas é >= 2
```

### Cobertura

| # | Cobre |
|---|-------|
| 1 | Criação de lista pela UI: modal, validação, persistência, `POST /api/lists` |
| 2 | Cadastro de assinante com associação a lista e busca via `GET /api/subscribers?query=` |
| 3 | Endpoint público `/subscription/form` e a regra de visibilidade de listas públicas |
| 4 | Agregações do dashboard `GET /api/dashboard/*` e consistência com os dados cadastrados |

### Execução

```bash
# 1. Subir a stack (Postgres + MailHog + app), a partir da raiz do repo:
make init-dev-docker && make dev-docker      # app em http://localhost:9000
# (nativo: subir Postgres, make dist, ./listmonk --install --yes, ./listmonk)

# 2. Rodar o spec do trabalho:
cd frontend && npx cypress run --spec cypress/e2e/trabalho.cy.js
# ou npx cypress open  /  npx cypress run (suíte inteira)
```

Os E2E exigem Postgres, MailHog e o binário buildado, então não foram executados aqui; a sintaxe do spec foi validada com `node --check` e ele reutiliza apenas comandos e seletores já existentes na suíte.
