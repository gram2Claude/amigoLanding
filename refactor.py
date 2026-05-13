import os
import re

html_path = 'index.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract and replace <style>
style_pattern = re.compile(r'<style>(.*?)</style>', re.DOTALL)
style_match = style_pattern.search(content)

if style_match:
    style_content = style_match.group(1)
    content = style_pattern.sub('<link rel="stylesheet" href="./css/style.css">', content)
else:
    style_content = ""

# 2. Extract and replace the specific interaction script
script_pattern = re.compile(r'<script>\s*// Subtly shift cubes inversely(.*?)</script>', re.DOTALL)
script_match = script_pattern.search(content)

if script_match:
    script_inner = script_match.group(1)
# wrap in DOMContentLoaded
    script_content = f"document.addEventListener('DOMContentLoaded', () => {{\n{script_inner}\n}});"
    content = script_pattern.sub('<script src="./js/main.js" defer></script>', content)
else:
    script_content = ""

# 3. Add SEO tags in head
seo_tags = """
  <meta name="description" content="Amigo - Единая система аналитики без рутины. Мы создаем инфраструктуру данных для маркетинговых агентств и команд.">
  <meta property="og:title" content="Amigo - Manage Projects Inhumanly Fast">
  <meta property="og:description" content="Единая система аналитики без рутины.">
  <meta property="og:type" content="website">
"""
if '<title>' in content and 'og:title' not in content:
    content = content.replace('<title>', seo_tags.lstrip() + '  <title>')

# 4. Modify style content (px to rem, data uri to external svg)
# Replace Data URI
style_content = re.sub(
    r"url\('data:image/svg\+xml;utf8,<svg.*?</svg>'\)",
    "url('../assets/images/cube-wireframe.svg')",
    style_content
)

# Convert px to rem for values > 1px
def px_to_rem(match):
    val = int(match.group(1))
    if val <= 1:
        return match.group(0) # Keep 1px or 0px
    rem_val = val / 16.0
    # format without trailing zero if whole number
    return f"{rem_val:g}rem"

# Regex to find Npx
# Lookbehind for space or colon or minus
style_content = re.sub(r'(?<=[:\s-])(\d+)px(?=[;\s,}])', px_to_rem, style_content)

# 5. Save all files
os.makedirs('css', exist_ok=True)
os.makedirs('js', exist_ok=True)
os.makedirs('assets/images', exist_ok=True)

with open('css/style.css', 'w', encoding='utf-8') as f:
    f.write(style_content)

with open('js/main.js', 'w', encoding='utf-8') as f:
    f.write(script_content)

svg_data = """<svg width="70" height="70" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg"><polygon points="35,10 60,25 35,40 10,25" fill="rgba(255,255,255,0.8)" stroke="#999" stroke-width="1"/><polygon points="10,25 35,40 35,65 10,50" fill="rgba(255,255,255,0.8)" stroke="#999" stroke-width="1" stroke-dasharray="2,2"/><polygon points="35,40 60,25 60,50 35,65" fill="rgba(255,255,255,0.8)" stroke="#999" stroke-width="1" stroke-dasharray="1,2"/></svg>"""

with open('assets/images/cube-wireframe.svg', 'w', encoding='utf-8') as f:
    f.write(svg_data)

# Accessibility touches to index.html
# Convert all `iconify-icon` that are purely decorative to aria-hidden
content = re.sub(r'<iconify-icon([^>]+)></iconify-icon>', r'<iconify-icon\1 aria-hidden="true"></iconify-icon>', content)

# ensure buttons have aria-label if needed (we see text in them mostly, so it's fine)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Refactoring complete.")
