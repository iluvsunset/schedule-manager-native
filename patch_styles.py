import re

with open("src/styles.css", "r") as f:
    content = f.read()

# Replace font family in :root
content = re.sub(
    r"--font-family: [^;]+;",
    r"--font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;",
    content
)

# Replace scrollbar styles
old_scrollbar = r"""::-webkit-scrollbar \{
  width: 6px;
  height: 6px;
\}
::-webkit-scrollbar-track \{
  background: transparent;
\}
::-webkit-scrollbar-thumb \{
  background: rgba\(255, 255, 255, 0\.08\);
  border-radius: var\(--radius-full\);
\}
@media \(hover: hover\) \{
  ::-webkit-scrollbar-thumb:hover \{
  background: rgba\(255, 255, 255, 0\.16\);
\}
\}"""

new_scrollbar = """::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: var(--radius-full);
  transition: background 1s ease;
}
*:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
}"""
content = re.sub(old_scrollbar, new_scrollbar, content)

# Inject utility classes
utility_classes = """

/* ── Apple-Style Typography ──────────────────────────────────── */
.text-page-title {
  font-family: var(--font-family);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}
.text-section-title {
  font-family: var(--font-family);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.3;
}
.text-body {
  font-family: var(--font-family);
  font-size: 15px;
  font-weight: 400;
  line-height: 1.5;
}
.text-caption {
  font-family: var(--font-family);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  opacity: 0.5;
}

/* ── Apple-Style Surfaces & Materials ───────────────────────── */
.frosted-glass {
  background: rgba(30, 30, 30, 0.4);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
}
.hairline-border {
  border: 0.5px solid rgba(255, 255, 255, 0.1);
}

/* ── Motion Engine Rules ────────────────────────────────────── */
* {
  @media (prefers-reduced-motion: reduce) {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
.hw-accelerate {
  transform: translateZ(0);
  will-change: transform, opacity;
}

/* ── Page/Tab Routing Transitions ────────────────────────────── */
.route-exit {
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 150ms ease, transform 150ms ease;
}
.route-enter {
  opacity: 0;
  transform: translateY(10px);
  animation: routeEnterAnim 220ms ease 150ms forwards;
}
@keyframes routeEnterAnim {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── App Initialization Sequence ─────────────────────────────── */
.app-init .sidebar-item {
  opacity: 0;
  transform: translateX(-20px);
}
.app-init-loaded .sidebar-item {
  animation: sidebarInitAnim 300ms ease forwards;
}
@keyframes sidebarInitAnim {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
/* Staggering sidebar items: needs inline style delay or nth-child logic */

/* ── Modal & Panel Lifecycle Controller ──────────────────────── */
.modal-overlay {
  opacity: 0;
  backdrop-filter: blur(0px);
  transition: opacity 200ms ease, backdrop-filter 200ms ease;
}
.modal-overlay.open {
  opacity: 1;
  backdrop-filter: blur(10px);
}
.modal-content {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 180ms ease, transform 180ms ease;
}
.modal-content.open {
  opacity: 1;
  transform: scale(1);
  transition: opacity 320ms ease, transform 320ms ease;
}

"""

# Insert utility classes after :root block
content = content.replace("/* ── Reset & Base Styles ─────────────────────────────────────── */", utility_classes + "\n/* ── Reset & Base Styles ─────────────────────────────────────── */")

with open("src/styles.css", "w") as f:
    f.write(content)
