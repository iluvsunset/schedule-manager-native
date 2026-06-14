import re

with open("src/components/dashboard/Modals.jsx", "r") as f:
    content = f.read()

modal_wrapper_code = """
// ── APPLE MODAL WRAPPER ───────────────────────────────────────
function ModalWrapper({ isOpen, onClose, children, maxWidth = '500px' }) {
  const [render, setRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      // slight delay to allow DOM to render before adding animation classes
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
        });
      });
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isOpen) setRender(false);
  };

  if (!render) return null;

  return (
    <div 
      className={`modal ${animate ? 'active' : ''}`} 
      onTransitionEnd={handleTransitionEnd}
      onClick={(e) => {
        if (e.target.classList.contains('modal')) onClose();
      }}
      style={{
        opacity: animate ? 1 : 0,
        backdropFilter: animate ? 'blur(10px)' : 'blur(0px)',
        WebkitBackdropFilter: animate ? 'blur(10px)' : 'blur(0px)',
        transition: animate ? 'opacity 200ms ease, backdrop-filter 200ms ease' : 'opacity 180ms ease, backdrop-filter 180ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="modal-content"
        style={{ 
          maxWidth, 
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

# Insert wrapper code after imports
content = content.replace("import { AlertTriangle, Calendar, Clock, MapPin, FileText, Link, Zap, CheckCircle, Globe, Lock, X } from 'lucide-react';", 
"""import { AlertTriangle, Calendar, Clock, MapPin, FileText, Link, Zap, CheckCircle, Globe, Lock, X } from 'lucide-react';""" + modal_wrapper_code)

# Replace ConfirmModal
content = re.sub(
    r"export function ConfirmModal.*?return \(\n\s*<div className=\{\`modal .*?</div>\n\s*</div>\n\s*\);\n\}",
    r"""export function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onCancel} maxWidth="400px">
      <div style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--color-warning)' }}>
          <AlertTriangle size={48} />
        </div>
        <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 600 }}>{message}</h3>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ minWidth: '100px' }}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm} style={{ minWidth: '100px', background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Confirm</button>
        </div>
      </div>
    </ModalWrapper>
  );
}""",
    content, flags=re.DOTALL
)

# For other modals, we can do a similar replacement, but it's probably easier to just replace `if (!isOpen) return null;` 
# and the outer `<div className="modal"...>` with `<ModalWrapper...>` manually or via regex. 
# Let's replace the outer div and the return null of the remaining modals.

# 2. EventDetailModal
content = re.sub(
    r"export function EventDetailModal\(\{ isOpen, onClose, schedule \}\) \{\n\s*if \(!isOpen \|\| !schedule\) return null;\n(.*?)return \(\n\s*<div className=\{\`modal.*?>\n\s*<div className=\"modal-content\">\n(.*?)</div>\n\s*</div>\n\s*\);\n\}",
    r"""export function EventDetailModal({ isOpen, onClose, schedule }) {
  if (!schedule) return null;
\1return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="500px">
\2
    </ModalWrapper>
  );
}""",
    content, flags=re.DOTALL
)

# 3. CreateEventModal
content = re.sub(
    r"if \(!isOpen\) return null;\n\s*const handleSubmit",
    r"const handleSubmit",
    content
)

content = re.sub(
    r"return \(\n\s*<div className=\{\`modal.*?onClose\(\)\}\}>\n\s*<div className=\"modal-content\" style=\{\{ maxWidth: '500px' \}\}>\n(.*?)</div>\n\s*<ConfirmModal",
    r"""return (
    <>
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="500px">
\1    </ModalWrapper>
      <ConfirmModal""",
    content, flags=re.DOTALL
)
# Wait, this might be tricky, let's just write the modified components to a new file.
