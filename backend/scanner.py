import os
import re
import subprocess

# File extensions to scan — expanded to cover most common languages and data science files
SUPPORTED_EXTENSIONS = {
    # Web
    '.py', '.js', '.jsx', '.ts', '.tsx',
    # Systems
    '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.swift', '.kt',
    # Scripting
    '.rb', '.php', '.pl', '.sh', '.bash', '.ps1', '.lua',
    # Data science / ML
    '.r', '.m', '.scala', '.ipynb',
    # Config / markup (counted for LOC)
    '.sql', '.xml', '.yaml', '.yml', '.json', '.toml', '.ini', '.cfg',
    # Other
    '.dart', '.vue', '.svelte', '.ex', '.exs', '.clj', '.hs', '.ml',
}

# Regex patterns for Coupling (imports/includes)
COUPLING_PATTERNS = [
    re.compile(r'^\s*(?:from\s+[\w\.]+\s+)?import\s+.*', re.MULTILINE),       # Python
    re.compile(r'^\s*import\s+.*from\s+[\'"].*[\'"]', re.MULTILINE),           # JS/TS
    re.compile(r'^\s*const\s+.*=\s*require\([\'"].*[\'"]\)', re.MULTILINE),    # JS (Node)
    re.compile(r'^\s*#include\s*[<"].*[>"]', re.MULTILINE),                    # C/C++
    re.compile(r'^\s*import\s+[\w\.]+;', re.MULTILINE),                        # Java
    re.compile(r'^\s*using\s+[\w\.]+;', re.MULTILINE),                         # C#
    re.compile(r'^\s*require\s+[\'"].*[\'"]', re.MULTILINE),                   # Ruby
    re.compile(r'^\s*use\s+[\w\\]+;', re.MULTILINE),                           # PHP
    re.compile(r'^\s*import\s+"[\w\.\/]+"', re.MULTILINE),                     # Go
    re.compile(r'^\s*library\s*\([\w\.]+\)', re.MULTILINE),                    # R
]

# Regex patterns for Cyclomatic Complexity approximation
COMPLEXITY_PATTERNS = re.compile(
    r'\b(if|while|for|case|catch)\b|&&|\|\||\?', 
    re.MULTILINE
)

def get_git_change_frequency(filepath, repo_path):
    """Uses git to count the number of commits that modified this file."""
    try:
        # Run git log --oneline -- <filepath> and count the lines
        result = subprocess.run(
            ['git', 'log', '--oneline', '--', filepath],
            cwd=repo_path,
            capture_output=True,
            text=True,
            check=True
        )
        lines = result.stdout.strip().splitlines()
        # filter out empty strings if any
        return len([line for line in lines if line.strip()])
    except (subprocess.CalledProcessError, FileNotFoundError):
        # If not a git repo, git is not installed, or file not tracked, return 0
        return 0

def analyze_file(filepath, repo_path=None):
    """Parses a single file to extract LOC, Complexity, Coupling, and Change Frequency."""
    loc = 0
    complexity = 1 # Base complexity is 1
    coupling = 0
    change_frequency = 0
    
    if repo_path:
        change_frequency = get_git_change_frequency(filepath, repo_path)
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
            # 1. Lines of Code (non-empty)
            lines = content.splitlines()
            loc = len([line for line in lines if line.strip()])
            
            # 2. Coupling (count unique import matches)
            for pattern in COUPLING_PATTERNS:
                matches = pattern.findall(content)
                coupling += len(matches)
                
            # 3. Cyclomatic Complexity
            complexity += len(COMPLEXITY_PATTERNS.findall(content))
            
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        
    return {
        "file": filepath,
        "loc": loc,
        "complexity": complexity,
        "coupling": coupling,
        "change_frequency": change_frequency
    }

def scan_directory(directory_path):
    """Scans all supported files in a directory recursively."""
    results = []
    
    for root, dirs, files in os.walk(directory_path):
        # ignore node_modules, venv, .git, etc.
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'venv', '.git', '__pycache__', 'dist', 'build')]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in SUPPORTED_EXTENSIONS:
                filepath = os.path.join(root, file)
                file_metrics = analyze_file(filepath, repo_path=directory_path)
                # Keep relative path for visual clarity
                file_metrics["file"] = os.path.relpath(filepath, directory_path)
                results.append(file_metrics)
                
    return results
