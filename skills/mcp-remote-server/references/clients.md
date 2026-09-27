# AI Client Configuration and Compatibility Guide

This reference provides client configurations and verification procedures for integrating remote MCP servers across different developer and AI interfaces.

---

## 1. The Three Levels of Proof

When verifying an MCP server connection with an AI client, always follow the 3 levels standard:
1. **Level 1 (Config accepted)**: The client parses the configuration JSON without syntax or schema errors.
2. **Level 2 (Connected)**: The client successfully performs the discovery handshake (`server/discover` or `initialize`) and lists tools.
3. **Level 3 (Tool called)**: The client successfully invokes at least one tool, returning the expected output, and a matching row appears in `mcp_request_log`.

Only Level 3 counts as an authentic verification of end-to-end functionality.

---

## 2. Secrets and Environment Variables

Never store plaintext credentials, API tokens, or PATs in versioned configuration files (such as `.mcp.json` or committed agent manifests). Always reference secrets through an environment variable.

---

## 3. Client Configuration Snippets

### Claude Code
Configured in `.mcp.json`:
```json
{
  "mcpServers": {
    "my-server": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${MCP_TOKEN}"
      }
    }
  }
}
```

### claude.ai (Web)
Add a remote MCP server integration in Account Settings -> Integrations -> MCP.
Supports OAuth 2.1 authorization code flow or direct Worker endpoints with `workers-oauth-provider`.

### ChatGPT
In Custom GPT Actions or developer settings, add an action pointing to the remote MCP URL or OpenAPI/MCP proxy endpoint.

### Codex
Configured in `.codex/config.json`:
```json
{
  "mcp_servers": {
    "my_server": {
      "url": "https://mcp.example.com/mcp",
      "bearer_token_env_var": "MCP_TOKEN"
    }
  }
}
```

### opencode
Configured in `.opencode/mcp.json` (specify `oauth: false` when using static tokens):
```json
{
  "servers": {
    "my-server": {
      "endpoint": "https://mcp.example.com/mcp",
      "oauth": false,
      "token": "${MCP_TOKEN}"
    }
  }
}
```

### Gemini CLI
Configured in `settings.json`:
```json
{
  "mcp": {
    "my-server": {
      "httpUrl": "https://mcp.example.com/mcp",
      "tokenEnv": "MCP_TOKEN"
    }
  }
}
```

### Antigravity
Configured in `.antigravity/mcp.json`:
```json
{
  "servers": {
    "remote-mcp": {
      "serverUrl": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${MCP_TOKEN}"
      }
    }
  }
}
```
