# Patente B

A free learning app for the Italian **Patente B** theory exam, for students and Arabic speakers in Italy whose Italian is still weak.
Everything is explained in **English** and **Egyptian Arabic**, next to the real Italian exam questions.

**Free for everyone, always:** no ads, no payments, no accounts and no tracking of any kind. Open source under the [MIT licence](LICENSE).
One shared app runs on **Android**, **Windows** and the **web**.

For each of the 25 official chapters:

1. **Learn**: a short lesson in plain English, a "remember for the exam" box and the Italian words you will meet.
2. **Watch**: one or more animated, step-by-step scenarios (29 in total) showing the situation visually.
3. **Practise**: every official question on that chapter (7,139 in total), grouped into 636 topics. Each question comes with
   an English translation, highlighted trap words and, after you answer, a short explanation of why it is true or false
   according to the Codice della Strada (with the article number where useful), read aloud automatically.

Everything is also available in **Egyptian Arabic** (right-to-left): tap **ع** in the top bar or pick the language in Settings.
Lessons, scenarios, topic names and all question translations and notes are translated; the Italian question text stays as in the exam.

🔊 buttons read the Italian question, the translation and the explanation aloud (the phone's own text-to-speech engine
in the app, the browser's voices on the web). The animated scenarios have voice narration, engine/siren/indicator
sounds and a ⛶ full-screen mode that turns the phone to landscape. Both can be switched off in Settings.

There is also a **mock exam** (30 questions, 20 minutes, max 3 errors), a **review my mistakes** mode, search, and saved progress.

## Open in Visual Studio

Open `PatenteB.slnx` in Visual Studio 2026 with the **.NET MAUI** and **ASP.NET and web development** workloads.

| Run it on | Startup project | Target in the toolbar |
|---|---|---|
| Web (browser) | `PatenteB.Web` | `http` – press F5, your browser opens at http://localhost:5156 |
| Windows | `PatenteB.App` | `Windows Machine` |
| Android | `PatenteB.App` | an Android emulator or a phone with USB debugging on |

From the command line:

```bash
dotnet run --project src/PatenteB.Web
dotnet build src/PatenteB.App -f net10.0-windows10.0.19041.0
dotnet build src/PatenteB.App -f net10.0-android
```

### Android emulator

An emulator called **PatenteB_Pixel** (Pixel 7, Android 16) is set up in `%LOCALAPPDATA%\Android\Sdk`.
In Visual Studio it appears under **Android Emulators** in the run target list. If it doesn't, point
*Tools › Options › Xamarin › Android Settings › Android SDK Location* at `%LOCALAPPDATA%\Android\Sdk`. From a terminal:

```bash
"%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" -avd PatenteB_Pixel
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" install -r src\PatenteB.App\bin\Debug\net10.0-android\com.patenteb.english-Signed.apk
```

To put it on your own phone, copy `com.patenteb.english-Signed.apk` to the phone and open it, allowing installs from unknown sources.

## How it is built

```
src/
  PatenteB.Web/            ASP.NET Core: serves wwwroot to the browser
    wwwroot/               <- the actual app (HTML/CSS/JS), shared by every platform
      index.html
      css/app.css
      js/app.js            screens: home, chapter (learn/watch/practise), quiz, mock exam, search
      js/lessons.js        the 25 English lessons
      js/scenes.js         SVG animation engine (roads, junctions, signs, lights, cars…)
      js/scenarios.js      the 29 animated scenarios
      js/native.js         text-to-speech and full screen; in the app it talks to MainPage.xaml.cs
      data/questions.js    generated question bank – don't edit by hand
      img/signs/           413 pictures used by the questions
  PatenteB.App/            .NET MAUI (Android + Windows): a HybridWebView that packages ../PatenteB.Web/wwwroot
tools/
  build-data.mjs           rebuilds data/questions.js from the downloaded sources
  topics-en.json           English names for the 636 sub-topics
_downloads/                the downloaded source data (MIT licensed)
```

Change anything in `wwwroot` once and all three versions get it.

### Rebuilding the question bank

```bash
node tools/build-data.mjs
```

This also builds `data/questions-ar.js` from the Arabic translations in `tools/ar/questions/*.tsv` (keyed by a hash of the English text) and `tools/topics-ar.json`.
The legal explanations come from `tools/expl/done/*.tsv` (keyed by a hash of the Italian text and the answer).
`node tools/expl-export.mjs` lists the questions still missing one in `tools/expl/todo/`, and `node tools/expl-check.cjs q-001 …` validates a batch.
If the source questions change, `node tools/ar-export.mjs` lists the texts that still need translating in `tools/ar/todo/`.

### Scenario narration

The scenario captions are read by recorded voices in `wwwroot/audio/narration/<en|ar>/<key>.mp3`. The key is a hash of the caption text.
They are made with [Chatterbox](https://github.com/resemble-ai/chatterbox) (MIT), an open-source speech model.
Every take is transcribed back with Whisper, and garbled takes are recorded again.

After changing a caption in `scenarios.js` or `scenarios-ar.js`:

```bash
node tools/narration/export.mjs
python tools/narration/make-audio.py
```

`make-audio.py` needs Python 3.11 and an NVIDIA GPU; its first lines show how to install the requirements. It records only the missing clips.
A caption without a recording falls back to the device's own voice.

`node tools/licenses.mjs` rebuilds `licenses.html`.

## Sources and licences

- Questions and pictures: [Ed0ardo/QuizPatenteB](https://github.com/Ed0ardo/QuizPatenteB) (MIT), the official ministry list as of 2023.
- English translations, trap words and sign explanations: [MathKidsClub/Italian-Driving-Theory-Tester](https://github.com/MathKidsClub/Italian-Driving-Theory-Tester) (MIT).
  These are machine-assisted, so treat them as a study aid. The real exam is in Italian.
- Lessons and scenarios were written for this app. Rules change, so check the current *Codice della Strada* before the exam.

This is an unofficial study tool. The app itself is MIT licensed ([LICENSE](LICENSE)); the sources above keep their own MIT licences. The privacy policy, licences and security contact are in `wwwroot/privacy.html`, `licenses.html` and `security.html` (also linked from Settings in the app).

## Releasing

See [RELEASE.md](RELEASE.md) for publishing to Google Play and the Microsoft Store (signing, store forms, listings in English and Arabic, GDPR and Cyber Resilience Act). The web version is published to https://menfen.github.io/Patente-B/ by GitHub Pages.
