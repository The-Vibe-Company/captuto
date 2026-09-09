# Connection and installation

Copy this entire `captuto` directory, including its scripts and references, into the agent's skills directory. For Claude Code use `~/.claude/skills/captuto`; for Codex use `~/.agents/skills/captuto`. Restart the agent session after installation.

Install Node.js 20+ and agent-browser using its official installation instructions at https://agent-browser.dev/installation. Run `agent-browser --help` to verify browser availability.

Open Captuto Settings, create a revocable API token, and configure the agent environment with:

```sh
export CAPTUTO_URL="https://your-captuto-host.example"
export CAPTUTO_API_TOKEN="<your-api-token>"
```

Use the MCP connection command supplied in Captuto Settings, or configure your MCP client with `${CAPTUTO_URL}/api/mcp` and an `Authorization: Bearer` header using `CAPTUTO_API_TOKEN`. Keep credentials in the environment or the client's secret configuration, outside capture files and tutorial content.

The helper calls the same MCP endpoint as the connected agent. Verify the connection by listing tutorials. Existing Mac and browser tokens work with this API.

Example capture sequence (resolve the helper path from the installed skill):

```sh
node <skill>/scripts/capture.mjs init --dir ./tutorial-capture --title "Invite a colleague" --session tutorial
agent-browser --session tutorial open https://your-app.example
agent-browser --session tutorial snapshot -i
node <skill>/scripts/capture.mjs capture --dir ./tutorial-capture --caption "Open team settings" --action click --target @e3
agent-browser --session tutorial click @e3
agent-browser --session tutorial snapshot -i
node <skill>/scripts/capture.mjs sync --dir ./tutorial-capture
```

The helper records screenshots and metadata; the agent authors and verifies the guide using MCP tools. No video codec, browser extension or native Captuto recorder is needed for web capture.
