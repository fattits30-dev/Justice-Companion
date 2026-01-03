"""
Justice Companion File Watcher Agent
Monitors project and NOTIFIES on issues
"""
import subprocess
import time
import hashlib
import os
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path("/home/jamiesavage/claude/projects/Justice-Companion")
MODEL = "deepseek-coder-v2:16b"
LOG_FILE = PROJECT_ROOT / "agents" / "watcher.log"
ISSUES_FILE = PROJECT_ROOT / "agents" / "issues.log"

WATCH_PATTERNS = ["lib/**/*.dart", "backend/**/*.py"]
IGNORE = ["build/", ".dart_tool/", "__pycache__/", "venv/", ".git/", ".idea/"]

def notify(title: str, message: str, urgency: str = "normal"):
    """Send desktop notification"""
    try:
        # Desktop notification
        subprocess.run([
            "notify-send", 
            "-u", urgency,  # low, normal, critical
            "-a", "Justice Companion",
            "-i", "dialog-warning" if urgency == "critical" else "dialog-information",
            title, 
            message[:200]
        ], timeout=5)
        
        # Also beep for critical
        if urgency == "critical":
            os.system("paplay /usr/share/sounds/freedesktop/stereo/dialog-warning.oga 2>/dev/null &")
    except:
        pass

def log(msg: str, notify_user: bool = False, critical: bool = False):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")
    
    if notify_user:
        notify("JC Watcher", msg, "critical" if critical else "normal")

def log_issue(filepath: str, issue: str):
    """Log issue to dedicated issues file"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(ISSUES_FILE, "a") as f:
        f.write(f"\n{'='*60}\n")
        f.write(f"[{timestamp}] {filepath}\n")
        f.write(f"{'='*60}\n")
        f.write(issue + "\n")

def get_file_hash(path: Path) -> str:
    if path.exists():
        return hashlib.md5(path.read_bytes()).hexdigest()
    return ""

def should_ignore(path: Path) -> bool:
    return any(ig in str(path) for ig in IGNORE)

def run_ollama(prompt: str) -> str:
    result = subprocess.run(
        ["ollama", "run", MODEL, prompt],
        capture_output=True, text=True, timeout=120
    )
    return result.stdout.strip()

def analyze_code(filepath: Path) -> dict:
    """Analyze code for issues - returns severity and issues"""
    code = filepath.read_text()[:3000]
    ext = filepath.suffix
    
    if ext == ".dart":
        prompt = f"""Analyze this Flutter/Dart code for CRITICAL issues only.
Look for:
- Security vulnerabilities (XSS, injection, data leaks)
- Null safety violations that will crash
- State management bugs (Riverpod misuse)
- Memory leaks
- Unhandled exceptions that will crash the app

Code:
```dart
{code}
```

If there are CRITICAL issues, start with "CRITICAL:" followed by the issue.
If there are warnings, start with "WARNING:" followed by the issue.
If the code looks fine, just say "OK".
Be very brief - one line per issue max."""

    elif ext == ".py":
        prompt = f"""Analyze this Python/FastAPI code for CRITICAL issues only.
Look for:
- SQL injection vulnerabilities
- Authentication/authorization bypasses
- Unvalidated user input
- Exceptions that will crash the server
- Data exposure

Code:
```python
{code}
```

If there are CRITICAL issues, start with "CRITICAL:" followed by the issue.
If there are warnings, start with "WARNING:" followed by the issue.
If the code looks fine, just say "OK".
Be very brief - one line per issue max."""
    else:
        return {"severity": "ok", "issues": ""}

    response = run_ollama(prompt)
    
    # Parse response
    if response.upper().startswith("CRITICAL"):
        return {"severity": "critical", "issues": response}
    elif response.upper().startswith("WARNING"):
        return {"severity": "warning", "issues": response}
    elif "CRITICAL" in response.upper():
        return {"severity": "critical", "issues": response}
    elif "WARNING" in response.upper():
        return {"severity": "warning", "issues": response}
    else:
        return {"severity": "ok", "issues": ""}

def get_all_files() -> dict:
    files = {}
    for pattern in WATCH_PATTERNS:
        for path in PROJECT_ROOT.glob(pattern):
            if not should_ignore(path) and path.is_file():
                files[path] = get_file_hash(path)
    return files

def main():
    log("🔍 Justice Companion Watcher started", notify_user=True)
    log(f"📁 Watching: {PROJECT_ROOT}")
    
    known_files = get_all_files()
    log(f"📊 Tracking {len(known_files)} files")
    
    # Initial notification
    notify("JC Watcher Active", f"Monitoring {len(known_files)} files for issues")
    
    issue_count = 0
    
    while True:
        try:
            current_files = get_all_files()
            
            for path, hash in current_files.items():
                if path not in known_files or known_files[path] != hash:
                    rel_path = path.relative_to(PROJECT_ROOT)
                    action = "New" if path not in known_files else "Modified"
                    log(f"✏️  {action}: {rel_path}")
                    
                    # Analyze for issues
                    try:
                        result = analyze_code(path)
                        
                        if result["severity"] == "critical":
                            issue_count += 1
                            log(f"🚨 CRITICAL in {rel_path}", notify_user=True, critical=True)
                            log_issue(str(rel_path), result["issues"])
                            
                            # Send detailed notification
                            notify(
                                f"🚨 CRITICAL: {rel_path.name}",
                                result["issues"][:200],
                                "critical"
                            )
                            
                        elif result["severity"] == "warning":
                            log(f"⚠️  Warning in {rel_path}", notify_user=True)
                            log_issue(str(rel_path), result["issues"])
                            
                        else:
                            log(f"✅ {rel_path} looks OK")
                            
                    except subprocess.TimeoutExpired:
                        log(f"⏱️  Analysis timeout for {rel_path}")
                    except Exception as e:
                        log(f"❌ Analysis error: {e}")
            
            # Check for deleted
            for path in known_files:
                if path not in current_files:
                    log(f"➖ Deleted: {path.relative_to(PROJECT_ROOT)}")
            
            known_files = current_files
            time.sleep(10)
            
        except KeyboardInterrupt:
            log("👋 Watcher stopped", notify_user=True)
            notify("JC Watcher", f"Stopped. Found {issue_count} issues this session.")
            break
        except Exception as e:
            log(f"❌ Error: {e}")
            time.sleep(30)

if __name__ == "__main__":
    main()
