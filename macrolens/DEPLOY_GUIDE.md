# 🥗 MacroLens — Deploy to Your Phone in 5 Minutes

## What You Need
- A free GitHub account → github.com
- A free Vercel account → vercel.com
- Your Anthropic API key → console.anthropic.com

---

## Step 1 — Upload the Project to GitHub

1. Go to **github.com** → click the **+** button → **New repository**
2. Name it `macrolens`, keep it **Public**, click **Create repository**
3. On the next page, click **"uploading an existing file"**
4. Drag the entire `macrolens` folder contents into the upload box:
   - `package.json`
   - `public/` folder (index.html, manifest.json)
   - `src/` folder (App.js, index.js)
5. Click **Commit changes**

---

## Step 2 — Deploy on Vercel (Free)

1. Go to **vercel.com** → Sign up / Log in with GitHub
2. Click **"Add New Project"**
3. Find your `macrolens` repo → click **Import**
4. Framework Preset should auto-detect as **Create React App** ✓
5. Click **Deploy** — wait ~2 minutes
6. 🎉 Vercel gives you a live URL like `macrolens.vercel.app`

---

## Step 3 — Open on Your Phone

1. Open your phone's browser (Safari on iPhone, Chrome on Android)
2. Go to your Vercel URL (e.g. `macrolens.vercel.app`)
3. Tap **Share** (iPhone) or the **⋮ menu** (Android)
4. Tap **"Add to Home Screen"**
5. It now appears as an app icon on your home screen! 🎉

---

## Step 4 — Set Your API Key

1. Open the app on your phone
2. Tap the **"⚠ Set Key"** button in the top-right
3. Paste your Anthropic API key (starts with `sk-ant-`)
4. Tap **Save**

> Your API key is saved only on your device (localStorage). It never leaves your phone.

---

## Step 5 — Start Scanning!

1. Tap **📷 Camera** to snap a photo of your food
2. Tap **✦ Analyze Macros**
3. See your full nutrition breakdown in seconds!

---

## Tips for Best Results

- 📸 Good lighting = more accurate estimates
- 🍽️ A single dish per photo works better than a full spread
- 📏 Include something for scale (fork, hand) to help with portion estimates
- 🔄 Try different angles if confidence is "low"

---

## API Key Cost?

Analyzing one food photo costs roughly **$0.002–$0.005** (less than half a cent).
Anthropic gives new accounts **$5 free credit** — that's 1,000+ scans for free.

---

## Questions?

The app stores your scan history in your browser's local storage.
Uninstalling the app clears history. The API key persists until you clear it.
