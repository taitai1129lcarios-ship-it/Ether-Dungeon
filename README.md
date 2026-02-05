# Aether Dungeon

## How to Run
Because this game uses modern JavaScript Modules (`import`/`export`), it **cannot** be played by simply double-clicking `index.html`. Browsers block module loading from local files for security reasons (CORS policy).

You must run a local web server to play.

### Option 1: VS Code (Recommended)
1. Install the "Live Server" extension in VS Code.
2. Right-click `index.html` and select "Open with Live Server".

### Option 2: Python
If you have Python installed, you can run this command in the game folder:
```bash
python -m http.server
```
Then open `http://localhost:8000` in your browser.

### Option 3: Node.js
If you have Node.js installed:
```bash
npx http-server
```
Then open the address shown (usually `http://localhost:8080`).
