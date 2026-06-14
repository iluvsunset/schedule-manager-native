import re

with open("src/components/dashboard/ScheduleList.jsx", "r") as f:
    sl_content = f.read()

# Update motion.div exit and transition
sl_content = re.sub(
    r"initial=\{\{ opacity: 0, y: 20 \}\}\n\s*animate=\{\{ opacity: 1, y: 0 \}\}\n\s*exit=\{\{ opacity: 0, scale: 0\.95 \}\}\n\s*transition=\{\{ duration: 0\.2, delay: index \* 0\.05 \}\}",
    r"""initial={{ opacity: 0, y: 20, height: 'auto', marginBottom: 12 }}
                animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 12, transition: { duration: 0.3, ease: 'easeOut', delay: index * 0.04 } }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95, padding: 0, border: 0, transition: { duration: 0.25, ease: 'easeIn' } }}""",
    sl_content
)

with open("src/components/dashboard/ScheduleList.jsx", "w") as f:
    f.write(sl_content)

print("ScheduleList patched")
