import re

with open("src/components/dashboard/Modals.jsx", "r") as f:
    content = f.read()

if "AsyncButton" not in content:
    content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport AsyncButton from '../AsyncButton';")

# CreateEventModal
content = re.sub(
    r"<button type=\"submit\" className=\"btn btn-primary btn-full\" style=\{\{ marginTop: '8px' \}\}>Create Event</button>",
    r"""<AsyncButton actionFn={async () => {
              if(!date || !place) throw new Error('Missing fields');
              await handleSubmit({preventDefault: () => {}});
            }} className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>Create Event</AsyncButton>""",
    content
)

# EditEventModal
content = re.sub(
    r"<button type=\"submit\" className=\"btn btn-primary btn-full\" style=\{\{ gridColumn: '1 / -1', marginTop: '12px' \}\}>Save Changes</button>",
    r"""<AsyncButton actionFn={async () => {
              if(!date || !time || !place) throw new Error('Missing fields');
              await handleSubmit({preventDefault: () => {}});
            }} className="btn btn-primary btn-full" style={{ gridColumn: '1 / -1', marginTop: '12px' }}>Save Changes</AsyncButton>""",
    content
)

with open("src/components/dashboard/Modals.jsx", "w") as f:
    f.write(content)

print("Modals patched with AsyncButton")
