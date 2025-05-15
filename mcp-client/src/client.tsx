import { useAgent } from "agents/react";
import { createRoot } from "react-dom/client";
import { useMemo, useRef, useState } from "react";
import "./styles.css";
import type { State } from "./server";
import { agentFetch } from "agents/client";

let sessionId = localStorage.getItem("sessionId");
if (!sessionId) {
  sessionId = crypto.randomUUID();
  localStorage.setItem("sessionId", sessionId);
}
// TODO: clear sessionId on logout

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const mcpInputRef = useRef<HTMLInputElement>(null);
  const [mcpState, setMcpState] = useState<State>({
    servers: {},
    tools: [],
    prompts: [],
    resources: [],
  });

  const agent = useAgent({
    agent: "my-agent",
    name: sessionId!,
    onOpen: () => setIsConnected(true),
    onClose: () => setIsConnected(false),
    onStateUpdate: (state: State) => {
      setMcpState(state);
    },
  });

  function openPopup(authUrl: string) {
    window.open(
      authUrl,
      "popupWindow",
      "width=600,height=800,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no,status=yes"
    );
  }

  const handleMcpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mcpInputRef.current || !mcpInputRef.current.value.trim()) return;

    const serverUrl = mcpInputRef.current.value;
    const response = await agentFetch(
      {
        host: agent.host,
        agent: "my-agent",
        name: sessionId!,
        path: "add-mcp",
      },
      {
        method: "POST",
        body: JSON.stringify({ url: serverUrl }),
      }
    );

    // Try to parse the response as JSON (if backend returns JSON)
    let authUrl = "";
    try {
      const data = await response.json();
      if (typeof data === "string") {
        authUrl = data;
      } else if (
        typeof data === "object" &&
        data !== null &&
        "authUrl" in data &&
        typeof data.authUrl === "string"
      ) {
        authUrl = data.authUrl;
      }
    } catch {
      // fallback: try to read as text
      authUrl = await response.text();
    }

    if (authUrl && authUrl.startsWith("http")) {
      openPopup(authUrl);
    }

    setMcpState({
      ...mcpState,
      servers: {
        ...mcpState.servers,
        placeholder: {
          url: serverUrl,
          state: "connecting",
        },
      },
    });
  };

  return (
    <div className="container">
      <div className="status-indicator">
        <div className={`status-dot ${isConnected ? "connected" : ""}`} />
        {isConnected ? "Connected to server" : "Disconnected"}
      </div>

      <div className="mcp-servers">
        <form className="mcp-form" onSubmit={handleMcpSubmit}>
          <input
            type="text"
            ref={mcpInputRef}
            className="mcp-input"
            placeholder="MCP Server URL"
          />
          <button type="submit">Add MCP Server</button>
        </form>
      </div>

      <div className="mcp-section">
        <h2>MCP Servers</h2>
        {Object.entries(mcpState.servers).map(([id, server]) => (
          <div key={id} className={"mcp-server"}>
            <div>
              <div>URL: {server.url}</div>
              <div className="status-indicator">
                <div
                  className={`status-dot ${
                    server.state === "ready" ? "connected" : ""
                  }`}
                />
                {server.state} (id: {id})
              </div>
            </div>
            {server.state === "authenticating" && server.authUrl && (
              <button
                type="button"
                onClick={() => openPopup(server.authUrl as string)}
              >
                Authorize
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="messages-section">
        <h2>Server Data</h2>
        <h3>Tools</h3>
        {mcpState.tools.map((tool: any) => (
          <div key={`${tool.name}-${tool.serverId}`}>
            <b>{tool.name}</b>
            <pre className="code">{JSON.stringify(tool, null, 2)}</pre>
          </div>
        ))}

        <h3>Prompts</h3>
        {mcpState.prompts.map((prompt: any) => (
          <div key={`${prompt.name}-${prompt.serverId}`}>
            <b>{prompt.name}</b>
            <pre className="code">{JSON.stringify(prompt, null, 2)}</pre>
          </div>
        ))}

        <h3>Resources</h3>
        {mcpState.resources.map((resource: any) => (
          <div key={`${resource.name}-${resource.serverId}`}>
            <b>{resource.name}</b>
            <pre className="code">{JSON.stringify(resource, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
