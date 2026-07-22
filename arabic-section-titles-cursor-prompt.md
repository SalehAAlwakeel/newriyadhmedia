# Arabic Section Titles — New Copy + Cursor Prompt

No files in the project were edited. This document has two parts: the new Arabic titles I'm proposing, and a ready-to-paste prompt for Cursor to implement them.

## Why change these

Right now `locales/ar.json` is a word-for-word translation of `locales/en.json`. It reads correctly, but it's still English copy wearing Arabic letters — the big section headlines (the `eyebrow` + `title.w1/w2/w3...` pairs that get revealed word-by-word) don't carry their own meaning in Arabic, they just mirror the English sentence structure. Below is a rewrite of every major section headline as a standalone Arabic thought — written to say what the section is actually about, not to match the English word order.

Service/category *labels* (Branding, Strategy, Digital Marketing, etc. — used in the nav, the marquee, and the service card titles) are left alone. Those are functional labels people scan, not story copy, and the existing Arabic (الهوية البصرية, التسويق الرقمي…) is already accurate and natural — retranslating those would just make the menu harder to scan.

## New titles, section by section

| Section (file · key prefix) | English original | Current Arabic (literal) | New Arabic title (meaning-led) |
|---|---|---|---|
| Home · Made in the Kingdom (`index.origin`) | "Proudly Saudi-made, 100% Saudi team." | بفخر، صُنع في السعودية، 100% فريق سعودي. | **سعوديون من الفكرة حتى التسليم.** |
| Home · What we believe (`index.beliefs`) | "Four principles. Every project." | أربعة مبادئ. في كل مشروع. | **قواعدنا الأربع. لا نحيد عنها.** |
| Home · Services (`index.services`) | "What we do." | ماذا نفعل. | **كل ما تحتاجه علامتك، تحت سقف واحد.** |
| Home · Automated Marketing (`index.am`) | "Your marketing shouldn't be your full-time job." | تسويقك لا ينبغي أن يكون وظيفتك الكاملة. | **استراتيجي بدوام كامل، بدون راتب موظف.** |
| Home · Contact (`index.contact`) | "Ready to grow?" | مستعد للنمو؟ | **لنحوّل الفكرة إلى مشروع.** |
| About · What we believe (`about.beliefs`) | same as above | same as above | **قواعدنا الأربع. لا نحيد عنها.** |
| About · By the numbers (`about.stats`) | "A studio, not a stage." | استوديو، لا مسرح للعرض فقط. | **أرقام تُثبت، لا شعارات تُقال.** |
| About · How we work (`about.process`) | "Slow thinking. Sharp making." | تفكير بطيء. تنفيذ حاد. | **نفكر بتأنٍّ. ننفذ بحسم.** |
| About · Made in the Kingdom (`about.kingdom`) | "We know what Saudi brands want, because we are them." | نعرف ماذا تريد العلامات السعودية، لأننا نحن هي. | **نفهم السوق لأننا جزء منه، لا مراقبون له.** |
| About · Work with us (`about.cta`) | "Ready to build something that lasts?" | مستعد لبناء شيء يدوم؟ | **لنبنِ ما يبقى بعد الحملة.** |
| Automated Marketing · Hero (`am.hero`) | "Your marketing shouldn't be your full-time job." | تسويقك لا ينبغي أن يكون وظيفتك الكاملة. | **استراتيجي بدوام كامل، بدون راتب موظف.** |
| AM · Foundation (`am.foundation`) | "Pick your channels. We handle everything else." | اختر قنواتك. ونحن نتولى كل ما عدا ذلك. | **أنت تختار القناة، ونحن نتكفّل بالباقي.** |
| AM · Plans (`am.plans`) | "Three channels. One simple model." | ثلاث قنوات. نموذج بسيط واحد. | **تسعير واضح، بلا تعقيد الباقات.** |
| AM · Why we exist (`am.why`) | "Your business is growing. Your marketing is falling behind." | عملك ينمو. وتسويقك يتخلف عنه. | **عملك يكبر أسرع من قدرتك على تسويقه.** |
| AM · Onboarding (`am.timeline`) | "Live in two weeks. Compounding every month after." | مباشر خلال أسبوعين. ويتراكم كل شهر بعد ذلك. | **أسبوعان للانطلاق، وبعدها ينمو الأثر وحده.** |
| AM · How we compare (`am.compare`) | "Burned by an agency before? You're not alone." | تعرّضت لوكالة من قبل؟ لست وحيداً. | **جربت وكالة وخذلتك؟ القصة مألوفة.** |
| AM · FAQ (`am.faq`) | "Frequently asked questions" | الأسئلة الشائعة | **أسئلة يطرحها كل عميل قبل أن يبدأ.** |
| AM · Get started (`am.cta`) | "Ready to get your marketing off your plate?" | مستعد لإخراج تسويقك من على رأس قائمة مهامك؟ | **حان وقت تشطب التسويق من قائمة همومك.** |
| SaaS platform (`saas`) | "Start today. Pay and go." | ابدأ اليوم. ادفع وانطلق. | **منصة تعمل من اللحظة التي تشترك فيها.** |

Each title above is written as one flowing phrase. The English keys split titles into word-by-word spans (`title.w1`, `title.w2`…) for a staggered scroll-reveal animation, and the Arabic word count/order won't match the English 1:1 — that's expected and handled in the Cursor prompt below.

---

## Prompt to paste into Cursor

```
I want you to rewrite the Arabic section headlines in this site so they read as
original Arabic copy, not as translations of the English site. Do not touch the
English locale file (locales/en.json) or any English content.

Scope: only the big "eyebrow + word-by-word title" headlines in locales/ar.json —
the keys that follow the pattern `<section>.title.w1`, `.w2`, `.w3`... alongside
their `<section>.eyebrow` sibling. Do NOT change service/category labels (nav.*,
index.marquee.*, index.service.*.title, panel.*.title/aria) — those are menu-style
labels and should stay as they are.

Sections to rewrite, with the new Arabic headline for each (write these in as
one natural phrase, then split it into title.w1/w2/w3... keys yourself, breaking
at natural Arabic word boundaries — the Arabic word count will NOT match the
English word count, and that's fine):

1. index.origin.title.w1-5      → "سعوديون من الفكرة حتى التسليم."
2. index.beliefs.title.w1-4     → "قواعدنا الأربع. لا نحيد عنها."
3. index.services.title.w1-4    → "كل ما تحتاجه علامتك، تحت سقف واحد."
4. index.am.title.w1-7          → "استراتيجي بدوام كامل، بدون راتب موظف."
5. index.contact.title.w1-3     → "لنحوّل الفكرة إلى مشروع."
6. about.beliefs.title.w1-4     → "قواعدنا الأربع. لا نحيد عنها."
7. about.stats.title.w1-5       → "أرقام تُثبت، لا شعارات تُقال."
8. about.process.title.w1-4     → "نفكر بتأنٍّ. ننفذ بحسم."
9. about.kingdom.title.w1-10    → "نفهم السوق لأننا جزء منه، لا مراقبون له."
10. about.cta.title.w1-6        → "لنبنِ ما يبقى بعد الحملة."
11. am.hero.title.w1-7          → "استراتيجي بدوام كامل، بدون راتب موظف."
12. am.foundation.title.w1-7    → "أنت تختار القناة، ونحن نتكفّل بالباقي."
13. am.plans.title.w1-5         → "تسعير واضح، بلا تعقيد الباقات."
14. am.why.title.w1-9           → "عملك يكبر أسرع من قدرتك على تسويقه."
15. am.timeline.title.w1-8      → "أسبوعان للانطلاق، وبعدها ينمو الأثر وحده."
16. am.compare.title.w1-8       → "جربت وكالة وخذلتك؟ القصة مألوفة."
17. am.faq.title.w1-2           → "أسئلة يطرحها كل عميل قبل أن يبدأ."
18. am.cta.title.w1-8           → "حان وقت تشطب التسويق من قائمة همومك."
19. saas.title1-5                → "منصة تعمل من اللحظة التي تشترك فيها."

Implementation steps:

1. In locales/ar.json, replace the value of each `title.wN` key for the sections
   above with the corresponding word/phrase-chunk from the new Arabic headline.
   If the new phrase splits into a different number of words than the existing
   number of `.wN` keys for that section, ADD or REMOVE `.wN` keys as needed so
   the key count matches the new word count exactly (e.g. if a section currently
   has title.w1 through title.w5 and the new phrase only needs 3 words, delete
   w4 and w5; if it needs 6 words, add w6).

2. For every locale key you add or remove in ar.json, find every HTML file that
   renders it (index.html, about.html, automated-marketing.html) and update the
   matching `<span class="word reveal" data-i18n="...">` elements so the DOM
   structure has exactly one span per word, in reading order, matching the new
   key list. Follow the existing markup pattern exactly (same classes, same
   `<span class="line">` wrapping, same use of `<em>` for the emphasized word if
   the section currently emphasizes one word — pick a sensible word to keep
   emphasized in the new Arabic phrase, generally the strongest/most distinctive
   word).

3. Leave locales/en.json completely untouched.

4. Do not touch nav.*, index.marquee.*, index.service.*, panel.*.title,
   panel.*.aria, or any body/paragraph copy (`.lede`, `.text`, `.p2`, `.dN`
   bullet keys, FAQ answers, etc.) — only the eyebrow-title headline sections
   listed above.

5. Since Arabic renders right-to-left, double check that the `<em>` emphasis
   and any inline punctuation in the new titles still reads naturally in RTL —
   adjust word order within a title only if needed for RTL readability, but
   keep the meaning intact.

6. After editing, grep the codebase for any leftover references to removed
   `.wN` keys (e.g. `about.kingdom.title.w9`, `.w10`) to make sure nothing
   still references a key that no longer exists, and confirm no unused spans
   are left in the HTML.

Show me a diff of locales/ar.json and each HTML file you touch before finishing.
```
