# Releasing to Google Play and the Microsoft Store

This checklist covers signing, Play Console forms and the legal side (GDPR, the EU Cyber Resilience Act, the Digital Services Act, Play policies) as of October 2026.
It is a practical checklist, not legal advice.

## 1. Signing

- **Upload key:** `%USERPROFILE%\.android-keys\patenteb\patenteb-upload.keystore` (alias `upload`, RSA 4096, valid until 2054).
  Its password is in `password.txt` in the same folder. Neither file is in the project; never commit or share them.
- **Back up that folder now** to two places (for example a password manager and an encrypted USB stick).
  With Play App Signing a lost upload key can be reset through Play support, but that takes days.
- Upload key SHA-256 fingerprint:
  `8F:43:33:2D:2A:2B:9F:17:FC:B1:10:E0:76:76:A0:32:C4:D7:69:A6:49:89:43:D7:E1:31:6F:B2:9C:92:D2:0D`
- In Play Console, keep **Play App Signing** on (the default). Google holds the app signing key, and you upload builds signed with the upload key.

Build the release bundle:

```bash
dotnet publish src/PatenteB.App -f net10.0-android -c Release -o publish/android
```

Upload `publish/android/com.patenteb.english-Signed.aab` to Play. The `-Signed.apk` next to it is for sideloading.
Before each new upload, raise `ApplicationVersion` (the version code) in `src/PatenteB.App/PatenteB.App.csproj` by one, and raise `ApplicationDisplayVersion` when users should see a new version.
To build on another machine, pass `-p:PatenteBKeyDir=<folder with the keystore and password.txt>`.

The package name `com.patenteb.english` cannot change after the first upload.

## 2. Play Console account

- **New personal developer accounts:** before you can publish to production, the app must run a **closed test with at least 12 testers who stay opted in for 14 days in a row**. Plan for this first. Organisation accounts are exempt.
- **Identity verification:** complete it in Play Console. The developer name and email address are shown publicly.
- **EU Digital Services Act trader status:** Play asks whether you are a "trader".
  - If the app is free, has no ads and no in-app purchases, and you are not publishing it as part of a business, you can usually declare **non-trader**.
  - If you are a trader (for example you publish it as a company or monetise it), your address, phone number and email are shown on the listing.

## 3. Play Console forms

| Form | Answer |
|---|---|
| **Privacy policy URL** | `https://menfen.github.io/Patente-B/privacy.html` (published by GitHub Pages, see section 8). |
| **Data safety** | Does the app collect or share user data? **No.** (No internet permission. Progress stays on the device. Android backup is handled by Google, not by the app, so it is not "collection".) Data encrypted in transit: not applicable. Account deletion: not applicable, there are no accounts. |
| **Ads** | No ads. |
| **App access** | All functionality is available without special access. |
| **Target audience** | 18 and over. Patente B is from 18, and choosing this keeps the app out of the Families programme. |
| **Content rating (IARC)** | Category "Reference, News or Educational". Answer No to violence, sexuality, language, controlled substances, gambling, user interaction, sharing location and digital purchases. The expected rating is PEGI 3 / Everyone. |
| **News app** | No. |
| **Government apps** | No. The app does not represent a government body. |
| **Health / financial features** | None. |
| **Category** | Education. |

### Store listing text

**Short description** (80 characters max):

> Free Patente B theory exam prep in English & Arabic. No ads, no tracking.

**Full description** (start with the disclaimer below, then):

> Studying for the Italian driving licence but your Italian is not strong yet? Patente B explains every official quiz question in English and in Egyptian Arabic (مصري), next to the real Italian text you will see in the exam.
>
> • All 7,139 official ministerial questions, grouped into 25 chapters and 636 topics
> • A short lesson for every chapter, in plain English or Egyptian Arabic, with the Italian words you need
> • Animated road scenarios with voice narration, full screen in landscape
> • After every answer: why it is true or false, according to the Codice della Strada
> • Listen to the question in Italian, and to the translation and explanation
> • Mock exam (30 questions, 20 minutes, max 3 mistakes) and review of your mistakes
> • Works offline
>
> Free for everyone, always. No ads, no payments, no account, no tracking. Your progress stays on your phone. Open source under the MIT licence.

### Store listing in Arabic

In Play Console, open **Store presence → Main store listing → Manage translations → Add your own translation**, choose **Arabic – ar**, and paste the following.

**Short description:**

> تحضير مجاني لامتحان الباتينتي B بالإنجليزي والعربي. من غير إعلانات ولا تتبّع.

**Full description:**

> تطبيق مذاكرة مش رسمي. مالوش علاقة بوزارة البنية التحتية والنقل الإيطالية (MIT) ولا بالـ Motorizzazione Civile. الأسئلة من القايمة الوزارية العامة. المعلومات الرسمية: https://www.ilportaledellautomobilista.it
>
> بتذاكر لرخصة السواقة الإيطالية والإيطالي بتاعك لسه مش قوي؟ Patente B بيشرحلك كل سؤال رسمي بالمصري وبالإنجليزي، جنب النص الإيطالي الحقيقي اللي هتشوفه في الامتحان.
>
> • كل الـ 7,139 سؤال الوزاري الرسمي، متقسمين على 25 فصل و636 موضوع
> • درس قصير لكل فصل بالمصري أو بالإنجليزي، مع الكلمات الإيطالي اللي محتاجها
> • سيناريوهات طريق متحركة بصوت بيشرح، وتقدر تكبّرها بالعرض
> • بعد كل إجابة: ليه صح أو غلط، حسب الـ Codice della Strada
> • اسمع السؤال بالإيطالي، واسمع الترجمة والشرح
> • امتحان تجريبي (30 سؤال، 20 دقيقة، 3 غلطات بالكتير) ومراجعة غلطاتك
> • بيشتغل من غير إنترنت
>
> ببلاش للكل، على طول. مفيش إعلانات ولا فلوس ولا حساب ولا أي تتبّع. تقدّمك بيفضل على موبايلك. مفتوح المصدر برخصة MIT.

The screenshots already include the Arabic version of the app, so the same images work for both languages.

### Store listing: required disclaimer

Play's misrepresentation policy requires apps that present government information to state clearly that they are not affiliated with the government, and to link to the official source.
Put this at the **top of the full description**:

> Unofficial study app. Not affiliated with or endorsed by the Italian Ministry of Infrastructure and Transport (MIT) or the Motorizzazione Civile.
> Questions are taken from the public ministerial quiz list. Official information: https://www.ilportaledellautomobilista.it

The same text is in the app under **Settings → About, privacy and disclaimer**.

Also:

- Don't use the Italian Republic emblem, the MIT logo or the Motorizzazione logo in the icon or screenshots.
- Don't call the app "official" or claim a pass rate.
- **App name on Play: Patente B – English & عربي** (26 characters). The phone launcher shows **Patente B**. Don't add "Ufficiale" or "MIT".
- Package name: `com.patenteb.english` (final).

## 4. Content and copyright

- Questions and sign pictures: [Ed0ardo/QuizPatenteB](https://github.com/Ed0ardo/QuizPatenteB) (MIT). The underlying ministerial list is published by the Italian state. Article 5 of the Italian copyright law (L. 633/1941) excludes official state acts from copyright. The ministerial quiz list is widely reused on this basis, though it has not been formally confirmed.
- English notes: [MathKidsClub/Italian-Driving-Theory-Tester](https://github.com/MathKidsClub/Italian-Driving-Theory-Tester) (MIT).
- The MIT licences require shipping the copyright notices. They are in `licenses.html` in the app, linked from Settings, together with the .NET MAUI licence and the Open Sans font (SIL OFL 1.1).
- **Accuracy:**
  - The question list dates from 2023. Check whether the ministry has published a newer list before release.
  - The explanations and translations were written with AI. The app says so and says they are not legal advice.
  - Wrong legal information is the main real-world risk in this app. Have someone who knows the Codice della Strada spot-check a sample, especially the explanations that cite article numbers.

## 5. GDPR

- The app processes no personal data on any server, and the Android app has no `INTERNET` permission. GDPR obligations are therefore minimal.
- Still publish the privacy policy (Play requires one) and give a contact address.
- There is no consent banner, because there are no cookies or trackers. The web version stores progress in `localStorage`. That counts as storage "strictly necessary" for a service the user asked for, so it needs no consent under the ePrivacy rules.
- If you ever add analytics, crash reporting, ads or a backend, this changes. You would need to update the Data safety form, the privacy policy and probably add consent.

## 6. EU Cyber Resilience Act (Regulation (EU) 2024/2847)

**Does it apply?**
- The CRA covers "products with digital elements", which includes apps, made available **in the course of a commercial activity**.
- A free app with no ads, no in-app purchases and no other monetisation, published by an individual, is arguably outside "commercial activity". The guidance on this is still developing.
- Charging for the app, adding ads or in-app purchases, or publishing it through a business clearly brings it in scope.
- Doing the basics below costs little and covers you either way.

**Dates:**
- 11 September 2026 (already in force): manufacturers must report **actively exploited vulnerabilities** and severe security incidents through ENISA's single reporting platform:
  - early warning within 24 h
  - notification within 72 h
  - final report within 14 days after a fix
- 11 December 2027: all essential requirements, conformity assessment, EU declaration of conformity and CE marking apply to products placed on the market from that date.

**Classification:** a driving-theory study app is a default-category product (not "important" or "critical"). Conformity is by **self-assessment** (module A, internal control).

**Status of this app:**

| CRA item | Status |
|---|---|
| Secure by default, minimal attack surface | ✅ No internet permission, no accounts, no server, no dangerous permissions, no exported components besides the launcher, nothing loaded from the network. |
| Data minimisation and confidentiality | ✅ No personal data leaves the device. |
| Vulnerability handling policy and contact | ✅ `security.html`. |
| Security updates through a support period | ✅ Stated support period until 31 Dec 2031 in `security.html`. Updates go out via Play. Change the date if you want a different commitment, but CRA expects at least 5 years unless the product is expected to be used for less time. |
| Software bill of materials (SBOM) | ⏳ Needed in the technical file by Dec 2027, but doesn't have to be published. Generate with `dotnet tool install --global CycloneDX` then `dotnet-CycloneDX src/PatenteB.App/PatenteB.App.csproj -o sbom`. Main components: .NET 10 runtime, .NET MAUI 10.0.110, Microsoft.Extensions.Logging.Debug 10.0.0, AndroidX libraries pulled in by MAUI. |
| Technical documentation, risk assessment, EU declaration of conformity, CE marking | ⏳ Needed by 11 Dec 2027 if in scope. Keep a short risk assessment ("offline app, no data, threats: tampered APK (mitigated by Play signing), vulnerable dependency (mitigated by updating .NET/MAUI)"). |
| Keep dependencies patched | Ongoing. Rebuild with the latest .NET 10 servicing release a few times a year, and when a .NET/MAUI or Android WebView security advisory affects you. |

## 7. Other Play technical requirements

- Target API level: the build targets **API 36 (Android 16)**, which is what Play requires for new apps and updates from 31 August 2026. Min SDK is 24 (Android 7.0).
- Format: Android App Bundle (`.aab`) signed with the upload key. ✅
- 16 KB memory page size support (required for apps targeting Android 15+): .NET 10 produces 16 KB-aligned native libraries. ✅
- Listing assets, ready in `store/`:
  - `store/icon-512.png`: app icon, 512×512 PNG. Play rounds the corners itself.
  - `store/feature-graphic.png`: 1024×500 feature graphic.
  - `store/screenshots/`: 8 phone screenshots, 1080×1920 (9:16). In order: home, lesson, animated scenario, question and explanation in English, then home, question and explanation in Egyptian Arabic.
  - Short and full description: see "Store listing text" above.
  - Sources are in `store/src/` (the icon SVG and the feature-graphic HTML). Re-render them with headless Chrome at 512×512 and 1024×500.

## 8. Website and privacy policy (GitHub Pages)

`.github/workflows/pages.yml` publishes `src/PatenteB.Web/wwwroot` (the full web app, plus `privacy.html`, `licenses.html` and `security.html`) whenever it changes on `main`.

One-time setup: on GitHub, open the repository's **Settings → Pages** and set **Source** to **GitHub Actions**. Then run the workflow once (**Actions → Publish web app → Run workflow**). The addresses are:

- App: https://menfen.github.io/Patente-B/
- Privacy policy (for Play Console and Partner Center): https://menfen.github.io/Patente-B/privacy.html

## 9. Microsoft Store (Windows)

1. **Account:** sign up at https://partner.microsoft.com/dashboard/registration as an **individual** developer. It is free for individuals. Verify your identity.
2. **Reserve the name:** in Partner Center, choose **Apps and games → New product → MSIX or PWA app** and reserve **Patente B – English & عربي**.
3. **Identity:** open the app's **Product identity** page. Copy these into `src/PatenteB.App/Platforms/Windows/Package.appxmanifest`:
   - **Package/Identity/Name** → the `Name` attribute of `<Identity>`
   - **Package/Identity/Publisher** → the `Publisher` attribute (it looks like `CN=XXXXXXXX-XXXX-…`)
   - **Package/Properties/PublisherDisplayName** → `<PublisherDisplayName>`
4. **Build the package:**

   ```bash
   dotnet publish src/PatenteB.App -f net10.0-windows10.0.19041.0 -c Release -p:WindowsStore=true -p:RuntimeIdentifierOverride=win-x64
   ```

   The upload file is `publish/windows/PatenteB.App_1.0.<version>.0_Test/PatenteB.App_1.0.<version>.0_x64.msix`.
   - The Store signs it, so it is deliberately unsigned.
   - The Store requires the last part of the version to be 0. The build turns `ApplicationVersion` *N* into 1.0.*N*.0, so raise `ApplicationVersion` for every new upload, as for Play.
5. **Submission:**

   | Section | What to enter |
   |---|---|
   | Pricing and availability | Free, all markets |
   | Properties | Category Education. Privacy policy URL from section 8. No additional system requirements. |
   | Age ratings | IARC questionnaire, same answers as for Play |
   | Packages | Upload the `.msix` |
   | Store listings | English and Arabic descriptions from section 3; screenshots from `store/screenshots-windows/` (1920×1080); logo `store/icon-512.png` |

   The `runFullTrust` capability is standard for .NET MAUI desktop apps. If Partner Center asks about it, explain: "Desktop app built with .NET MAUI / Windows App SDK."
6. Certification usually takes 1–3 days.
