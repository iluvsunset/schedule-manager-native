import re

with open("src/styles.css", "r") as f:
    content = f.read()

apple_root = """:root {
  /* Apple Design System - Light & Dark Modes via CSS Variables */
  color-scheme: light dark;
  
  /* Brand Colors - iOS Blue */
  --brand-primary: #007AFF;
  --brand-primary-hover: #0056b3;
  --brand-gradient: linear-gradient(135deg, #007AFF 0%, #34C759 100%);
  --brand-gradient-hover: linear-gradient(135deg, #0056b3 0%, #28a745 100%);
  
  /* Surfaces (Apple Glassmorphism) */
  --bg-root: #000000;
  --bg-primary: #1C1C1E;
  --bg-card: rgba(255, 255, 255, 0.1);
  --bg-card-hover: rgba(255, 255, 255, 0.15);
  --bg-input: rgba(255, 255, 255, 0.08);
  --bg-input-focus: rgba(255, 255, 255, 0.12);
  --bg-overlay: rgba(0, 0, 0, 0.4);
  
  /* Borders (Hairlines) */
  --border-default: rgba(255, 255, 255, 0.15);
  --border-hover: rgba(255, 255, 255, 0.25);
  --border-focus: #007AFF;
  --border-subtle: rgba(255, 255, 255, 0.05);
  
  /* Text Colors */
  --text-primary: #FFFFFF;
  --text-secondary: rgba(235, 235, 245, 0.6);
  --text-tertiary: rgba(235, 235, 245, 0.3);
  --text-inverse: #000000;
  
  /* System Colors */
  --color-success: #34C759;
  --color-success-light: rgba(52, 199, 89, 0.15);
  --color-error: #FF3B30;
  --color-error-light: rgba(255, 59, 48, 0.15);
  --color-warning: #FF9500;
  --color-warning-light: rgba(255, 149, 0, 0.15);
  --color-info: #5AC8FA;
  --color-info-light: rgba(90, 200, 250, 0.15);
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* Strict Radii (Apple standard) */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;
  
  /* Typography System (SF Pro is configured) */
  --font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  --font-mono: 'SF Mono', ui-monospace, Menlo, Monaco, monospace;
  
  /* Hardware Accelerated Motion Rules */
  --ease-apple-out: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-apple-in: cubic-bezier(0.5, 0, 0.75, 0);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  
  /* Layout constraints */
  --sidebar-width: 280px;
  --topbar-height: 60px;
}"""

content = re.sub(r":root \{.*?\n\}", apple_root, content, flags=re.DOTALL)

with open("src/styles.css", "w") as f:
    f.write(content)

print("Root variables updated.")
