# Padrões de Projeto, Code Smells e Refatorações

## 1. Visão geral

Este documento apresenta os problemas de qualidade identificados no código do Listmonk e as refatorações realizadas no Caminho B do trabalho.

A análise foi feita com apoio das seguintes ferramentas:

- `go test ./...`
- `go vet ./...`
- `staticcheck ./...`
- `gocyclo`

Foram identificados e corrigidos três code smells:

1. Código duplicado na normalização das listas de domínios.
2. Método longo e excesso de responsabilidades em `UpdateSettings`.
3. Condicional complexo em `BounceWebhook`.

Também foram aplicados dois padrões de projeto:

1. Strategy.
2. Adapter.

---

# 2. Code Smell 1 — Duplicate Code

## 2.1 Localização

Arquivo:

```text
cmd/settings.go
```

Método:

```go
func (a *App) UpdateSettings(c echo.Context) error
```

## 2.2 Problema identificado

As listas `DomainBlocklist` e `DomainAllowlist` eram normalizadas por dois blocos praticamente idênticos.

Nos dois casos, o código:

- percorria uma lista de domínios;
- removia espaços em branco;
- convertia o domínio para letras minúsculas;
- ignorava valores vazios;
- criava uma nova lista normalizada.

### Código anterior

```go
doms := make([]string, 0, len(set.DomainBlocklist))
for _, d := range set.DomainBlocklist {
	if d = strings.TrimSpace(strings.ToLower(d)); d != "" {
		doms = append(doms, d)
	}
}
set.DomainBlocklist = doms

doms = make([]string, 0, len(set.DomainAllowlist))
for _, d := range set.DomainAllowlist {
	if d = strings.TrimSpace(strings.ToLower(d)); d != "" {
		doms = append(doms, d)
	}
}
set.DomainAllowlist = doms
```

## 2.3 Consequências do problema

A duplicação aumentava o custo de manutenção. Caso a regra de normalização fosse alterada, seria necessário modificar os dois blocos.

Isso poderia gerar inconsistências, pois uma lista poderia ser atualizada enquanto a outra permanecesse com o comportamento antigo.

## 2.4 Solução aplicada

Foi aplicada a técnica de refatoração **Extract Function**.

A regra foi extraída para uma função reutilizável no pacote `internal/utils`.

### Função criada

Arquivo:

```text
internal/utils/utils.go
```

```go
// NormalizeDomains trims whitespace, converts domains to lowercase,
// and removes empty entries while preserving their original order.
func NormalizeDomains(domains []string) []string {
	normalized := make([]string, 0, len(domains))

	for _, domain := range domains {
		domain = strings.TrimSpace(strings.ToLower(domain))
		if domain != "" {
			normalized = append(normalized, domain)
		}
	}

	return normalized
}
```

### Código após a refatoração

```go
set.DomainBlocklist = utils.NormalizeDomains(set.DomainBlocklist)
set.DomainAllowlist = utils.NormalizeDomains(set.DomainAllowlist)
```

## 2.5 Justificativa técnica

A extração centralizou a regra de normalização em um único lugar.

A nova função:

- pode ser reutilizada;
- possui nome que expressa claramente sua responsabilidade;
- pode ser testada isoladamente;
- reduz o tamanho de `UpdateSettings`;
- evita alterações duplicadas no futuro.

## 2.6 Testes adicionados

Foram criados testes unitários em:

```text
internal/utils/utils_test.go
```

Os testes verificam:

- remoção de espaços;
- conversão para letras minúsculas;
- remoção de entradas vazias;
- preservação da ordem;
- tratamento de uma lista vazia.

## 2.7 Commit relacionado

```text
7c997207 refactor: extract domain normalization from settings update
```

---

# 3. Code Smell 2 — Long Method

## 3.1 Localização

Arquivo:

```text
cmd/settings.go
```

Método:

```go
func (a *App) UpdateSettings(c echo.Context) error
```

## 3.2 Problema identificado

`UpdateSettings` concentrava muitas responsabilidades diferentes em uma única função.

Entre as responsabilidades estavam:

- receber e converter os dados da requisição;
- recuperar as configurações atuais;
- validar servidores SMTP;
- preservar senhas antigas;
- normalizar nomes;
- validar bounce boxes;
- validar mensageiros;
- preservar chaves secretas;
- normalizar extensões;
- normalizar listas de domínios;
- validar URLs confiáveis;
- validar expressões cron;
- atualizar o banco;
- reiniciar a aplicação.

Essa concentração caracteriza o code smell **Long Method** e também indica uma violação do princípio da Responsabilidade Única.

## 3.3 Evidência quantitativa

Antes das refatorações, o `gocyclo` apresentou:

```text
55 main (*App).UpdateSettings cmd\settings.go:88:1
```

A função possuía complexidade ciclomática igual a **55**.

## 3.4 Trecho anterior — normalização de extensões

```go
for n, v := range set.UploadExtensions {
	set.UploadExtensions[n] = strings.ToLower(
		strings.TrimPrefix(strings.TrimSpace(v), "."),
	)
}
```

## 3.5 Trecho anterior — validação de URLs confiáveis

```go
urls := make([]string, 0, len(set.SecurityTrustedURLs))
for _, d := range set.SecurityTrustedURLs {
	if d = strings.TrimSpace(d); d != "" {
		if d == "*" {
			urls = append(urls, d)
			continue
		}

		u, err := url.Parse(d)
		if err != nil ||
			(u.Scheme != "http" && u.Scheme != "https") ||
			u.Host == "" {
			return echo.NewHTTPError(
				http.StatusBadRequest,
				a.i18n.Ts("globals.messages.invalidData")+
					": invalid trusted URL: "+d,
			)
		}

		urls = append(urls, d)
	}
}
set.SecurityTrustedURLs = urls
```

## 3.6 Solução aplicada

As regras de normalização e validação foram extraídas para funções puras no pacote `internal/utils`.

### Normalização de extensões

```go
// NormalizeFileExtensions trims whitespace, removes a leading dot,
// and converts file extensions to lowercase.
func NormalizeFileExtensions(extensions []string) []string {
	normalized := make([]string, len(extensions))

	for i, extension := range extensions {
		normalized[i] = strings.ToLower(
			strings.TrimPrefix(strings.TrimSpace(extension), "."),
		)
	}

	return normalized
}
```

### Normalização e validação de URLs confiáveis

```go
// NormalizeTrustedURLs trims whitespace, removes empty entries,
// and validates that each URL uses HTTP or HTTPS.
// The wildcard "*" is accepted as a trusted URL entry.
func NormalizeTrustedURLs(trustedURLs []string) ([]string, error) {
	normalized := make([]string, 0, len(trustedURLs))

	for _, trustedURL := range trustedURLs {
		trustedURL = strings.TrimSpace(trustedURL)
		if trustedURL == "" {
			continue
		}

		if trustedURL == "*" {
			normalized = append(normalized, trustedURL)
			continue
		}

		parsedURL, err := url.Parse(trustedURL)
		if err != nil ||
			(parsedURL.Scheme != "http" &&
				parsedURL.Scheme != "https") ||
			parsedURL.Host == "" {
			return nil, errors.New(
				"invalid trusted URL: " + trustedURL,
			)
		}

		normalized = append(normalized, trustedURL)
	}

	return normalized, nil
}
```

### Código após a refatoração

```go
set.UploadExtensions = utils.NormalizeFileExtensions(
	set.UploadExtensions,
)

trustedURLs, err := utils.NormalizeTrustedURLs(
	set.SecurityTrustedURLs,
)
if err != nil {
	return echo.NewHTTPError(
		http.StatusBadRequest,
		a.i18n.Ts("globals.messages.invalidData")+": "+err.Error(),
	)
}
set.SecurityTrustedURLs = trustedURLs
```

## 3.7 Resultado

Após as extrações, o `gocyclo` apresentou:

```text
44 main (*App).UpdateSettings cmd\settings.go:88:1
```

A complexidade caiu de **55 para 44**, uma redução de aproximadamente **20%**.

A função continua grande porque ainda possui outras responsabilidades, porém a refatoração realizada:

- reduziu seu tamanho;
- separou regras de negócio independentes;
- facilitou os testes;
- melhorou a legibilidade;
- criou funções reutilizáveis.

## 3.9 Testes adicionados

Os testes verificam:

- normalização de extensões;
- remoção do ponto inicial;
- conversão para letras minúsculas;
- remoção de espaços;
- aceitação do caractere curinga `*`;
- aceitação de URLs HTTP e HTTPS;
- rejeição de URLs sem protocolo;
- rejeição de protocolos não permitidos;
- rejeição de URLs sem host.

## 3.10 Commit relacionado

```text
aa2170bb refactor: extract settings normalization and validation
```

---

# 4. Code Smell 3 — Complex Conditional

## 4.1 Localização

Arquivo:

```text
cmd/bounce.go
```

Método:

```go
func (a *App) BounceWebhook(c echo.Context) error
```

## 4.2 Problema identificado

`BounceWebhook` possuía um grande `switch` responsável por selecionar e executar o processamento de diferentes provedores.

A mesma função tratava:

- webhook interno;
- Amazon SES;
- Azure Event Grid;
- SendGrid;
- Postmark;
- ForwardEmail;
- Lettermint.

Além de selecionar o provedor, a função também:

- lia o corpo da requisição;
- verificava cabeçalhos;
- validava assinaturas;
- processava inscrições;
- convertia respostas;
- tratava erros;
- registrava os bounces no banco.

Essa estrutura caracteriza os smells **Complex Conditional** e **Switch Statements**.

## 4.3 Evidência quantitativa

Antes da refatoração:

```text
37 main (*App).BounceWebhook cmd\bounce.go:124:1
```

A complexidade ciclomática era igual a **37**.

## 4.4 Estrutura anterior

A seleção do serviço era feita por um grande condicional semelhante a:

```go
switch true {
case service == "":
	// Webhook interno.

case service == "ses" && a.bounce.SES != nil:
	// Amazon SES.

case service == "azure" && a.bounce.Azure != nil:
	// Azure.

case service == "sendgrid" && a.bounce.Sendgrid != nil:
	// SendGrid.

case service == "postmark" && a.bounce.Postmark != nil:
	// Postmark.

case service == "forwardemail" &&
	a.bounce.Forwardemail != nil:
	// ForwardEmail.

case service == "lettermint" &&
	a.bounce.Lettermint != nil:
	// Lettermint.

default:
	return echo.NewHTTPError(
		http.StatusBadRequest,
		a.i18n.Ts("bounces.unknownService"),
	)
}
```

## 4.5 Solução aplicada

A lógica de cada provedor foi extraída para um processador específico.

Foi definido um tipo comum para os handlers:

```go
type bounceWebhookHandler func(
	echo.Context,
	[]byte,
) (bounceWebhookResult, error)
```

Também foi criado um resultado padronizado:

```go
type bounceWebhookResult struct {
	bounces     []models.Bounce
	response    []byte
	hasResponse bool
}
```

Os handlers são registrados em um mapa:

```go
func (a *App) bounceWebhookHandlers() map[string]bounceWebhookHandler {
	handlers := map[string]bounceWebhookHandler{
		"": a.processNativeBounceWebhook,
	}

	if a.bounce.SES != nil {
		handlers["ses"] = a.processSESBounceWebhook
	}
	if a.bounce.Azure != nil {
		handlers["azure"] = a.processAzureBounceWebhook
	}
	if a.bounce.Sendgrid != nil {
		handlers["sendgrid"] = a.processSendgridBounceWebhook
	}
	if a.bounce.Postmark != nil {
		handlers["postmark"] = a.processPostmarkBounceWebhook
	}
	if a.bounce.Forwardemail != nil {
		handlers["forwardemail"] =
			a.processForwardEmailBounceWebhook
	}
	if a.bounce.Lettermint != nil {
		handlers["lettermint"] =
			a.processLettermintBounceWebhook
	}

	return handlers
}
```

A seleção do processador ficou simples:

```go
handler, ok := a.bounceWebhookHandlers()[c.Param("service")]
if !ok {
	return echo.NewHTTPError(
		http.StatusBadRequest,
		a.i18n.Ts("bounces.unknownService"),
	)
}

result, err := handler(c, rawReq)
```

Cada provedor passou a possuir seu próprio método:

```text
processNativeBounceWebhook
processSESBounceWebhook
processAzureBounceWebhook
processSendgridBounceWebhook
processPostmarkBounceWebhook
processForwardEmailBounceWebhook
processLettermintBounceWebhook
```

## 4.6 Resultado

Após a refatoração:

```text
8 main (*App).BounceWebhook cmd\bounce.go:135:1
```

A complexidade caiu de **37 para 8**, uma redução de aproximadamente **78%**.

As funções específicas também ficaram pequenas:

```text
7  (*App).bounceWebhookHandlers
5  (*App).processAzureBounceWebhook
5  (*App).processSESBounceWebhook
5  (*App).processNativeBounceWebhook
2  (*App).processSendgridBounceWebhook
2  (*App).processPostmarkBounceWebhook
2  (*App).processForwardEmailBounceWebhook
2  (*App).processLettermintBounceWebhook
2  (*App).normalizeBounceWebhookError
```

## 4.8 Commit relacionado

```text
89d54d9e refactor: replace bounce webhook conditional with handlers
```

---

# 5. Padrão de Projeto 1 — Strategy

## 5.1 Nome

**Strategy**

## 5.2 Onde foi aplicado

O padrão foi aplicado na refatoração de:

```text
cmd/bounce.go
```

Cada provedor de webhook passou a possuir sua própria estratégia de processamento.

O contrato comum é representado por:

```go
type bounceWebhookHandler func(
	echo.Context,
	[]byte,
) (bounceWebhookResult, error)
```

As estratégias são registradas no método:

```go
func (a *App) bounceWebhookHandlers() map[string]bounceWebhookHandler
```

A estratégia correta é selecionada pelo nome do serviço:

```go
handler, ok := a.bounceWebhookHandlers()[c.Param("service")]
```

## 5.3 Justificativa

Os provedores possuem regras diferentes, mas todos precisam participar do mesmo fluxo geral de processamento de bounces.

O Strategy permite encapsular cada algoritmo de processamento separadamente.

Benefícios obtidos:

- remoção do grande `switch`;
- redução de complexidade;
- isolamento das regras de cada provedor;
- inclusão mais simples de novos provedores;
- melhoria da legibilidade;
- maior aderência ao princípio Open/Closed.

---

# 6. Padrão de Projeto 2 — Adapter

## 6.1 Nome

**Adapter**

## 6.2 Onde foi aplicado

O padrão foi aplicado em nível funcional nos métodos:

```text
processNativeBounceWebhook
processSESBounceWebhook
processAzureBounceWebhook
processSendgridBounceWebhook
processPostmarkBounceWebhook
processForwardEmailBounceWebhook
processLettermintBounceWebhook
```

Cada provedor possui uma interface diferente.

Exemplos:

- SES depende do cabeçalho `X-Amz-Sns-Message-Type`;
- Azure depende de `aeg-event-type`;
- SendGrid utiliza assinatura e timestamp;
- ForwardEmail utiliza `X-Webhook-Signature`;
- Lettermint utiliza `X-Lettermint-Signature`;
- alguns retornam um bounce;
- outros retornam vários;
- alguns podem retornar uma resposta imediata de validação.

Os métodos adaptadores convertem essas diferenças para o mesmo contrato:

```go
type bounceWebhookHandler func(
	echo.Context,
	[]byte,
) (bounceWebhookResult, error)
```

E para o mesmo resultado:

```go
type bounceWebhookResult struct {
	bounces     []models.Bounce
	response    []byte
	hasResponse bool
}
```

## 6.3 Justificativa

Sem os adaptadores, `BounceWebhook` precisava conhecer detalhes específicos de todos os serviços.

Após a refatoração, cada método adapta:

- cabeçalhos específicos;
- formatos de assinatura;
- parâmetros próprios;
- respostas do provedor;
- erros particulares;

para um formato padronizado compreendido pelo fluxo principal.

Benefícios obtidos:

- padronização da comunicação;
- menor acoplamento entre `BounceWebhook` e os provedores;
- encapsulamento das particularidades externas;
- maior facilidade para manutenção e evolução.

---

# 7. Validação das refatorações

Após todas as alterações, foram executados:

```bash
go test ./...
go vet ./...
staticcheck ./...
git diff --check
```

Os comandos terminaram sem erros.

Os testes unitários do pacote `internal/utils` também passaram:

```text
ok github.com/knadh/listmonk/internal/utils
```

---

# 8. Resumo dos resultados

| Code smell | Local | Solução | Resultado |
|---|---|---|---|
| Duplicate Code | `cmd/settings.go` | Extração de `NormalizeDomains` | Regra centralizada e testável |
| Long Method | `UpdateSettings` | Extração de normalizações e validações | Complexidade de 55 para 44 |
| Complex Conditional | `BounceWebhook` | Handlers separados por provedor | Complexidade de 37 para 8 |

| Padrão | Local | Finalidade |
|---|---|---|
| Strategy | `bounceWebhookHandlers` e processadores | Selecionar dinamicamente o processamento de cada provedor |
| Adapter | Métodos `process...BounceWebhook` | Padronizar interfaces e retornos diferentes |

---

# 9. Evidências

Os resultados do `gocyclo` estão armazenados em:

```text
documentacao/evidencias/complexidade-antes.txt
documentacao/evidencias/complexidade-apos-settings.txt
documentacao/evidencias/complexidade-final.txt
```

Esses arquivos demonstram quantitativamente a redução de complexidade obtida pelas refatorações.
