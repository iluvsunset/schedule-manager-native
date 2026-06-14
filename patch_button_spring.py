import re

with open("src/styles.css", "r") as f:
    content = f.read()

# find button active state
btn_css = r"""\.btn \{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var\(--space-2\);
  padding: 10px 18px;
  border: none;
  border-radius: 12px;
  font-family: var\(--font-family\);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 50ms ease, background 120ms ease, filter 120ms ease, opacity 120ms ease;"""

new_btn_css = """.btn {
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
  transition: transform 150ms cubic-bezier(0.25, 1.5, 0.5, 1), background 120ms ease, filter 120ms ease, opacity 120ms ease;"""

content = re.sub(btn_css, new_btn_css, content, flags=re.DOTALL)

with open("src/styles.css", "w") as f:
    f.write(content)
