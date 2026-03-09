# 🌍 Sanastopeli — Windows-sovellus

Sanastoa harjoitteleva Electron-sovellus Windowsille. Tukee useita kielipareja, omien sanapakettien lisäämistä ja tallentaa edistymisen automaattisesti.

---

## 📦 Vaatimukset

- **Node.js** 18 tai uudempi → https://nodejs.org/
- **npm** (tulee Node.js:n mukana)
- **Windows 10 tai uudempi** (x64)

---

## 🚀 Käyttöönotto

### 1. Asenna riippuvuudet

```bat
cd sanapeli
npm install
```

### 2. Testaa sovellus kehitystilassa

```bat
npm start
```

Sovellus avautuu välittömästi. Voit käynnistää DevToolsin lisäämällä `--dev`-lipun:

```bat
npm run dev
```

### 3. Luo Windows-asennusohjelma

```bat
npm run dist:win
```

Tämä:
1. Luo kuvakkeen (`assets/icon.ico` ja `icon.png`)
2. Paketoi Electron-sovelluksen
3. Luo `dist/`-kansioon:
   - `Sanastopeli Setup x.x.x.exe` — asennusohjelma
   - `Sanastopeli x.x.x.exe` — kannettava versio (ei asennusta)

---

## 📚 Sanapakettien lisääminen

### Missä paketit sijaitsevat?

Paketit ladataan kahdesta paikasta:

| Kansio | Sisältö |
|--------|---------|
| `packages/` (sovelluksen hakemistossa) | Oletuspaketit, tulevat asennukseen mukaan |
| `Omat tiedostot\Sanastopeli\Sanapakettit\` | **Omat pakettisi** — lisää tänne |

Pääset käyttäjän kansioon sovelluksesta: **📂 Avaa kansio** -painike.

### Paketin rakenne (JSON)

Luo `.json`-tiedosto seuraavalla rakenteella:

```json
{
  "name": "Suomi–Ranska: Värit",
  "sourceLanguage": "Suomi",
  "targetLanguage": "Ranska",
  "sourceFlagEmoji": "🇫🇮",
  "targetFlagEmoji": "🇫🇷",
  "words": [
    {
      "source": "punainen",
      "target": "rouge",
      "article": null,
      "word": "rouge"
    },
    {
      "source": "sininen",
      "target": "le bleu",
      "article": "le",
      "word": "bleu"
    }
  ]
}
```

#### Kenttien selitykset

| Kenttä | Tyyppi | Kuvaus |
|--------|--------|--------|
| `name` | string | Paketin nimi (näkyy valintanäytöllä) |
| `sourceLanguage` | string | Lähdekielen nimi suomeksi |
| `targetLanguage` | string | Kohdekielen nimi suomeksi |
| `sourceFlagEmoji` | string | Lippuemoji (esim. `"🇫🇮"`) |
| `targetFlagEmoji` | string | Lippuemoji (esim. `"🇫🇷"`) |
| `words` | array | Sanaparit |
| `words[].source` | string | Sana lähdekielellä |
| `words[].target` | string | Täydellinen käännös (artikkeli + sana) |
| `words[].article` | string\|null | Artikkeli (`"der"`, `"die"`, `"das"`, `"le"`, `"la"`…) tai `null` |
| `words[].word` | string | Pelkkä sana ilman artikkelia (käytetään rakennusmoodissa) |

> **Vinkki:** Artikkeli ei ole pakollinen — kirjoita `article: null` ja `word` samaksi kuin `target`.

---

## 🎮 Pelimuodot

| Muoto | Kuvaus |
|-------|--------|
| **✏️ Kirjoitus** | Kirjoita käännös; artikkeli anteeksi (saa pisteen ilman sitä) |
| **🔡 Monivalinta** | Valitse neljästä vaihtoehdosta |
| **🪧 Kääntökortit** | Kortti: käännä, arvioi itse. Nuolinäppäimet ← → toimivat |
| **🏗️ Rakenna** | Kokoa sana kirjainpaloista |

---

## 💾 Edistymisen tallentaminen

Sovellus tallentaa edistymisen automaattisesti jokaisen pelisession jälkeen:

- **Sijainti:** `%APPDATA%\Sanastopeli\progress.json`
- **Tallennettavat tiedot:** pelattujen kierrosten määrä, oikeiden vastausten määrä, viimeisin peliaika per paketti

---

## 🔧 Rakenne

```
sanapeli/
├── main.js             ← Electron pääprosessi
├── preload.js          ← Turvallinen IPC-silta
├── index.html          ← Käyttöliittymä
├── package.json        ← Riippuvuudet ja build-asetukset
├── assets/
│   ├── icon.svg        ← Kuvakkeen lähde
│   ├── icon.png        ← (generoitu automaattisesti)
│   └── icon.ico        ← (generoitu automaattisesti)
├── packages/           ← Oletussanapaketit (tulevat asennuksen mukaan)
│   ├── suomi-saksa-asuminen.json
│   └── esimerkki-paketti.json
├── scripts/
│   └── generate-icon.js
└── build/
```
