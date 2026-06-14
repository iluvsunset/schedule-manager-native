import re

with open("src/styles.css", "r") as f:
    content = f.read()

# Replace the input, textarea, select rules
input_repl = """input, textarea, select {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: var(--font-family);
  font-size: 15px;
  transition: all 150ms var(--ease-apple-out);
  outline: none;
  appearance: none;
}
input:focus, textarea:focus, select:focus {
  border-color: #007AFF;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.35);
}"""

content = re.sub(
    r"input,\s*textarea,\s*select\s*\{.*?\ninput:focus,\s*textarea:focus,\s*select:focus\s*\{.*?\}",
    input_repl,
    content,
    flags=re.DOTALL
)

# Buttons replace
btn_repl = """.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: 10px 18px;
  border: none;
  border-radius: 12px;
  font-family: var(--font-family);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 50ms ease, background 120ms ease, filter 120ms ease, opacity 120ms ease;
  white-space: nowrap;
  line-height: 1.4;
  appearance: none;
  -webkit-appearance: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 2px 5px rgba(0,0,0,0.2);
}

.btn:active {
  transform: scale(0.97);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: #007AFF;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}
.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.btn-danger {
  background: #FF3B30;
  color: white;
}
.btn-danger:hover:not(:disabled) {
  filter: brightness(1.1);
}
"""

content = re.sub(r"\.btn\s*\{.*?(?=\.btn-icon|\.btn-google)", btn_repl, content, flags=re.DOTALL)

with open("src/styles.css", "w") as f:
    f.write(content)
