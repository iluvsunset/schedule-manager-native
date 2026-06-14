import re
import os

files_to_update = ['src/pages/Dashboard.jsx', 'src/pages/Login.jsx', 'src/pages/AdminPanel.jsx']

new_variants = """const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.22, delay: 0.15, ease: 'easeOut', staggerChildren: 0.05 } 
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    transition: { duration: 0.15, ease: 'easeIn' } 
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { ease: 'easeOut', duration: 0.22 } 
  }
};"""

for file_path in files_to_update:
    if not os.path.exists(file_path):
        continue
        
    with open(file_path, "r") as f:
        content = f.read()
        
    # Regex to replace containerVariants and itemVariants
    content = re.sub(r"const containerVariants = \{.*?\}\};\n\nconst itemVariants = \{.*?\};\n", new_variants + "\n", content, flags=re.DOTALL)
    
    with open(file_path, "w") as f:
        f.write(content)

print("Updated Framer Motion variants")
