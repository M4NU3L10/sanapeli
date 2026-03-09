# 🌍 Sanastopeli

> Harjoittele sanastoa eri kielillä — kaunis ja helppokäyttöinen Electron-sovellus Windowsille.

**[⬇️ Lataa uusin versio](https://github.com/M4NU3L10/sanapeli/releases/latest)** · **[🌐 Kotisivu](https://m4nu3l10.github.io/sanapeli)**

---

## ✨ Ominaisuudet

- 🎮 **Neljä pelimuotoa** — kirjoitus, monivalinta, kääntökortit ja rakennuspeli
- 📦 **Omat sanapakettit** — lisää omia JSON-paketteja helposti
- 💾 **Automaattinen edistymisen tallennus** per paketti
- 🎨 **Teemavaihtoehdot** — useita värimaailmoja
- 🪟 **Windows-asennusohjelma** tai kannettava versio (ei asennusta)

---

## ⬇️ Asennus (loppukäyttäjä)

1. Mene [Releases-sivulle](https://github.com/M4NU3L10/sanapeli/releases/latest)
2. Lataa `Sanastopeli Setup x.x.x.exe` (asennusohjelma) tai `Sanastopeli x.x.x.exe` (kannettava)
3. Käynnistä asennus ja seuraa ohjeita

**Vaatimukset:** Windows 10 tai uudempi (x64)

---

## 🛠️ Kehittäjälle

### Vaatimukset

- **Node.js** 18 tai uudempi → https://nodejs.org/
- **npm** (tulee Node.js:n mukana)

### Käyttöönotto

```bat
git clone https://github.com/M4NU3L10/sanapeli.git
cd sanapeli
npm install
```

### Komennot

| Komento | Kuvaus |
|---------|--------|
| `npm start` | Käynnistä kehitystilassa |
| `npm run dev` | Käynnistä kehitystilassa + DevTools |
| `npm run dist:win` | Luo Windows-asennusohjelma (`dist/`-kansioon) |

`dist:win` luo automaattisesti kuvakkeen ja paketoi sovelluksen.

---

## 📚 Sanapakettien lisääminen

Paketit ladataan kahdesta paikasta:

| Kansio | Sisältö |
|--------|---------|
| `packages/` (sovelluksen hakemistossa) | Oletuspaketit, mukana asennuksessa |
| `Omat tiedostot\Sanastopeli\Sanapakettit\` | **Omat pakettisi** — lisää tänne |

Pääset käyttäjän kansioon sovelluksesta **📂 Avaa kansio** -painikkeella.

### Paketin rakenne (JSON)

```json
{
  "name": "Suomi–Ranska: Värit",
  "sourceLanguage": "Suomi",
  "targetLanguage": "Ranska",
  "sourceFlagEmoji": "🇫🇮",
  "targetFlagEmoji": "🇫🇷",
  "words": [
    { "source": "punainen", "target": "rouge",    "article": null, "word": "rouge" },
    { "source": "sininen",  "target": "le bleu",  "article": "le", "word": "bleu"  }
  ]
}
```

| Kenttä | Tyyppi | Kuvaus |
|--------|--------|--------|
| `name` | string | Paketin nimi |
| `sourceLanguage` | string | Lähdekielen nimi |
| `targetLanguage` | string | Kohdekielen nimi |
| `sourceFlagEmoji` | string | Lippuemoji, esim. `"🇫🇮"` |
| `targetFlagEmoji` | string | Lippuemoji, esim. `"🇫🇷"` |
| `words[].source` | string | Sana lähdekielellä |
| `words[].target` | string | Täydellinen käännös (artikkeli + sana) |
| `words[].article` | string\|null | Artikkeli (`"der"`, `"le"` jne.) tai `null` |
| `words[].word` | string | Pelkkä sana ilman artikkelia |

Esimerkki löytyy tiedostosta [`packages/esimerkki-paketti.json`](packages/esimerkki-paketti.json).

---

## 🎮 Pelimuodot

| Muoto | Kuvaus |
|-------|--------|
| **✏️ Kirjoitus** | Kirjoita käännös — artikkeli anteeksi |
| **🔡 Monivalinta** | Valitse neljästä vaihtoehdosta |
| **🪧 Kääntökortit** | Käännä kortti, arvioi itse. Näppäimet ← → |
| **🏗️ Rakenna** | Kokoa sana kirjainpaloista |

---

## 💾 Edistymistiedot

Tallennetaan automaattisesti: `%APPDATA%\Sanastopeli\progress.json`

---

## 🔧 Projektirakenne

```
sanapeli/
├── main.js                  ← Electron pääprosessi
├── preload.js               ← Turvallinen IPC-silta
├── index.html               ← Käyttöliittymä (koko sovellus)
├── package.json             ← Riippuvuudet ja build-asetukset
├── assets/
│   ├── icon.svg             ← Kuvakkeen lähde
│   ├── icon.ico             ← (generoitu automaattisesti)
│   └── icon.png             ← (generoitu automaattisesti)
├── packages/
│   └── esimerkki-paketti.json
├── scripts/
│   └── generate-icon.js
├── build/
│   └── installer.nsh
└── docs/                    ← GitHub Pages -kotisivu
    └── index.html
```
