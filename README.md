# Skills

Free, open-source AI coding skills for **Vue.js/WeWeb component development** and **git workflow with Conventional Commits**.

These skills work with any AI coding assistant that reads Markdown instructions. Tested with Claude Code, Codex, Gemini CLI, Antigravity, Kilo Code, and OpenCode.

---

## What's Inside

### Skills

| Skill | What it does |
|-------|-------------|
| [vue-weweb-dev](skills/vue-weweb-dev/SKILL.md) | Build and modify Vue.js components and WeWeb custom elements. Covers architecture patterns (feature-folders, service layer, state hierarchy), WeWeb platform rules, and the dual-script pattern. |
| [weweb-debug](skills/weweb-debug/SKILL.md) | Diagnose and fix WeWeb components that fail to build or render. Four-phase protocol: dependencies first, then component structure, config, and build validation. Includes a common errors reference table. |
| [conventional-commits](skills/conventional-commits/SKILL.md) | Structured git workflow following the Conventional Commits standard. Commit types, PR creation via `gh` CLI, conflict resolution, cherry-pick, bisect, worktrees, repo archaeology, and branch cleanup. |

### Reference Libraries

| Library | What it covers |
|---------|---------------|
| [vue-weweb-patterns.md](libraries/vue-weweb-patterns.md) | Vue 3 Composition API patterns (composables, services, Pinia stores, component structure) and WeWeb custom component reference (platform architecture, ww-config.js, trigger events, dropzones, CSS variables, build/deploy). |
| [weweb-local-dev.md](libraries/weweb-local-dev.md) | Quick guide for developing WeWeb components locally with Vite, without uploading to the WeWeb editor during early iterations. |

---

## Installation

Pick your tool and follow the steps.

### Claude Code

Copy the skill folders into your project:

```bash
# Copy individual skills
cp -r skills/vue-weweb-dev/ .claude/skills/vue-weweb-dev/
cp -r skills/weweb-debug/ .claude/skills/weweb-debug/
cp -r skills/conventional-commits/ .claude/skills/conventional-commits/

# Copy libraries (referenced by skills)
mkdir -p libraries/
cp libraries/vue-weweb-patterns.md libraries/
cp libraries/weweb-local-dev.md libraries/
```

Skills become available as `/vue-weweb-dev`, `/weweb-debug`, `/conventional-commits`.

### Codex (OpenAI)

Append the skill content to your `AGENTS.md`:

```bash
cat skills/vue-weweb-dev/SKILL.md >> AGENTS.md
cat skills/weweb-debug/SKILL.md >> AGENTS.md
cat skills/conventional-commits/SKILL.md >> AGENTS.md
```

### OpenCode

OpenCode reads `.claude/skills/` natively. Follow the Claude Code instructions above, or place files in `.opencode/skills/`.

### Gemini CLI

Copy skills to your Gemini instructions directory:

```bash
mkdir -p .gemini/skills/
cp skills/*/SKILL.md .gemini/skills/
cp libraries/*.md .gemini/
```

### Antigravity

Append to your instructions file:

```bash
cat skills/*/SKILL.md >> .antigravity/instructions.md
```

### Kilo Code

Copy skills to your rules directory:

```bash
mkdir -p .kilocode/rules/
cp skills/*/SKILL.md .kilocode/rules/
cp libraries/*.md .kilocode/
```

---

## How Skills Work

Each skill is a Markdown file with optional YAML frontmatter. The frontmatter contains metadata (name, description, triggers) that tools like Claude Code use for automatic activation. Other tools ignore the frontmatter and read the Markdown body as plain instructions.

The `$ARGUMENTS` placeholder in each skill gets replaced with whatever you type after the skill name. For tools that don't support this, just paste your task description where `$ARGUMENTS` appears.

Libraries are reference documents that skills point to. Place them alongside the skills so the relative paths resolve correctly.

---

## License

MIT — use however you want.
