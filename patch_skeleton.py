import re

with open("src/pages/Dashboard.jsx", "r") as f:
    content = f.read()

# Add Skeleton Loader CSS to styles.css
skeleton_css = """
/* ── Skeleton Shimmer ────────────────────────────────────────── */
.skeleton-shimmer {
  background: rgba(255, 255, 255, 0.05);
  background-image: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.05) 20%,
    rgba(255, 255, 255, 0.1) 60%,
    rgba(255, 255, 255, 0)
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
"""

with open("src/styles.css", "a") as f:
    f.write(skeleton_css)


skeleton_component = """
              <div className="skeleton-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton-shimmer" style={{ height: '120px', width: '100%', borderRadius: '16px' }}></div>
                <div className="skeleton-shimmer" style={{ height: '80px', width: '100%', borderRadius: '16px' }}></div>
                <div className="skeleton-shimmer" style={{ height: '80px', width: '100%', borderRadius: '16px' }}></div>
                <div className="skeleton-shimmer" style={{ height: '80px', width: '100%', borderRadius: '16px' }}></div>
              </div>
"""

content = re.sub(
    r"<div style=\{\{ padding: 40, textAlign: 'center', color: 'var\(--text-secondary\)' \}\}>\s*Loading schedules\.\.\.\s*</div>",
    skeleton_component,
    content
)

with open("src/pages/Dashboard.jsx", "w") as f:
    f.write(content)

