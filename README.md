# CompressVideo.io 🎬⚡

> **100% Client-Side, Zero-Server Video Compressor in Your Browser.**  
> Shrink large MP4, MOV, and WebM videos without losing quality. No uploads, zero privacy risk, unlimited file sizes, and 100% free forever.

[![Live Site](https://img.shields.io/badge/Live_Site-compressvideo.github.io-10B981?style=for-the-badge&logo=googlechrome&logoColor=white)](https://compressvideo.github.io/)
[![Buy Me A Coffee](https://img.shields.io/badge/Support_Developer-Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/kisharadilz)
[![Astro](https://img.shields.io/badge/Built_With-Astro_5-FF5D01?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build/)
[![WebAssembly](https://img.shields.io/badge/Engine-FFmpeg_WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)](https://ffmpeg.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 🌟 Key Features

- **🔒 100% Client-Side Privacy**: Your video never touches any remote server or cloud bucket. All encoding happens locally in your browser memory (RAM) via FFmpeg WebAssembly.
- **⚡ Hardware-Accelerated WebAssembly**: Powered by `@ffmpeg/ffmpeg` for near-native encoding performance directly inside modern web browsers.
- **🎯 1-Click Compression Presets**:
  - **Smart Balance (Recommended)**: Optimal balance of visual quality with ~50–60% file size reduction.
  - **Discord / Email (< 25MB)**: Automatically calculates bitrate to fit under Discord's 25MB free upload cap.
  - **WhatsApp (< 16MB)**: Targets instant mobile messaging limits.
  - **Custom Controls**: Full control over Constant Rate Factor (CRF 18–38) and resolution scaling (Original, 1080p, 720p, 480p).
- **🌍 Internationalization (i18n)**: Native multi-language support across 6 locales:
  - English (`/` & `/en/`)
  - Español (`/es/`)
  - Português (`/pt/`)
  - Deutsch (`/de/`)
  - Français (`/fr/`)
  - 日本語 (`/ja/`)
- **🌓 Light & Dark Theme**: Sleek minimal design system with zero flash of unstyled content (FOUC).
- **📱 Fully Responsive**: Touch-friendly interface with compact icon-only navigation on smartphones and tablets.
- **🚀 GitHub Pages Optimized**: Seamlessly overcomes cross-origin isolation restrictions using `coi-serviceworker` to enable `SharedArrayBuffer` support on static hosting without custom headers.
- **📈 100% SEO Architecture**: Bidirectional `hreflang` tags, Schema.org (`WebSite`, `WebApplication`, `FAQPage`, `Article`, `HowTo`), Open Graph HD cards, and XML sitemaps.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Astro 5](https://astro.build/) (Static Site Generation / Islands Architecture) |
| **Interactive UI** | [React 19](https://react.dev/) (`client:load` for state management & progress bars) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) (Light `#F8FAFC` & Dark `#0F172A`) |
| **Compression Core** | [@ffmpeg/ffmpeg](https://github.com/ffmpegwasm/ffmpeg.wasm) & [@ffmpeg/util](https://github.com/ffmpegwasm/util) |
| **Service Worker** | [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) (COOP/COEP for GitHub Pages) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Analytics** | Google Analytics 4 (`G-RMPJ514HX2`) |
| **CI/CD** | GitHub Actions (`.github/workflows/deploy.yml`) |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Recommended: `v20+` or `v24+`)
- **npm**, **pnpm**, or **yarn**

### 1. Clone the repository
```bash
git clone https://github.com/compressvideo/compressvideo.github.io.git
cd compressvideo.github.io
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start local development server
```bash
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

### 4. Build for production
```bash
npm run build
```
Static production files are emitted to the `dist/` directory.

### 5. Preview production build
```bash
npm run preview
```

---

## 📂 Project Structure

```
compressvideo.github.io/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions automated deployment
├── public/
│   ├── coi-serviceworker.js        # COOP/COEP Service Worker for WASM
│   ├── favicon.svg                 # Brand SVG icon
│   ├── robots.txt                  # Search engine crawl rules
│   └── sitemap.xml                 # XML sitemap with bidirectional hreflang
├── src/
│   ├── components/
│   │   ├── Compressor.tsx          # React Island (FFmpeg.wasm engine)
│   │   ├── Footer.astro            # Responsive footer with language & guide links
│   │   ├── Header.astro            # Responsive sticky nav (coffee CTA, theme, i18n)
│   │   ├── SEOContent.astro        # Semantic feature cards, steps, and FAQ accordion
│   │   └── SEOHead.astro           # Meta tags, OpenGraph, JSON-LD schemas
│   ├── i18n/
│   │   ├── ui.ts                   # Dictionaries (en, es, pt, de, fr, ja)
│   │   └── utils.ts                # Translation helpers & localized URL generators
│   ├── layouts/
│   │   └── Layout.astro            # Root HTML shell with blocking theme script
│   ├── pages/
│   │   ├── [lang]/
│   │   │   └── index.astro         # Localized static subpaths (en, es, pt, de, fr, ja)
│   │   ├── how-to-compress-large-video-files.astro  # Educational SEO guide
│   │   └── index.astro             # Default English root page (/)
│   └── styles/
│       └── global.css              # Tailwind base, dark mode variables, scrollbars
├── astro.config.mjs                # Astro configuration (React, Tailwind, i18n)
├── package.json
├── tailwind.config.mjs             # Design tokens & color system
└── tsconfig.json                   # Strict TypeScript configuration
```

---

## ⚙️ How It Works Under The Hood

1. **Local File Ingestion**: When a user drops a video file (`.mp4`, `.mov`, `.webm`, `.avi`, `.mkv`), JavaScript reads the binary stream into browser memory without transmitting any data over the network.
2. **SharedArrayBuffer & COOP/COEP**: Modern browsers require Cross-Origin Isolation (`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`) to permit multi-threading and high-memory WebAssembly. Because GitHub Pages does not support custom HTTP headers, [`coi-serviceworker.js`](public/coi-serviceworker.js) transparently intercepts requests and injects these headers locally.
3. **FFmpeg WebAssembly Transcoding**: FFmpeg compiles the frames in virtual memory using `-c:v libx264`, calculates bitrate allocations dynamically, and strips bloat without degrading visual fidelity.
4. **Instant Blob Download**: The encoded MP4 stream is extracted directly from FFmpeg's virtual filesystem and converted into a local browser `Blob` download URL.

---

## 🚢 Deployment to GitHub Pages

This repository is pre-configured with zero-config GitHub Actions deployment:

1. Push your code to the `main` or `master` branch:
   ```bash
   git add .
   git commit -m "feat: deploy CompressVideo"
   git push origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** &rarr; **Pages**.
   - Under **Build and deployment** &gt; **Source**, select **GitHub Actions**.
3. The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) will automatically build and publish your site directly to `https://compressvideo.github.io/`.

---

## ☕ Support the Developer

If you find this free, privacy-first video compression tool useful, please consider supporting the project:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-Support_Kishara-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/kisharadilz)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
