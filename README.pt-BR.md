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

Os blocos abaixo rodam da raiz do repositorio clonado. Cada um le o destino de uma variavel que voce define antes: `T` para um diretorio de projeto, `OUT` para um arquivo de instrucoes unico.

Toda ferramenta com diretorio de skills recebe a pasta inteira da skill, com as bibliotecas ao lado de `skills/`. Uma skill que aponta para `../../libraries/<arquivo>.md` resolve para `<ide>/libraries/<arquivo>.md`.

| IDE | Diretorio de skills | Diretorio de bibliotecas | Fonte do caminho |
|-----|---------------------|--------------------------|------------------|
| Claude Code | `.claude/skills/<slug>/` | `.claude/libraries/` | docs.claude.com (skills) |
| Codex, Antigravity, Gemini CLI | `.agents/skills/<slug>/` | `.agents/libraries/` | IDE adapter reference |
| OpenCode | `.opencode/skills/<slug>/` | `.opencode/libraries/` | IDE adapter reference |
| Outras ferramentas | corpo anexado a um arquivo de instrucoes | anexadas ao mesmo arquivo | nao ha caminho documentado |

### Claude Code

<!-- install:claude -->
```bash
: "${T:?set T to your project path}"
mkdir -p "$T/.claude/skills" "$T/.claude/libraries"
cp -r skills/* "$T/.claude/skills/"
cp libraries/*.md "$T/.claude/libraries/"
```

As skills ficam disponiveis como `/vue-weweb-dev`, `/weweb-debug`, `/conventional-commits`, `/ai-writing-patterns`, `/ai-code-vices` e `/ai-agent-vices`.

### Codex, Antigravity e Gemini CLI

<!-- install:agents -->
```bash
: "${T:?set T to your project path}"
mkdir -p "$T/.agents/skills" "$T/.agents/libraries"
cp -r skills/* "$T/.agents/skills/"
cp libraries/*.md "$T/.agents/libraries/"
```

### OpenCode

<!-- install:opencode -->
```bash
: "${T:?set T to your project path}"
mkdir -p "$T/.opencode/skills" "$T/.opencode/libraries"
cp -r skills/* "$T/.opencode/skills/"
cp libraries/*.md "$T/.opencode/libraries/"
```

### Outras ferramentas

Para uma ferramenta sem diretorio de skills, anexe o corpo das skills a um arquivo de instrucoes unico. O bloco remove o frontmatter e substitui o placeholder `$ARGUMENTS`.

<!-- install:other -->
```bash
: "${OUT:?set OUT to your instructions file}"
for s in skills/*/SKILL.md; do
  awk 'NR==1 && /^---$/ {fm=1; next} fm && /^---$/ {fm=0; next} !fm' "$s" \
    | sed 's/\$ARGUMENTS/(describe your task here)/g' >> "$OUT"
done
cat libraries/*.md >> "$OUT"
```

---

## Como as skills funcionam

Cada skill e um arquivo Markdown com frontmatter YAML opcional. O frontmatter contem metadados (nome, descricao, gatilhos) que ferramentas como Claude Code usam para ativacao automatica. Outras ferramentas ignoram o frontmatter e leem o corpo do Markdown como instrucoes.

O placeholder `$ARGUMENTS` em cada skill e substituido pelo que voce digitar apos o nome da skill. Em ferramentas que nao suportam isso, basta colar a descricao da tarefa onde `$ARGUMENTS` aparece.

As bibliotecas sao documentos de referencia que as skills apontam. Coloque-as junto com as skills para que os caminhos relativos funcionem.

---

## Licenca

MIT — use como quiser.
