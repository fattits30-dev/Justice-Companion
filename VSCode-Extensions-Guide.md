# VS Code Extension Optimization Guide
**Justice Companion Full-Stack Development**

## Executive Summary

This guide provides curated VS Code extension recommendations optimized for the Justice Companion project stack:
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Python FastAPI, SQLAlchemy 2.0
- **Testing**: Playwright, Vitest, Pytest
- **AI/ML**: PyTorch, Transformers, FAISS
- **DevOps**: Docker, Git, PWA

---

## 🎯 Tier 1: Essential Extensions (Must Install)

### Core Development
| Extension | ID | Purpose |
|-----------|-----|---------|
| **ESLint** | `dbaeumer.vscode-eslint` | Enforce code quality for TypeScript/JavaScript |
| **Prettier** | `esbenp.prettier-vscode` | Code formatting (already in lint-staged) |
| **Python** | `ms-python.python` | Official Python language support |
| **Pylance** | `ms-python.vscode-pylance` | Fast Python IntelliSense and type checking |
| **Python Debugger** | `ms-python.debugpy` | Python debugging support |

### TypeScript & React
| Extension | ID | Purpose |
|-----------|-----|---------|
| **ES7+ React/Redux Snippets** | `dsznajder.es7-react-js-snippets` | Speed up React development |
| **Auto Rename Tag** | `formulahendry.auto-rename-tag` | Auto-rename paired HTML/JSX tags |
| **Auto Close Tag** | `formulahendry.auto-close-tag` | Auto-close HTML/XML tags |

### Tailwind CSS
| Extension | ID | Purpose |
|-----------|-----|---------|
| **Tailwind CSS IntelliSense** | `bradlc.vscode-tailwindcss` | Autocomplete, syntax highlighting, linting |
| **Tailwind Fold** | `stivo.tailwind-fold` | Fold long className attributes |

### Testing
| Extension | ID | Purpose |
|-----------|-----|---------|
| **Playwright Test for VSCode** | `ms-playwright.playwright` | Run/debug Playwright tests in UI |
| **Vitest** | `vitest.explorer` | Run/debug Vitest tests inline |

### Git
| Extension | ID | Purpose |
|-----------|-----|---------|
| **GitLens** | `eamodio.gitlens` | Supercharge Git capabilities |
| **Git Graph** | `mhutchie.git-graph` | Visualize repository history |

---

## 🔥 Tier 2: Highly Recommended

### Python Development
| Extension | ID | Purpose |
|-----------|-----|---------|
| **Black Formatter** | `ms-python.black-formatter` | Python code formatting |
| **Ruff** | `charliermarsh.ruff` | Fast Python linter (alternative to Pylint) |
| **autoDocstring** | `njpwerner.autodocstring` | Generate Python docstrings |

### Code Quality
| Extension | ID | Purpose |
|-----------|-----|---------|
| **Error Lens** | `usernamehw.errorlens` | Highlight errors inline |
| **Import Cost** | `wix.vscode-import-cost` | Display import sizes (optimize bundle) |
| **SonarLint** | `SonarSource.sonarlint-vscode` | Advanced code quality & security |

### Database
| Extension | ID | Purpose |
|-----------|-----|---------|
| **SQLite Viewer** | `qwtel.sqlite-viewer` | View/edit SQLite databases |
| **PostgreSQL** | `ckolkman.vscode-postgres` | PostgreSQL client |
| **SQLTools** | `mtxr.sqltools` | Database explorer, query runner |

### API Development
| Extension | ID | Purpose |
|-----------|-----|---------|
| **REST Client** | `humao.rest-client` | Test REST APIs directly in VS Code |
| **Thunder Client** | `rangav.vscode-thunder-client` | Lightweight REST API client |

### Productivity
| Extension | ID | Purpose |
|-----------|-----|---------|
| **Path Intellisense** | `christian-kohler.path-intellisense` | Autocomplete file paths |
| **Better Comments** | `aaron-bond.better-comments` | Highlight TODO, FIXME, etc. |
| **Todo Tree** | `Gruntfuggly.todo-tree` | Track TODOs across codebase |
| **Bookmarks** | `alefragnani.Bookmarks` | Navigate code sections quickly |
| **Turbo Console Log** | `chakrounAnas.turbo-console-log` | Quick console.log debugging |

---

## ⚡ Tier 3: Optional (Specialized Use Cases)

### AI/ML Development
| Extension | ID | Purpose |
|-----------|-----|---------|
| **Jupyter** | `ms-toolsai.jupyter` | Jupyter notebook support |
| **Python Indent** | `KevinRose.vsc-python-indent` | Better Python indentation |

### Docker & DevOps
| Extension | ID | Purpose |
|-----------|-----|---------|
| **Docker** | `ms-azuretools.vscode-docker` | Dockerfile support & container mgmt |
| **Dev Containers** | `ms-vscode-remote.remote-containers` | Develop inside containers |
| **YAML** | `redhat.vscode-yaml` | YAML support for configurations |

### UI/UX
| Extension | ID | Purpose |
|-----------|-----|---------|
| **Color Highlight** | `naumovs.color-highlight` | Highlight color codes |
| **SVG** | `jock.svg` | SVG preview and editing |
| **Image preview** | `kisstkondoros.vscode-gutter-preview` | Show image previews in gutter |
| **CSS Peek** | `pranaygp.vscode-css-peek` | Navigate to CSS definitions from HTML/JSX |

### Markdown
| Extension | ID | Purpose |
|-----------|-----|---------|
| **Markdown All in One** | `yzhang.markdown-all-in-one` | Complete Markdown support |
| **Markdown Preview Enhanced** | `shd101wyy.markdown-preview-enhanced` | Advanced Markdown preview |

### Theme & Icons
| Extension | ID | Purpose |
|-----------|-----|---------|
| **Material Icon Theme** | `PKief.material-icon-theme` | Beautiful file/folder icons |
| **One Dark Pro** | `zhuangtongfa.Material-theme` | Popular dark theme |

### AI Assistants (Choose One)
| Extension | ID | Purpose |
|-----------|-----|---------|
| **GitHub Copilot** | `GitHub.copilot` | AI pair programmer (paid) |
| **Codeium** | `Codeium.codeium` | Free AI code completion |
| **Tabnine** | `TabNine.tabnine-vscode` | AI code completion |

---

## ⚙️ Configuration Recommendations

### 1. Workspace Settings (`.vscode/settings.json`)

```json
{
  // TypeScript
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,

  // ESLint
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.format.enable": true,

  // Prettier
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.formatOnSave": true
  },

  // Tailwind CSS
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["className.*?=.*?[{\"'`]([^\"'`}]*)[\"'`}]"]
  ],
  "css.validate": false,

  // Python
  "python.analysis.typeCheckingMode": "basic",
  "python.analysis.autoImportCompletions": true,
  "python.testing.pytestEnabled": true,
  "python.defaultInterpreterPath": "./backend/.venv/Scripts/python.exe",

  // Files
  "files.exclude": {
    "**/__pycache__": true,
    "**/.pytest_cache": true,
    "**/node_modules": true,
    "**/.venv": true,
    "**/venv": true,
    "**/dist": true
  },
  "files.watcherExclude": {
    "**/__pycache__": true,
    "**/node_modules": true,
    "**/.venv": true,
    "**/dist": true
  },

  // Editor
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "editor.rulers": [80, 120],
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "editor.minimap.enabled": true,
  "editor.inlineSuggest.enabled": true,

  // Explorer
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.patterns": {
    "*.ts": "${capture}.test.ts, ${capture}.spec.ts",
    "*.tsx": "${capture}.test.tsx, ${capture}.spec.tsx",
    "*.py": "${capture}_test.py, test_${capture}.py"
  },

  // Git
  "git.autofetch": true,
  "git.confirmSync": false,
  "git.enableSmartCommit": true,
  "gitlens.blame.compact": false,
  "gitlens.blame.heatmap.enabled": false,

  // Terminal
  "terminal.integrated.defaultProfile.windows": "PowerShell"
}
```

### 2. Launch Configuration (`.vscode/launch.json`)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend (Chrome)",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5176",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    },
    {
      "name": "Debug Backend (FastAPI)",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "backend.main:app",
        "--reload",
        "--host",
        "0.0.0.0",
        "--port",
        "8001"
      ],
      "jinja": true,
      "justMyCode": false,
      "env": {
        "PYTHONPATH": "${workspaceFolder}"
      },
      "cwd": "${workspaceFolder}"
    },
    {
      "name": "Debug Pytest (Current File)",
      "type": "python",
      "request": "launch",
      "module": "pytest",
      "args": [
        "-v",
        "-s",
        "${file}"
      ],
      "console": "integratedTerminal",
      "justMyCode": false
    },
    {
      "name": "Debug Vitest (Current File)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": [
        "run",
        "test",
        "--",
        "${file}"
      ],
      "console": "integratedTerminal"
    }
  ]
}
```

### 3. Extension Recommendations (`.vscode/extensions.json`)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-python.debugpy",
    "ms-python.black-formatter",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "vitest.explorer",
    "eamodio.gitlens",
    "mhutchie.git-graph",
    "qwtel.sqlite-viewer",
    "usernamehw.errorlens",
    "dsznajder.es7-react-js-snippets",
    "formulahendry.auto-rename-tag",
    "humao.rest-client",
    "christian-kohler.path-intellisense",
    "Gruntfuggly.todo-tree"
  ]
}
```

### 4. Tasks Configuration (`.vscode/tasks.json`)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Full Stack",
      "type": "npm",
      "script": "dev:full",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "Run Playwright Tests",
      "type": "npm",
      "script": "e2e",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always"
      }
    },
    {
      "label": "Type Check",
      "type": "npm",
      "script": "typecheck",
      "problemMatcher": ["$tsc"],
      "presentation": {
        "reveal": "silent"
      }
    },
    {
      "label": "Run Backend Tests",
      "type": "shell",
      "command": "pytest",
      "args": ["backend/", "-v"],
      "problemMatcher": [],
      "presentation": {
        "reveal": "always"
      }
    },
    {
      "label": "Lint Fix",
      "type": "npm",
      "script": "lint:fix",
      "problemMatcher": ["$eslint-stylish"],
      "presentation": {
        "reveal": "silent"
      }
    }
  ]
}
```

---

## 🚀 Quick Start Installation

### Option 1: Install from Recommendations File
1. Create `.vscode/extensions.json` with the configuration above
2. Open VS Code Command Palette (`Ctrl+Shift+P`)
3. Run: `Extensions: Show Recommended Extensions`
4. Click "Install All"

### Option 2: Bulk Install via CLI

**Tier 1 Essential:**
```powershell
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension ms-python.debugpy
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-playwright.playwright
code --install-extension vitest.explorer
code --install-extension eamodio.gitlens
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension formulahendry.auto-rename-tag
code --install-extension formulahendry.auto-close-tag
code --install-extension mhutchie.git-graph
code --install-extension stivo.tailwind-fold
```

**Tier 2 Recommended:**
```powershell
code --install-extension ms-python.black-formatter
code --install-extension charliermarsh.ruff
code --install-extension usernamehw.errorlens
code --install-extension qwtel.sqlite-viewer
code --install-extension ckolkman.vscode-postgres
code --install-extension mtxr.sqltools
code --install-extension humao.rest-client
code --install-extension christian-kohler.path-intellisense
code --install-extension Gruntfuggly.todo-tree
code --install-extension aaron-bond.better-comments
code --install-extension alefragnani.Bookmarks
code --install-extension chakrounAnas.turbo-console-log
```

---

## 📊 Performance Optimization

### Reduce Extension Overhead

```json
{
  // Disable extensions in specific workspaces
  "extensions.ignoreRecommendations": false,

  // Limit TypeScript memory
  "typescript.tsserver.maxTsServerMemory": 4096,

  // Optimize file watching
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/objects/**": true,
    "**/.venv/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/__pycache__/**": true
  },

  // Disable telemetry
  "telemetry.telemetryLevel": "off"
}
```

### Extension Profiles (VS Code 1.75+)

Create profiles for different work modes:
- **Full Stack**: All extensions enabled
- **Frontend Only**: Disable Python extensions
- **Backend Only**: Disable React/Tailwind extensions
- **Testing**: Only testing & debugging extensions

**To create a profile:**
1. `Ctrl+Shift+P` → "Profiles: Create Profile"
2. Name it (e.g., "Frontend Dev")
3. Select extensions to include
4. Switch profiles via status bar

---

## 🔧 Workflow Tips

### 1. Keyboard Shortcuts for Efficiency

| Action | Shortcut | Extension |
|--------|----------|-----------|
| Quick Fix | `Ctrl+.` | ESLint |
| Format Document | `Shift+Alt+F` | Prettier |
| Organize Imports | `Shift+Alt+O` | TypeScript |
| Run Test at Cursor | `Ctrl+;` `Ctrl+A` | Vitest/Playwright |
| Toggle Terminal | `` Ctrl+` `` | Built-in |
| Search Files | `Ctrl+P` | Built-in |
| Search Symbols | `Ctrl+Shift+O` | Built-in |
| Multi-cursor | `Ctrl+Alt+↓` | Built-in |
| Command Palette | `Ctrl+Shift+P` | Built-in |
| Git Panel | `Ctrl+Shift+G` | Built-in |
| Navigate Back | `Alt+←` | Built-in |
| Navigate Forward | `Alt+→` | Built-in |

### 2. Snippets for Rapid Development

**React Component Snippet** (User Snippets: TypeScript React):
```json
{
  "React Functional Component": {
    "prefix": "rfc",
    "body": [
      "interface ${1:Component}Props {",
      "  $2",
      "}",
      "",
      "export function ${1:Component}({ $3 }: ${1:Component}Props) {",
      "  return (",
      "    <div className=\"$4\">",
      "      $0",
      "    </div>",
      "  );",
      "}"
    ],
    "description": "React functional component with TypeScript"
  },
  "React Hook useState": {
    "prefix": "us",
    "body": [
      "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>(${3:initialValue});"
    ],
    "description": "useState hook"
  }
}
```

**FastAPI Route Snippet** (User Snippets: Python):
```json
{
  "FastAPI Route": {
    "prefix": "route",
    "body": [
      "@router.${1:get}(\"/${2:path}\")",
      "async def ${3:function_name}(",
      "    ${4:param}: ${5:Type},",
      "    db: AsyncSession = Depends(get_db)",
      ") -> ${6:ResponseModel}:",
      "    \"\"\"$7\"\"\"",
      "    $0",
      "    return result"
    ],
    "description": "FastAPI route handler"
  },
  "Python Docstring": {
    "prefix": "doc",
    "body": [
      "\"\"\"",
      "$1",
      "",
      "Args:",
      "    $2",
      "",
      "Returns:",
      "    $3",
      "\"\"\""
    ],
    "description": "Python docstring"
  }
}
```

### 3. Multi-Root Workspace Setup

For frontend/backend separation, create `justice-companion.code-workspace`:
```json
{
  "folders": [
    {
      "name": "Frontend",
      "path": "."
    },
    {
      "name": "Backend",
      "path": "backend"
    }
  ],
  "settings": {
    "python.defaultInterpreterPath": "${workspaceFolder:Backend}/.venv/Scripts/python.exe",
    "python.testing.pytestArgs": [
      "${workspaceFolder:Backend}"
    ]
  }
}
```

---

## 🎯 Project-Specific Recommendations

### For Justice Companion Specifics

1. **AI/ML Development**
   - Install Jupyter extension for experimenting with models
   - Use Python Indent for better ML code formatting
   - Consider Pylance strict type checking for PyTorch code

2. **PWA Development**
   - Install "PWA Tools" extension for manifest editing
   - Use "Lighthouse" extension for PWA audits
   - Test offline functionality with Service Worker debugging

3. **Legal Document Processing**
   - PDF preview extensions for testing document parsing
   - Text encoding helpers for multi-format support

4. **Multi-Provider AI Configuration**
   - Use JSON Schema validation for provider configs
   - Thunder Client for testing different AI API endpoints

5. **Database Management**
   - SQLite Viewer for local development
   - PostgreSQL extension for production database

---

## 🔍 Troubleshooting

### Common Issues

**Problem**: ESLint not working
- **Solution**: Restart ESLint server (`Ctrl+Shift+P` → "ESLint: Restart ESLint Server")
- **Alternative**: Check ESLint output panel for errors

**Problem**: Tailwind IntelliSense not showing
- **Solution**: Ensure [tailwind.config.js](tailwind.config.js) is in workspace root
- **Alternative**: Reload window (`Ctrl+Shift+P` → "Developer: Reload Window")

**Problem**: Python imports not resolving
- **Solution**: Set Python interpreter (`Ctrl+Shift+P` → "Python: Select Interpreter")
- **Alternative**: Check PYTHONPATH in settings

**Problem**: Vitest tests not discovered
- **Solution**: Check `vitest.config` path in extension settings
- **Alternative**: Restart Vitest extension

**Problem**: Slow performance
- **Solution**: Disable unused extensions, increase TS memory limit
- **Check**: `Ctrl+Shift+P` → "Developer: Show Running Extensions"

**Problem**: Prettier not formatting on save
- **Solution**: Check "Editor: Format On Save" is enabled
- **Alternative**: Set Prettier as default formatter per language

---

## 📋 Maintenance Checklist

- [ ] Review installed extensions quarterly
- [ ] Disable unused extensions per workspace
- [ ] Update extensions with security patches immediately
- [ ] Test extension conflicts when adding new ones
- [ ] Sync settings across machines via Settings Sync
- [ ] Back up custom snippets and keybindings
- [ ] Monitor extension performance via `Developer: Show Running Extensions`
- [ ] Clean up old/deprecated extensions
- [ ] Review and update `.vscode` configurations

---

## 📚 Additional Resources

- [VS Code Official Docs](https://code.visualstudio.com/docs)
- [VS Code Can Do That](https://vscodecandothat.com/)
- [Awesome VS Code](https://github.com/viatsko/awesome-vscode)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

**Last Updated**: 2025-12-04
**Project**: Justice Companion v1.0.0
**Tech Stack**: React 18 + TypeScript + FastAPI + PostgreSQL
**Maintained by**: Development Team
