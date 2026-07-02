import re, glob, os

for filepath in glob.glob('**/*.html', recursive=True):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Replace all absolute local paths in inline JS
    # Handle \" escaped paths in JS strings
    content = re.sub(r'"\/_next\/', r'".\/_next\/', content)
    content = re.sub(r'"\/typekit\/', r'".\/typekit\/', content)
    content = re.sub(r'"\/favicon\.ico([^"]*)"', r'".\/favicon.ico\1"', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed: {filepath}')
    else:
        print(f'No changes: {filepath}')
