import re

with open("src/styles.css", "r") as f:
    content = f.read()

# Replace box-shadow globally with standard ones where appropriate or remove heavy ones
content = re.sub(r"box-shadow:\s*var\(--shadow-lg\),?\s*var\(--shadow-glow\)?;?", r"box-shadow: 0 4px 24px rgba(0,0,0,0.4);", content)

# Make modal-content Apple-style
modal_content_orig = r"\.modal-content\s*\{[^\}]*\}"
modal_content_new = """.modal-content {
  background: rgba(28, 28, 30, 0.75);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  border: 0.5px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}"""
if re.search(modal_content_orig, content):
    content = re.sub(modal_content_orig, modal_content_new, content)

# Make topbar and sidebar Apple-style frosted glass
topbar_orig = r"\.topbar\s*\{([^\}]*)\}"
def repl_topbar(m):
    inner = m.group(1)
    inner = re.sub(r"background:.*?;", "background: rgba(28, 28, 30, 0.65);", inner)
    inner = re.sub(r"backdrop-filter:.*?;", "backdrop-filter: blur(40px) saturate(180%);", inner)
    inner = re.sub(r"-webkit-backdrop-filter:.*?;", "-webkit-backdrop-filter: blur(40px) saturate(180%);", inner)
    inner = re.sub(r"border-bottom:.*?;", "border-bottom: 0.5px solid rgba(255, 255, 255, 0.1);", inner)
    return ".topbar {" + inner + "}"
content = re.sub(topbar_orig, repl_topbar, content)

sidebar_orig = r"\.sidebar\s*\{([^\}]*)\}"
def repl_sidebar(m):
    inner = m.group(1)
    inner = re.sub(r"background:.*?;", "background: rgba(28, 28, 30, 0.4);", inner)
    inner = re.sub(r"border-right:.*?;", "border-right: 0.5px solid rgba(255, 255, 255, 0.1);", inner)
    return ".sidebar {" + inner + "}"
content = re.sub(sidebar_orig, repl_sidebar, content)

# Update forms to be Apple-style
input_orig = r"input,\s*textarea,\s*select\s*\{([^\}]*)\}"
def repl_input(m):
    inner = m.group(1)
    inner = re.sub(r"border:.*?;", "border: 0.5px solid rgba(255, 255, 255, 0.1);", inner)
    inner = re.sub(r"background:.*?;", "background: rgba(255, 255, 255, 0.05);", inner)
    inner = re.sub(r"border-radius:.*?;", "border-radius: var(--radius-sm);", inner)
    return "input, textarea, select {" + inner + "}"
content = re.sub(input_orig, repl_input, content)

with open("src/styles.css", "w") as f:
    f.write(content)
