import re

with open("src/components/dashboard/Modals.jsx", "r") as f:
    code = f.read()

# Add the ModalWrapper code at the top
wrapper_code = """
import { useState, useEffect } from 'react';
function ModalWrapper({ isOpen, onClose, children, maxWidth = '500px' }) {
  const [render, setRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
        });
      });
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = (e) => {
    if (e.target.classList.contains('modal-wrapper') && !animate) {
      setRender(false);
    }
  };

  if (!render) return null;

  return (
    <div 
      className="modal-wrapper modal active" 
      onTransitionEnd={handleTransitionEnd}
      onClick={(e) => {
        if (e.target.classList.contains('modal-wrapper')) onClose();
      }}
      style={{
        opacity: animate ? 1 : 0,
        backdropFilter: animate ? 'blur(10px)' : 'blur(0px)',
        WebkitBackdropFilter: animate ? 'blur(10px)' : 'blur(0px)',
        transition: animate ? 'opacity 200ms ease, backdrop-filter 200ms ease' : 'opacity 180ms ease, backdrop-filter 180ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(4, 4, 6, 0.7)'
      }}
    >
      <div 
        className="modal-content"
        style={{ 
          maxWidth, 
          width: '100%',
          opacity: animate ? 1 : 0,
          transform: animate ? 'scale(1)' : 'scale(0.95)',
          transition: animate ? 'opacity 320ms ease, transform 320ms ease' : 'opacity 180ms ease, transform 180ms ease',
          willChange: 'transform, opacity'
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
"""

if "function ModalWrapper" not in code:
    code = code.replace("import React, { useState, useEffect } from 'react';", "import React from 'react';\n" + wrapper_code)

# 1. ConfirmModal
code = re.sub(
    r"if \(!isOpen\) return null;\n\s*return \(\n\s*<div className=\{\`modal \$\{isOpen \? 'active' : ''\}\`\} onClick=\{\(e\) => e.target.classList.contains\('modal'\) && onCancel\(\)\}>\n\s*<div className=\"modal-content\" style=\{\{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' \}\}>",
    r"return (\n    <ModalWrapper isOpen={isOpen} onClose={onCancel} maxWidth=\"400px\">\n      <div style={{ textAlign: 'center', padding: '32px 24px' }}>",
    code
)
code = re.sub(
    r"</div>\n\s*</div>\n\s*\);\n\}",
    r"</div>\n    </ModalWrapper>\n  );\n}",
    code, count=1 # only apply to ConfirmModal
)

# 2. EventDetailModal
code = re.sub(
    r"if \(!isOpen \|\| !schedule\) return null;",
    r"if (!schedule) return null;",
    code
)
code = re.sub(
    r"<div className=\{\`modal \$\{isOpen \? 'active' : ''\}\`\} onClick=\{\(e\) => e.target.classList.contains\('modal'\) && onClose\(\)\}>\n\s*<div className=\"modal-content\">",
    r"<ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth=\"500px\">",
    code
)
# replace the closing divs for EventDetailModal
# Since EventDetailModal ends before CreateEventModal
code = re.sub(
    r"</div>\n\s*</div>\n\s*</div>\n\s*\);\n\}\n\n// ── CREATE EVENT MODAL",
    r"</div>\n    </ModalWrapper>\n  );\n}\n\n// ── CREATE EVENT MODAL",
    code
)

# 3. CreateEventModal
code = re.sub(
    r"if \(!isOpen\) return null;\n\s*const handleSubmit",
    r"const handleSubmit",
    code
)
code = re.sub(
    r"<div className=\{\`modal \$\{isOpen \? 'active' : ''\}\`\} onClick=\{\(e\) => e.target.classList.contains\('modal'\) && onClose\(\)\}>\n\s*<div className=\"modal-content\" style=\{\{ maxWidth: '500px' \}\}>",
    r"<> <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth=\"500px\">",
    code
)
code = re.sub(
    r"</form>\n\s*</div>\n\s*</div>\n\s*<ConfirmModal",
    r"</form>\n        </div>\n      </ModalWrapper>\n      <ConfirmModal",
    code
)
code = re.sub(
    r"onCancel=\{\(\) => setConfirmAction\(null\)\}\n\s*/>\n\s*</div>\n\s*\);\n\}\n\n// ── EDIT EVENT MODAL",
    r"onCancel={() => setConfirmAction(null)}\n      />\n    </>\n  );\n}\n\n// ── EDIT EVENT MODAL",
    code
)

# 4. EditEventModal
code = re.sub(
    r"if \(!isOpen \|\| !schedule\) return null;",
    r"if (!schedule) return null;",
    code
)
code = re.sub(
    r"<div className=\{\`modal \$\{isOpen \? 'active' : ''\}\`\} onClick=\{\(e\) => e.target.classList.contains\('modal'\) && onClose\(\)\}>\n\s*<div className=\"modal-content\" style=\{\{ maxWidth: '700px' \}\}>",
    r"<ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth=\"700px\">",
    code
)
code = re.sub(
    r"</form>\n\s*</div>\n\s*</div>\n\s*</div>\n\s*\);\n\}\n\n// ── SHARE MODAL",
    r"</form>\n        </div>\n      </ModalWrapper>\n  );\n}\n\n// ── SHARE MODAL",
    code
)

# 5. ShareModal
code = re.sub(
    r"if \(!isOpen \|\| !schedule\) return null;",
    r"if (!schedule) return null;",
    code
)
code = re.sub(
    r"<div className=\{\`modal \$\{isOpen \? 'active' : ''\}\`\} onClick=\{\(e\) => e.target.classList.contains\('modal'\) && onClose\(\)\}>\n\s*<div className=\"modal-content\" style=\{\{ maxWidth: '480px' \}\}>",
    r"<ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth=\"480px\">",
    code
)
code = re.sub(
    r"</div>\n\s*</div>\n\s*</div>\n\s*\);\n\}",
    r"</div>\n      </ModalWrapper>\n  );\n}",
    code
)

with open("src/components/dashboard/Modals.jsx", "w") as f:
    f.write(code)

print("Modals rewritten")
