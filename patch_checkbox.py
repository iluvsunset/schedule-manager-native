import re

with open("src/styles.css", "r") as f:
    content = f.read()

checkbox_css = """
/* ── Apple-Style Checkbox & Toggle ───────────────────────────── */
input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  position: relative;
  transition: background 150ms ease, border-color 150ms ease;
  padding: 0;
}

input[type="checkbox"]:checked {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  animation: checkBg 150ms ease-out forwards;
}

@keyframes checkBg {
  0% { transform: scale(0.9); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

input[type="checkbox"]::after {
  content: '';
  position: absolute;
  top: 45%;
  left: 50%;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: translate(-50%, -50%) rotate(45deg) scale(0);
  opacity: 0;
  transition: transform 150ms cubic-bezier(0.4, 0.0, 0.2, 1) 100ms, opacity 100ms ease 100ms;
}

input[type="checkbox"]:checked::after {
  transform: translate(-50%, -50%) rotate(45deg) scale(1);
  opacity: 1;
}

/* Toggles */
.toggle-switch {
  appearance: none;
  -webkit-appearance: none;
  width: 44px;
  height: 24px;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  outline: none;
  transition: background 200ms ease;
  border: none;
  padding: 0;
}

.toggle-switch::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 200ms cubic-bezier(0.25, 1.5, 0.5, 1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.toggle-switch:checked {
  background: var(--color-success);
}

.toggle-switch:checked::before {
  transform: translateX(20px);
}
"""

if "Apple-Style Checkbox & Toggle" not in content:
    content = content + "\n" + checkbox_css

with open("src/styles.css", "w") as f:
    f.write(content)
