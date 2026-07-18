# Testes e DevOps — listmonk

Seção de DevOps/CI do Tópico 7. A seção de Testes está na branch `trabalho/testes`.

## Pipeline atual (GitHub Actions)

| Workflow | Gatilho | Função |
|----------|---------|--------|
| `build-sanity.yml` | `pull_request: [opened]` | `make dist` — verifica só se compila |
| `release.yml` | tag `v*` | GoReleaser: binários + imagens Docker + release |
| `nightly.yml` | cron diário | Build noturno, imagens `:nightly` |
| `hodor-review.yml` | PR com label | Revisão por IA, não é gate funcional |
| `github-pages.yml` | push em `docs/**` | Publica o site de documentação |
| `issues.yml` | cron diário | Fecha issues/PRs inativos |

## Problemas

1. Nenhum teste roda na CI: existe `make test` com `go test ./...` e 11 specs Cypress, mas nenhum workflow os executa.
2. Sem análise estática de Go como `go vet` ou `golangci-lint`.
3. Gatilho incompleto em `build-sanity.yml`: só dispara em `opened`, então novos pushes a um PR via `synchronize` e reaberturas via `reopened` não re-verificam o build.
4. Sem lint de frontend na CI; o ESLint só roda no `prebuild` local.
5. Sem cobertura, SonarQube, CodeQL ou scan de dependências.

## Melhorias propostas

| Prioridade | Melhoria |
|------------|----------|
| Implementada | `ci.yml` rodando `go vet` + `go test` + `yarn lint` em push/PR |
| Alta | Incluir `synchronize`/`reopened` no gatilho do `build-sanity.yml` |
| Média | Rodar Cypress na CI com serviço Postgres + MailHog |
| Média | Adicionar `golangci-lint` |
| Baixa | Cobertura via `-coverprofile`, CodeQL, Trivy |

## Melhoria implementada — `.github/workflows/ci.yml`

Cobre os problemas 1, 2, 3 e 4: um workflow de testes e lint que roda em `push` na `master` e em `pull_request` nos tipos `opened`, `synchronize` e `reopened`.

```yaml
on:
  push:
    branches: [master]
  pull_request:
    types: [opened, synchronize, reopened]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version-file: .go-version, cache: true }
      - run: go vet ./...
      - run: go test ./...

  frontend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: yarn, cache-dependency-path: frontend/yarn.lock }
      - working-directory: frontend
        run: yarn install --frozen-lockfile
      - working-directory: frontend
        run: yarn lint
```

### Justificativa

- Aditivo e de baixo risco: não altera release/nightly e usa alvos já existentes como `go test ./...` e `yarn lint`.
- `go-version-file: .go-version`: a CI acompanha a versão declarada pelo projeto, sem o `1.26.1` fixo do `build-sanity.yml`.
- `concurrency` e jobs paralelos: feedback rápido e sem execuções obsoletas.
- Escalável: dá pra somar Cypress, cobertura e segurança depois sem reescrever.
