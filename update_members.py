import re

with open("src/components/dashboard/ClassMembersView.jsx", "r") as f:
    content = f.read()

# Add import motion, AnimatePresence
if "framer-motion" not in content:
    content = content.replace("import React from 'react';", "import React from 'react';\nimport { motion, AnimatePresence } from 'framer-motion';")

# replace div mapped list
list_repl = """<AnimatePresence>
          {participants.map((email, idx) => (
            <motion.div 
              key={email}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut', delay: idx * 0.04 } }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25, ease: 'easeIn' } }}
              className="list-item" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div 
                className="user-avatar" 
                style={{ width: '44px', height: '44px', fontSize: '18px', flexShrink: 0 }}
              >
                {email.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', textAlign: 'left' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                  {email.split('@')[0]}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {email}
                </div>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>"""

content = re.sub(r"\{participants\.map\(\(email, idx\) => \(\n\s*<div key=\{idx\}.*?</div>\n\s*\)\)\}", list_repl, content, flags=re.DOTALL)

with open("src/components/dashboard/ClassMembersView.jsx", "w") as f:
    f.write(content)
