# Integração GAS-Colab para NCA-SEM Educacional

Este projeto implementa uma arquitetura robusta para análise de dados educacionais utilizando a sinergia entre **Google Apps Script (GAS)** e **Google Colab (Python)**. O foco principal é a aplicação das metodologias **NCA (Necessary Condition Analysis)** e **SEM (Structural Equation Modeling)** para a gestão da educação básica.

## Estrutura do Projeto

O projeto é composto por:
- **1 Notebook Python (`notebook.py`)**: O motor de processamento estatístico.
- **43 componentes `.gs`**: backend, persistência, contratos e orquestração.
- **36 componentes `.html`**: interface responsiva e seus módulos funcionais.

## Configuração Inicial

1. **Google Sheets**: Crie uma nova planilha e anote o seu ID.
2. **Script Properties**: Configure `SPREADSHEETS_ID`. Em projetos vinculados a
   uma planilha, essa propriedade é opcional porque a planilha ativa é usada.
3. **GCP Project**: Vincule o script a um projeto padrão no Google Cloud Platform.
4. **Habilite APIs**: Ative a *Google Sheets API*, *Vertex AI API* e *Google Apps Script API*.
5. **Prepare a base**: Execute `EnvironmentSetup_initialize` uma vez ou abra o
   Web App. O setup idempotente cria as abas `DB_Educacional`, `DB_Escolas` e
   `DB_Professores`.
6. **Publique**: Implante como Web App e escolha quem pode acessar de acordo
   com a política da instituição.

## Integração da Aplicação

O Web App usa `google.script.run` para consumir uma fachada de backend com
respostas padronizadas. Ao abrir a aplicação, o GAS prepara as abas
de dados, carrega os indicadores e disponibiliza cadastro, edição, listagem e
arquivamento de escolas, professores e alunos sem recarregar a página.

Os alunos e professores são vinculados às escolas por identificador, enquanto
o nome institucional é mantido no registro para leitura e compatibilidade com
dados anteriores. Uma escola com vínculos ativos não pode ser arquivada.

### Preparação analítica

A navegação **Análises** apresenta um diagnóstico derivado do backend com:

- volume de alunos, escolas e professores ativos;
- cobertura das dimensões de desempenho, contexto, docência e infraestrutura;
- critérios operacionais de prontidão para NCA e SEM;
- prioridades para completar a base.

Esse diagnóstico não executa NCA ou SEM. Ele verifica se a base atingiu
limiares operacionais e mantém explícita a necessidade de validação
metodológica e estatística antes da execução dos modelos.

### Diagnóstico de maturidade do backend

A navegação **Maturidade backend** executa uma avaliação do código HEAD do
próprio projeto e apresenta:

- pontuação geral e nível de maturidade;
- aderência por implementação, arquitetura, segurança, confiabilidade, dados,
  observabilidade e entrega;
- plano priorizado por tamanho da lacuna;
- evidências por arquivo e linha, com busca e filtros.

Para a análise ao vivo, habilite a **Apps Script API** no projeto Google Cloud
vinculado e autorize os escopos declarados em `appsscript.json`. Se a API não
estiver disponível, a interface exibe o último snapshot local e informa a
configuração pendente.

### Diagnóstico de maturidade do frontend

A navegação **Maturidade frontend** avalia os arquivos HTML do projeto e
apresenta maturidade geral, índice de intuitividade, implementação real,
acessibilidade, responsividade, feedback, performance e qualidade de entrega.
As verificações incluem evidências por arquivo e linha, filtros e um plano de
evolução ordenado pelo tamanho da lacuna.

### Contrato frontend/backend

As funções públicas consumidas pela interface são:

- `ApiEndpoints_getBootstrap`
- `ApiEndpoints_listAlunos`
- `ApiEndpoints_getAluno`
- `ApiEndpoints_saveAluno`
- `ApiEndpoints_archiveAluno`
- `ApiEndpoints_listEscolas`
- `ApiEndpoints_saveEscola`
- `ApiEndpoints_archiveEscola`
- `ApiEndpoints_listProfessores`
- `ApiEndpoints_saveProfessor`
- `ApiEndpoints_archiveProfessor`
- `ApiEndpoints_getAnalysisOverview`
- `ApiEndpoints_getBackendMaturity`
- `ApiEndpoints_getFrontendMaturity`

Todas retornam `{ ok, data, error, meta }`. Erros de validação incluem detalhes
por campo, permitindo que o frontend destaque exatamente o dado inválido.

### Controle de acesso

O acesso principal deve ser configurado nas opções de publicação do Web App.
Opcionalmente, defina `ALLOWED_EMAILS` em Script Properties com uma lista de
e-mails separados por vírgula. Quando essa propriedade existe, todas as
operações do backend validam o usuário retornado por `Session.getActiveUser()`.

## Metodologia Analítica

- **NCA**: Identifica os "Must-Have" (condições necessárias/gargalos).
- **SEM**: Identifica os "Should-Have" (fatores aditivos de sucesso).

---
*Desenvolvido por Manus AI - Especialista em Cloud Scripting.*


---

## Mapeamento de Schema da Planilha (item 6 — pré-requisito para fixtures analíticos)

> **Status do catálogo AI:** vazio — o `SchemaService` expõe entidades escolares genéricas (Alunos, Escolas, Professores) mas sem fixtures analíticos do domínio NCA-SEM.

### Abas declaradas no SchemaService

| Aba (sheetName) | Entidade | Tipo | Colunas |
|---|---|---|---|
| `Usuarios` | — (login real) | Autenticação | `ID`, `Username`, `Password`, `Role`, `Nome`, `Email`, `Status` |
| `Users` | USERS | Autenticação (baseline) | `ID`, `Name`, `Email`, `Username`, `PasswordHash`, `Role`, `Status`, `LastLoginAt`, `CreatedAt`, `UpdatedAt` |
| `User` | USER | Autenticação (CRUD) | `ID`, `Name`, `Email`, `Username`, `PasswordHash`, `Role`, `Status`, `LastLoginAt`, `CreatedAt`, `UpdatedAt` |
| `Alunos` | ALUNOS | **Domínio (genérico)** | `ID`, `Name`, `Email`, `Phone`, `Class`, `GuardianName`, `GuardianPhone`, `Status`, `CreatedAt`, `UpdatedAt` |
| `Escolas` | ESCOLAS | Domínio (genérico) | `ID`, `Name`, `Code`, `Address`, `City`, `State`, `Status`, `CreatedAt`, `UpdatedAt` |
| `Professores` | PROFESSORES | Domínio (genérico) | `ID`, `Name`, `Email`, `Phone`, `Subject`, `Status`, `CreatedAt`, `UpdatedAt` |
| `DB_Educacional` | NAME | Domínio (genérico) | `ID`, `Name`, `Description`, `Status`, `CreatedAt`, `UpdatedAt` |
| `Settings` | SETTINGS | Configuração/Infra | `Key`, `Value`, `Description`, `Scope`, `UpdatedAt`, `UpdatedBy` |
| `Audit_Logs` | AUDIT_LOGS | Infraestrutura | `ID`, `Timestamp`, `Level`, `Action`, `Entity`, `RecordID`, `UserID`, `Message`, `Details`, `CreatedAt` |

### Semântica das colunas de domínio

As entidades `Alunos`, `Escolas`, `Professores` e `DB_Educacional` têm colunas de caráter **genérico/cadastral** — não representam as entidades analíticas específicas do método NCA-SEM (Necessary Condition Analysis + Structural Equation Modeling). O domínio analítico real do projeto envolve:

- **Variáveis latentes** e **indicadores observáveis** do modelo SEM
- **Condições necessárias** e limiares do NCA
- **Respostas a instrumentos de medição** (questionários, escalas)
- **Resultados de análise de trajetórias** (path analysis)

Nenhuma dessas entidades está declarada no schema atual.

### Entidades pendentes de mapeamento analítico

| Entidade esperada | Por que ausente | O que precisa ser feito |
|---|---|---|
| Respostas a instrumentos | Não declarada | Identificar abas reais da planilha NCA-SEM e mapear |
| Variáveis / Constructos | Não declarada | Declarar entidade com constructo, indicadores, tipo (latente/observável) |
| Resultados NCA | Não declarada | Declarar entidade com condição, limiar (`ceiling`), tamanho do efeito |
| Coeficientes SEM | Não declarada | Declarar entidade com trajetória, coeficiente, p-valor |

> **Ação necessária para o item 6:** As entidades escolares (`Alunos`, `Escolas`) são cadastros genéricos — não são as entidades analíticas do NCA-SEM. Declarar as entidades do modelo estatístico real antes de criar fixtures.

> **Nota:** Há três abas de autenticação (`Usuarios`, `Users`, `User`) — consolidar em uma antes de prosseguir.
