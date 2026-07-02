import { useState } from "react";
import { parseGameIntent, intentSupported, DEFAULT_CAPABILITIES } from "@dungeonforge/narrative";

export interface ChatMessage {
  role: "user" | "dm" | "system";
  text: string;
}

interface DmChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function DmChat({ messages, onSend }: DmChatProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="dm-chat panel">
      <h3>DM Chat</h3>
      <div className="chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <strong>{m.role === "user" ? "You" : m.role === "dm" ? "DM" : "System"}</strong>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try "move north" or "attack goblin"'
        />
        <button type="submit">Send</button>
      </form>
      <p className="muted chat-hint">
        Engine resolves move/attack when supported; DM narrates the rest.
      </p>
    </div>
  );
}

export function buildDmReply(userText: string): { reply: string; intentHandled: boolean } {
  const intent = parseGameIntent(userText);
  if (intentSupported(intent, DEFAULT_CAPABILITIES)) {
    return {
      reply: `Understood — I'll resolve that via the rules engine (${intent.type}).`,
      intentHandled: true,
    };
  }
  return {
    reply: `The DM considers your words: "${userText}" — rules for this aren't automated yet, so I'll narrate the outcome.`,
    intentHandled: false,
  };
}
