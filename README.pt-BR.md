# Skills

Skills gratuitas e open-source para **desenvolvimento de componentes Vue.js/WeWeb** e **workflow git com Conventional Commits**.

Funcionam com qualquer assistente de IA que leia Markdown. Testadas com Claude Code, Codex, Gemini CLI, Antigravity, Kilo Code e OpenCode.

---

## O que tem aqui

### Skills

| Skill | O que faz |
|-------|-----------|
| [vue-weweb-dev](skills/vue-weweb-dev/SKILL.md) | Construir e modificar componentes Vue.js e elementos custom do WeWeb. Cobre padroes de arquitetura (feature-folders, service layer, hierarquia de estado), regras da plataforma WeWeb e o dual-script pattern. |
| [weweb-debug](skills/weweb-debug/SKILL.md) | Diagnosticar e corrigir componentes WeWeb que falham no build ou nao renderizam. Protocolo em quatro fases: dependencias primeiro, depois estrutura do componente, config e validacao de build. Inclui tabela de erros comuns. |
| [conventional-commits](skills/conventional-commits/SKILL.md) | Workflow git estruturado seguindo o padrao Conventional Commits. Tipos de commit, criacao de PRs via `gh` CLI, resolucao de conflitos, cherry-pick, bisect, worktrees, arqueologia de repositorio e limpeza de branches. |

### Bibliotecas de Referencia

| Biblioteca | O que cobre |
|------------|-------------|
| [vue-weweb-patterns.md](libraries/vue-weweb-patterns.md) | Padroes Vue 3 Composition API (composables, services, Pinia stores, estrutura de componentes) e referencia completa de componentes custom WeWeb (arquitetura da plataforma, ww-config.js, trigger events, dropzones, CSS variables, build/deploy). |
| [weweb-local-dev.md](libraries/weweb-local-dev.md) | Guia rapido para desenvolver componentes WeWeb localmente com Vite, sem fazer upload no editor WeWeb nas iteracoes iniciais. |

---

## Instalacao

Escolha sua ferramenta e siga os passos.

### Claude Code

Copie as pastas de skills para o seu projeto:

```bash
# Copiar skills individuais
cp -r skills/vue-weweb-dev/ .claude/skills/vue-weweb-dev/
cp -r skills/weweb-debug/ .claude/skills/weweb-debug/
cp -r skills/conventional-commits/ .claude/skills/conventional-commits/

# Copiar bibliotecas (referenciadas pelas skills)
mkdir -p libraries/
cp libraries/vue-weweb-patterns.md libraries/
cp libraries/weweb-local-dev.md libraries/
```

As skills ficam disponiveis como `/vue-weweb-dev`, `/weweb-debug`, `/conventional-commits`.

### Codex (OpenAI)

Concatene o conteudo das skills no seu `AGENTS.md`:

```bash
cat skills/vue-weweb-dev/SKILL.md >> AGENTS.md
cat skills/weweb-debug/SKILL.md >> AGENTS.md
cat skills/conventional-commits/SKILL.md >> AGENTS.md
```

### OpenCode

OpenCode le `.claude/skills/` nativamente. Siga as instrucoes do Claude Code acima, ou coloque os arquivos em `.opencode/skills/`.

### Gemini CLI

Copie as skills para o diretorio de instrucoes do Gemini:

```bash
mkdir -p .gemini/skills/
cp skills/*/SKILL.md .gemini/skills/
cp libraries/*.md .gemini/
```

### Antigravity

Concatene no seu arquivo de instrucoes:

```bash
cat skills/*/SKILL.md >> .antigravity/instructions.md
```

### Kilo Code

Copie as skills para o diretorio de regras:

```bash
mkdir -p .kilocode/rules/
cp skills/*/SKILL.md .kilocode/rules/
cp libraries/*.md .kilocode/
```

---

## Como as skills funcionam

Cada skill e um arquivo Markdown com frontmatter YAML opcional. O frontmatter contem metadados (nome, descricao, gatilhos) que ferramentas como Claude Code usam para ativacao automatica. Outras ferramentas ignoram o frontmatter e leem o corpo do Markdown como instrucoes.

O placeholder `$ARGUMENTS` em cada skill e substituido pelo que voce digitar apos o nome da skill. Em ferramentas que nao suportam isso, basta colar a descricao da tarefa onde `$ARGUMENTS` aparece.

As bibliotecas sao documentos de referencia que as skills apontam. Coloque-as junto com as skills para que os caminhos relativos funcionem.

---

## Licenca

MIT — use como quiser.
