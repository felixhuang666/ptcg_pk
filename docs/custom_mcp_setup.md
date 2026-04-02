# How to Connect to a Custom MCP Server

To connect your customized MCP (Model Context Protocol) server, the setup process depends on which client you are using to interact with the LLM. Here are the instructions for the most common clients:

## 1. Claude Desktop
You need to add your MCP server to your `claude_desktop_config.json` file.
- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add your server configuration like this:
```json
{
  "mcpServers": {
    "my-custom-mcp": {
      "command": "node", // or "python", "docker", etc.
      "args": ["/path/to/your/custom/mcp/server.js"],
      "env": {
        "MY_API_KEY": "your_key_here"
      }
    }
  }
}
```
After saving the file, **restart Claude Desktop**. Your custom tools should now appear in the interface.

## 2. Cursor IDE
In Cursor, you can configure MCP servers directly in the settings:
1. Open **Cursor Settings** (gear icon or `Cmd/Ctrl + ,`).
2. Go to **Features** -> **MCP**.
3. Click **+ Add new MCP server**.
4. Choose the type (`command` or `sse`).
5. Enter the name and the command (e.g., `node /path/to/server.js`) or the SSE URL.
6. Click **Save** and wait for Cursor to connect to it (you should see a green dot indicating it's connected).

## 3. VS Code (via extensions like Roo Code / Cline)
If you are using an extension that supports MCP:
1. Open the extension's MCP configuration settings (usually a button or command palette option).
2. Similar to Claude Desktop, you typically edit a JSON configuration file specifying the `command` and `args` to start your MCP server.
