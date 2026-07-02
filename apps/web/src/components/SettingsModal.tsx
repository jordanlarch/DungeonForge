import { setAnthropicApiKey, getAnthropicApiKey } from "@dungeonforge/narrative";
import { useState } from "react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState(getAnthropicApiKey() ?? "");

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <p>Anthropic API key (stored in browser localStorage only — never sent to our servers).</p>
        <input
          type="password"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="sk-ant-..."
        />
        <div className="modal-actions">
          <button type="button" onClick={() => { setAnthropicApiKey(apiKeyInput); onClose(); }}>Save</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
        <p className="warn">If you shared your key in chat, rotate it at console.anthropic.com.</p>
      </div>
    </div>
  );
}
