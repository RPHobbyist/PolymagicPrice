import os
import re

def clean_html_to_md(html_str):
    if not html_str: return ""
    text = html_str
    
    # Simple markdown conversions
    text = re.sub(r'<h3>(.*?)</h3>', r'### \1\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<h2>(.*?)</h2>', r'## \1\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<h1>(.*?)</h1>', r'# \1\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<p>(.*?)</p>', r'\1\n\n', text, flags=re.IGNORECASE|re.DOTALL)
    text = re.sub(r'<strong>(.*?)</strong>', r'**\1**', text, flags=re.IGNORECASE)
    text = re.sub(r'<b>(.*?)</b>', r'**\1**', text, flags=re.IGNORECASE)
    text = re.sub(r'<em>(.*?)</em>', r'*\1*', text, flags=re.IGNORECASE)
    text = re.sub(r'<i>(.*?)</i>', r'*\1*', text, flags=re.IGNORECASE)
    text = re.sub(r'<a[^>]+href="(.*?)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.IGNORECASE)
    text = re.sub(r'<ul>(.*?)</ul>', r'\1', text, flags=re.IGNORECASE|re.DOTALL)
    text = re.sub(r'<ol>(.*?)</ol>', r'\1', text, flags=re.IGNORECASE|re.DOTALL)
    text = re.sub(r'<li>(.*?)</li>', r'- \1\n', text, flags=re.IGNORECASE|re.DOTALL)
    text = re.sub(r'<br\s*/?>', r'\n', text, flags=re.IGNORECASE)
    
    # Strip remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Decode basic entities
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&mdash;', '--').replace('&ndash;', '-').replace('&times;', 'x').replace('&rdquo;', '"').replace('&ldquo;', '"').replace('&rsquo;', "'")
    
    # Clean up excess newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()

def generate_markdown():
    middleware_path = os.path.join('functions', '_middleware.js')
    if not os.path.exists(middleware_path):
        print("Error: Could not find", middleware_path)
        return
        
    with open(middleware_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Extract the staticContentMap block
    map_match = re.search(r'const staticContentMap = \{(.*?)\n\};', content, re.DOTALL)
    if not map_match:
        print("Could not find staticContentMap in _middleware.js")
        return
        
    map_str = map_match.group(1)
    
    map_str = map_str.replace('${PARENT}', 'https://www.rphobbyist.com')
    
    # Find all wrap calls: '/path': wrap('title', `body`)
    # Path can be '/' or '/something'
    # The title uses single quotes, the body uses backticks.
    pattern = r"'(/\S*)':\s*wrap\(\s*'([^']*)',\s*`([^`]*)`"
    matches = re.finditer(pattern, map_str)
    
    base_dir = os.path.join('public', 'markdown')
    os.makedirs(base_dir, exist_ok=True)
    
    count = 0
    for match in matches:
        path = match.group(1)
        title_html = match.group(2)
        body_html = match.group(3)
        
        # Determine markdown filename
        md_filename = 'index.md' if path == '/' else f"{path.strip('/')}.md"
        filepath = os.path.join(base_dir, md_filename)
        
        # Generate markdown content
        md_content = clean_html_to_md(title_html) + "\n\n" + clean_html_to_md(body_html)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(md_content)
        print(f"Generated {filepath}")
        count += 1
        
    print(f"Successfully generated {count} Markdown files for AI Agents!")

if __name__ == '__main__':
    generate_markdown()
