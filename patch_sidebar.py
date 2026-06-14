import re

with open("src/components/layout/Sidebar.jsx", "r") as f:
    content = f.read()

# Add variants
variants_code = """
const sidebarVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 }
  }
};

const linkVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { ease: 'easeOut', duration: 0.3 } 
  }
};
"""

content = content.replace("export default function Sidebar", variants_code + "\nexport default function Sidebar")

content = content.replace("<div className=\"nav-links-container\" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>", 
                          "<motion.div className=\"nav-links-container\" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }} variants={sidebarVariants} initial=\"hidden\" animate=\"visible\">")

content = content.replace("</div>\n      </nav>", "</motion.div>\n      </nav>")

# Add variants={linkVariants} to motion.a
content = re.sub(r"<motion\.a\s+key=\{item\.id\}", r"<motion.a key={item.id} variants={linkVariants}", content)

with open("src/components/layout/Sidebar.jsx", "w") as f:
    f.write(content)

print("Sidebar patched")
