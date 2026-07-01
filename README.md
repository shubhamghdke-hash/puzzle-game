# Six Little Puzzles 💕

A romantic photo puzzle game — upload a photo for each prompt, then answer the final question. Say yes and get a Three.js celebration.

## Quick start (with photo verification)

```bash
cp .env.example .env
```

Add your **Gemini API key** to `.env` ([get one free](https://aistudio.google.com/apikey)):

```
GEMINI_API_KEY=AIzaSy...
```

Start the server:

```bash
python3 server.py
```

Open **http://localhost:8765**

> Use `python3 server.py` — not `python3 -m http.server`. The custom server serves the game **and** checks photos with Gemini.

### Test on your phone (same Wi‑Fi)

In `.env` set `HOST=0.0.0.0`, restart the server, then open `http://YOUR_COMPUTER_IP:8765` on your phone.

## Customize

Edit the `CONFIG` and `PUZZLES` array at the top of `app.js`.

## Image recognition

Photos are sent to **your local Python server**, which calls Gemini. The API key stays in `.env` on your machine — not in the browser.

| Mission | Verified? |
|---------|-----------|
| Dog, cat, flower, dish | Yes — Gemini checks the photo |
| Cute | No — any image passes |

To disable checks (any image passes), set in `app.js`:

```js
imageRecognition: { enabled: false }
```

## The puzzles

| # | Prompt |
|---|--------|
| 1 | Upload a photo of a **dog** |
| 2 | Upload a photo of a **cat** |
| 3 | Upload a photo of your **favorite flower** |
| 4 | Upload a **cute photo** |
| 5 | Upload a photo of your **favorite dish** |
| 6 | **Would you like to go out with me on Sunday?** |

Good luck. 🌸

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Add environment variable **`GEMINI_API_KEY`** in Vercel project settings.
4. Deploy — static files are served from the repo root; `/api/*` routes run as Python serverless functions.

Check deployment: `https://YOUR-APP.vercel.app/api/health`

Local dev still uses `python3 server.py` on port 8765.
