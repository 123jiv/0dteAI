# UNSETLD design spec (final)

Winner: A: Editorial Monochrome ("The Book") as the skeleton (reader, IA, product-page paywall, barcode record + access road, monochrome widgets, milestone letters). The build grafts in Direction C's standard and night check, C's cover figure, 'on record' vocabulary and Sun Fade colorway, and the voice guide's plain chapter names. Final name for the build: UNSETLD 2.0, 'one line every morning, and a record of the days you showed up.'

## Grafts

- From C: 'Set your standard.' The user picks three plain rules (or writes one). This replaces A's brand-imposed 'Three rules' manifesto and gives the night check a concrete question.
- From C: the night check as a full page inside the pager after the chosen time, plus an actionable notification. Answers are Held / Not today, and an honest 'Not today' never costs the day on record.
- From C: the first screen's figure is a flat bone walker standing on a full-width hairline 'ground' with a mono 'FIG. 01' caption and 'VOL. 001' top-right. It replaces A's embossed walker, which reads as plastic. A's 'unsettled adj.' headword and letter-drop sit under it.
- From C: 'Colorway' instead of 'Wash' (clearer to a streetwear audience). Sun Fade becomes the hero Full Edition colorway. Locked colorways preview live on the reader behind the sheet before any paywall.
- From C: 'on record' vocabulary and the screen name 'Record', replacing 'days walked' (step-counter confusion). 'Day N' always means the Nth day on record.
- From C: the pause rule. After 14 days with nothing on record, early access and member prices pause until 7 more days go on record. The count and milestones never drop. It lives only on the Details page.
- From C: the Standard lock-screen widget (your three rules) and the 7-square week row on the Record small widget.
- From C: one quiet text line under Access when a member price is open and unused: 'Your member price is open. Use it at unsetld.com'.
- From B: the only day-counted feedback. On the first view of each day, the running head reads 'DAY 41' for 2.5 s, then crossfades to the chapter, with one soft haptic. No toast.
- From B: one global numbered Today's line (same No. for everyone, always clean) as page 1 each day, like a daily drop.
- From B: the trial-ineligible Annual CTA ('Subscribe for $24.99 a year', timeline hidden) and the day-2 trial reminder notification.
- From B: a comeback letter when paused access reopens.
- From B: long-press 'Don't show this line again'.
- From the teardown and voice editor: the free daily end card after 10 lines, using the voice line 'You've read enough lines like this one. Go do the work.' It is a ritual, not a counter.
- From the voice guide (overrides all three directions): plain chapter names Discipline, Focus, Training, Money, Confidence, Vices, Stoic. Strong language is a Settings switch, on by default, never asked in onboarding. Public surfaces filter to clean lines automatically.
- From C (optional, ships only if the traced art is approved): the Evolution three-figure print as a free lock-screen wallpaper and as the art on the Day 365 letter.

## Spec

UNSETLD 2.0: FINAL SPEC (build exactly this)

0. PRODUCT CONCEPT
UNSETLD is a daily line for the unsettled, built like the Motivation app.

The daily loop:
- One raw, original line every morning, on the lock screen and as the notification itself.
- Swipe up for more lines from the chapters you chose.
- Each night, one question about the three-rule standard you set for yourself: did you hold it?
- Every day you open the line goes ON RECORD.
- Days on record open ACCESS to the clothing brand: drops 24 hours early, a capped member price, a numbered patch, and a piece made only for people who reach a year. Access is never sold.

The brand lives in the system, not in a shop:
- the name (unsettled minus two letters)
- the faceless walking figure
- catalogue numbers (No. 0412, Volume 001)
- colorways cut from the garments' own washes (Snow Wash, Sun Fade)
- a record drawn like a garment-tag barcode
- the tagline 'Never settle for less'

The app must work for someone who never buys a hoodie.

App Store name: UNSETLD: Daily Discipline. Subtitle: One line every morning. Age rating: declare Frequent profanity, which gives 13+.

NON-NEGOTIABLE RULES FOR THE BUILD
1. The reader shows the line and nothing that competes with it: no counters, streaks, XP, pills, toasts or tab bar.
2. One colour signal: red #C41E1E means 'today' on the record barcode and the week squares, and appears nowhere else. No red buttons, borders, badges or text.
3. Hairlines and space, never cards. Corners are 0 (selectors, swatches, squares) or 2pt (buttons). No 16pt-radius boxes anywhere.
4. Widgets, notifications, the onboarding lines, the paywall, App Store screenshots and the default share preview use clean lines only (explicit=false), always.
5. Rewards appear only on the Record screen, in milestone letters and on milestone detail pages. They never appear in onboarding, the reader, widgets, notifications, the paywall or share cards.
6. Never ship 'coming soon', 'PREVIEW' or debug UI in production builds. DevTools only under __DEV__.
7. Display layer converts straight quotes to typographic (' → ’, " → “ ”) in lines and UI copy.

1. INFORMATION ARCHITECTURE

Navigation is a React Navigation native-stack. There is no tab bar. Remove @react-navigation/bottom-tabs.

ROOT STACK
- Onboarding (first run only): O1 Name → O2 First line → O3 Standard → O4 Chapters → O5 Your day → O6 Widget → Paywall (modal) → Reader.
- Reader (root, full-bleed vertical pager).
- Record (push, from the walker glyph bottom-right of the reader).
- Settings (push, from 'Settings' top-right of Record). Sub-pages:
  - Reminders
  - Your standard
  - Saved
  - Your lines
  - Add a widget
  - Wallpapers (only if art approved)
  - Account
  - How the record works
  - Access terms
  - Terms of Use
  - Privacy Policy
- Milestone detail (push, from a row on Record).

SHEETS (presentation 'formSheet', grabber visible, sheetCornerRadius 14, background #141414)
- Chapters: detent 0.92.
- Colorway: detents [0.6, 0.92], opens at 0.6 so the reader stays visible as a live preview.
- Share: detent 0.92.
- Time picker: detent 0.42.

MODALS (fullScreenModal)
- Paywall.
- Milestone letter.
- Never stack two modals. Never present one mid-swipe. Queue a letter until the reader is idle for 600 ms.

DEEP LINKS (scheme unsetld)
- unsetld://line/{no}: opens the reader with that line as page 1 and records the day.
- unsetld://today
- unsetld://record
- unsetld://night-check: opens with the night check as page 1.

READER PAGER ORDER EACH DAY
1. Night check page, if enabled, after its time, unanswered, and before the 4:00 AM boundary.
2. Today's line (global, numbered, clean).
3. One-time page, if due. At most one per day, in this priority:
   - Day 3 access intro
   - New volume
   - Library exhausted (shown in place of the next line)
4. Mix lines.
5. Your lines: every 5th page if the user has any (Full Edition).
6. Free tier only: the end card after the 10th line of the day.

Today's line and mix lines count toward the 10. Night check and one-time pages don't.

FREE vs FULL EDITION
- Free:
  - Discipline (always on) plus one more chapter of your choice, changeable any time
  - Black colorway
  - 10 lines a day
  - up to 3 reminders a day
  - night check and your standard
  - saved lines and sharing
  - every widget, rendered in Black
  - the Record and all of Access (rewards are never paywalled)
  - wallpapers
- Full Edition:
  - all 7 chapters and every new volume
  - all 10 colorways, in the app and on widgets
  - no daily line limit
  - up to 10 reminders a day
  - Your lines (write your own)
- No ads, no ATT prompt, no tracking SDKs, in either tier.

2. DESIGN TOKENS

COLOUR (UI chrome is always on ink; colorways apply only to the reader pages, share cards and widgets)
- ink #0A0A0A: canvas, bone-button text.
- raise #141414: sheets only.
- rule #2A2825: hairlines (StyleSheet.hairlineWidth).
- rule-strong #3A3633: road future segment, timeline track, segmented borders.
- bone #EDE9E3: primary text, primary button fill, selected squares. 16.4:1 on ink.
- stone #8F8A83: secondary text. 5.8:1 on ink, 5.4:1 on raise.
- muted #B3AEA7: unselected row and plan text. 9.0:1.
- ash #57534E: empty-square outlines, disabled button border/text, missed-day stubs. Never text under 18pt.
- grey-letter #45423E: the two dropped letters in the O1 headword only.
- signal #C41E1E: today only. Barcode bar, week square. Never a fill, button, badge, border or text.

COLORWAYS (id / name / background / ink / secondary / rule / status bar / free)
Contrast was measured, and every secondary colour is at least 4.5:1 on its background.
1. black / Black / solid #0A0A0A / #EDE9E3 / #8F8A83 / #2A2825 / light / FREE
2. bone / Bone / #EDE9E3 + plate bone-paper.jpg (paper fibre, 6%) / #11100F / #5C574F / #CFC9C0 / dark
3. snow-wash / Snow Wash / base #BDB9B2 + plate snow-wash.jpg (cloud mottle, ±8% luminance, ~600px blotches) / #11100F / #433F3A / #9E9A93 / dark
4. sun-fade / Sun Fade / plate sun-fade.jpg / #EDE9E3 / #D4CFC8 / rgba(237,233,227,0.18) / light
   - Radial airbrush centred at 52% x, 46% y: #55524D → #3A3835 at r 45% → #1D1C1B at r 85% → #121110 at the edge.
   - Extra 25% darkening burn in the top-left and bottom-right corners.
   - Soft-light mottle at 18%, mono grain at 4%.
   - The centre must never exceed #55524D.
5. concrete / Concrete / base #8F8A84 + plate concrete.jpg (aggregate speckle + two faint water stains) / #0E0D0C / #22201E / #77726C / dark
6. charcoal / Charcoal / #1E1D1B + plate charcoal.jpg (heather grain, 5%) / #EDE9E3 / #A09B94 / #363431 / light
7. plum / Plum / LinearGradient #3F2F38 (top) → #33262D (bottom) / #EDE9E3 / #C2B6BB / #523F49 / light
8. coffee / Coffee / LinearGradient #403329 → #34291F / #EDE9E3 / #C3B8AE / #54453A / light
9. olive / Olive / LinearGradient #3E3F31 → #333428 / #EDE9E3 / #BDBCAD / #515241 / light
10. midnight / Midnight / #0C0F16 + plate midnight.jpg (sodium glow: radial at 88% x, 8% y, rgba(214,170,104,0.16) fading to transparent over 70% of the width) / #EDE9E3 / #959BA6 / #232733 / light

Plates are generated by scripts/gen_colorways.py (it replaces gen_textures.py). Outputs:
- Reader plate: 1290x2796 JPG, q82, ≤300 KB, rendered with expo-image contentFit cover.
- Widget plate: 1024x1024 JPG, q80.
- Swatch: 324x576 JPG.

The background layer sits fixed behind the pager. It never scrolls with the pages.

TYPE (bundled with expo-font via @expo-google-fonts)
- Cormorant Garamond: 400Regular (big numerals only), 500Medium, 500Medium_Italic.
- Inter: 400, 500, 600.
- IBM Plex Mono: 400. Add the @expo-google-fonts/ibm-plex-mono package.

Serif scale (Cormorant 500, sizes as fontSize/lineHeight/letterSpacing in pt):
- line.xl 52/54/-0.8 (≤32 characters)
- line.l 46/48/-0.7 (33–56)
- line.m 40/43/-0.5 (57–80)
- line.s 34/37/-0.3 (>80, attributed quotes only)
- headword 64/66/-1.0
- title.xl 44/46/-0.6: onboarding, paywall and page titles
- title.l 40/43/-0.5: night check question, end card
- title.m 30/34/-0.3: section titles
- letter.day 56/58/-0.8: milestone 'Day 30.'
- letter.sub 28/32/0, in stone
- list 23/27/0: chapter names, standard rules, definitions
- saved 20/24/0
- italic accent: Cormorant 500 italic 24/28, stone
- numeral: Cormorant 400 112/100/-3, fontVariant ['lining-nums','tabular-nums']

Inter:
- price 17/22 600 tabular
- row 16/22 500
- body 15/22 400
- small 14/20 400
- note 13/18 400
- fine 12/17 400
- label: Inter 500 10.5/14, uppercase, letterSpacing 2.6, stone. At most one label per block.
- button: Inter 600 12.5/16, uppercase, letterSpacing 2.5.

IBM Plex Mono 400:
- mono 11/14, letterSpacing 0.4
- mono.s 10/13
- mono.l 17/22: numbers like No. 0412, 007, 23 AUG, 02 / 04, stats.

Line sizing and breaks:
- The line size steps by character count.
- Each sentence starts on a new line within the block when there are two beats.
- iOS lineBreakStrategyIOS='push-out' (no orphans).
- Optional authored breaks: content may include '\n'.
- Scale all serif sizes by min(1, screenWidth/390).
- Lines use allowFontScaling={false}. UI text uses maxFontSizeMultiplier 1.3.

SPACE
- 8pt grid.
- Side margin 28pt on every screen. Content width 334 on a 390-wide screen.
- Gaps: 12–16 within a group, 32–56 between groups.
- Row heights: standard and definition rows 48–52, chapter rows 60, plan rows 64, settings rows 52, milestone rows ≥64, spec rows 40.
- Primary button: 54pt tall, bottom edge at safeBottom + 16.
- Every hit area is at least 44pt.
- Scrolling screens with a fixed bottom button get a 24pt ink fade above the button bar.

RADII
- Buttons: 2.
- Squares, swatches, share cards, selectors, plan rows, video frame: 0.
- Sheets: native 14.
- Widgets: system.

BUTTONS
- Primary: bone fill, ink label (button style). Pressed: opacity 0.85. Disabled: transparent fill, 1pt ash border, ash label.
- Outline: transparent, 1pt bone border at 40% opacity, bone label.
- Text button: Inter 15 stone, no underline.
- Inline link: bone, 0.5pt underline.

SELECTION
- Always a 14pt square: filled bone = on, 1pt ash outline = off.
- The whole row is the hit area.
- No check circles or checkmarks.

SEGMENTED CONTROL (custom)
- Cells 32 tall, 1pt rule-strong border, 0 radius.
- Selected cell: bone fill, ink Inter 500 14. Others: stone text.
- Disabled cells: ash text.
- Selection haptic on change.

ICONS (custom SVG via react-native-svg; 24 grid; 1.5pt stroke; round caps and joins; stone unless noted)
- bookmark: save; fills with the colorway ink when saved.
- share: iOS share box and arrow.
- index: three left-aligned lines, 18 / 14 / 10 wide, 5pt apart.
- colorway: square with the lower-right triangle filled.
- chevron-left, close (X), chevron-right (7x12, rows).
- The walker glyph is a filled SVG, not a stroke icon.
- No SF Symbols in content. No emoji, flames, shields, bolts, chevron ranks, padlocks or bag icons.

THE WALKER (the only illustration)
- Source: /tmp/claude-0/design/editorial/walker.svg → assets/brand/walker.svg.
- viewBox '267 12 301 669'. Two paths: body ('fig') and lapels ('lap').
- Component <Walker height color lapelColor/>:
  - On dark: body bone, lapels stone #8F8A83.
  - On light: body #11100F, lapels #6E6A65.
- Sizes:
  - O1: 240 tall (max 0.28 × screen height)
  - end card: 64x142
  - letters: 22x49 at the bottom
  - road: 22x49
  - reader nav: 12x26
  - widgets: 7x15 to 14x31
- PNG exports @3x for widgets and notifications: walker-bone.png, walker-ink.png, walker-template.png (white with alpha; lapels at 50% alpha).
- App icon: 1024 canvas, #0A0A0A. Bone walker 640 tall, centred horizontally, optical centre at 52% y, lapels #8F8A83. No wordmark.
- Splash: #0A0A0A with the walker, imageWidth 44.

OPTIONAL BRAND ART
- assets/brand/evolution.svg, traced from /tmp/claude-0/brand/sheets/evo_print.jpg: three faceless walking figures growing left to right, heads dissolving into horizontal lines.
- Used only for the Day 365 letter art and the free 'Evolution' wallpaper.
- If the trace isn't approved, omit both. Nothing else depends on it.

IMAGERY
- No stock photography.
- No global grain or noise over UI.
- Texture exists only inside colorway plates.

MOTION
- Easing: out = Easing.bezier(0.2,0,0,1); in = Easing.bezier(0.4,0,1,1).
- Line pages: native paging. On settle, the incoming line block animates opacity 0→1 and translateY 8→0 over 280ms (out). The running head crossfades over 200ms.
- O1: figure opacity 0→1 and translateY 6→0 (600ms). Headword and definitions fade in 300ms, staggered 80ms. On Begin, the dropped letters fall and close (see O1).
- Day recorded: running head crossfade (B graft); the walker glyph nudges translateX 0→3→0 over 400ms.
- Milestone letter: opaque ink fade from black, 400ms.
- Record road: the walker moves to the new position over 300ms when Record opens on a new day.
- Save: bookmark fill 150ms.
- Sheets: native.
- Nothing bounces, counts up, confettis or toasts.
- Reduce Motion: drop all translate and drift; crossfades only.

HAPTICS (expo-haptics)
- Soft impact: day recorded.
- Light impact: save, copy.
- Selection: squares, segmented controls, plan rows.
- Medium impact: Held.
- Warning notification: tapping a 4th standard rule.
- No haptics elsewhere.

3. SCREENS

Baseline 390x844 with insets 47 top and 34 bottom. y values are absolute on that baseline. Scale vertical anchors by percentage of height.

O1 THE NAME (no step counter, no back)
- Top row at y=59:
  - left: wordmark 'unsetld', Cormorant 500 22, bone
  - right: mono 'VOL. 001', stone
- Figure:
  - Walker, bone with stone lapels, 240 tall, centred horizontally.
  - Its feet stand on a full-width (334) rule-strong hairline at y = 0.47H (397).
  - 'FIG. 01' (mono.s, stone) sits 8pt below the line, left-aligned at 28.
- Headword at y = 0.47H + 44:
  - Ten separate Text glyph spans in Cormorant 500 64/66, ls -1: u n s e t [t] l [e] d. The bracketed second t and the e are grey-letter #45423E; the rest bone.
  - Then 10pt and 'adj.' in Cormorant 500 italic 22, stone, baseline-aligned.
- 20pt below: two definition rows, 52 tall, hairline above each and below the last:
  - mono '1' (column 32 wide) + Cormorant 23 bone 'Not finished.'
  - '2' + 'Not willing to settle for less.'
- Primary button 'Begin'.
- On mount: figure animation, then headword and rows.
- On Begin:
  - The two grey letters translateY 0→12 and opacity 1→0 over 300ms (in).
  - Their measured widths then animate to 0 over 200ms (out), so the word closes up to 'unsetld'.
  - Hold 250ms, then fade to O2.
- No ATT, no account, no attribution question.

O2 FIRST LINE (the real reader, no bottom bar)
- Background Black.
- Running head at y=66: left label 'DISCIPLINE', right mono 'No. 0001'.
- Line 0001 at the reader position.
- Save and Share are live.
- Bottom (bottom edge at safeBottom + 30): left-aligned Inter 15 stone 'One line every morning. Swipe up for the next.' with a 12pt chevron-up 8pt to its right.
- Text button 'Next' bottom-right as a fallback.
- Swiping up shows line 0002. When that page settles (or after 4 s), the caption fades out and the primary button 'Continue' fades in (300ms) at the standard button position.

O3 YOUR STANDARD (step '01 / 04')
- Nav row at y=55, height 44: back chevron left; mono '01 / 04' stone right.
- Title 'Set your standard.' (title.xl) 24pt below the nav.
- Body 12pt below: 'Pick three. Each night you'll mark whether you held them. Only you see this.' (Inter 15 stone).
- 28pt: nine rows, 48 tall, hairline above each:
  - mono 2-digit number (column 40)
  - rule text in Cormorant 23: bone if selected, muted if not
  - 14pt square on the right
- Row 9: '+' (mono, stone) and 'Write your own' (Inter 15 stone).
  - Tapping it turns the row into a TextInput: Cormorant 23 bone, placeholder 'Say it plainly.' in ash, maxLength 32, returnKey 'done'.
  - The written rule becomes a selected row numbered 09.
- A 4th selection is blocked: warning haptic, and the counter fades to 40% and back over 300ms.
- Above the button: mono stone 'N OF 3 CHOSEN'.
- Primary button 'Set the standard', disabled until 3 are chosen.
- Content scrolls; the button bar is fixed.

O4 CHAPTERS (step '02 / 04')
- Title 'Choose your chapters.'
- Body: 'Your daily lines come from these. Free includes Discipline and one more. Full Edition opens all seven.'
- Seven rows, 60 tall, hairlines:
  - mono '01'
  - name (Cormorant 23)
  - scope (Inter 13 stone) on a second line
  - right: a square, or for Discipline the label 'ALWAYS'
- Preselected: Discipline, Focus, Training. Any number can be chosen.
- Button 'Continue'.

O5 YOUR DAY (step '03 / 04')
- Title 'Set your day.'
- 24pt: notification preview, 334 wide, radius 20, background #1F1E1C:
  - App icon 38x38, radius 9 (walker on ink, hairline border).
  - 'unsetld' in system font 15 semibold bone; right: '7:00 AM' system 13 stone. This mirrors the First reminder value.
  - Body in system font 15 bone: 'Every time you check your phone, you pay to get back in.'
- 28pt: hairline rows, 52 tall:
  - 'Reminders a day' with segmented [1 | 3 | 5 | 10], default 3.
    - Free: 5 and 10 are disabled.
    - Footnote: 'More than 3 a day is part of Full Edition.'
  - 'First reminder' 7:00 AM (opens a time sheet).
  - 'Last reminder' 10:00 PM.
  - 'Night check' switch (default on) + '9:30 PM'. The time is tappable when on.
    - Footnote: 'One question at night: did you hold your standard?'
- Time sheet:
  - title (Inter 500 15)
  - native wheel time picker (@expo/ui DatePicker with hourAndMinute and wheel style, or @react-native-community/datetimepicker)
  - primary 'Done'
- Primary 'Allow reminders':
  - requests notification permission, schedules, advances
  - denied: still advances
- Text button 'Not now' 8pt below the button.

O6 WIDGET (step '04 / 04')
- Title 'Put it on your lock screen.'
- 16pt: segmented 'Lock Screen | Home Screen'.
- 16pt: expo-video VideoView, 334x420, cover, muted, loop, autoplay, no controls.
  - Real device screen recordings: assets/video/widget-lock.mp4 and widget-home.mp4 (720x1280 H.264, ≤1.5 MB, 6–8 s).
  - Real-screenshot JPG fallback. Never a drawn wireframe.
- 20pt: three step rows, 44 tall, hairlines: mono number + Inter 15 bone (copy deck).
- Primary 'Done'; text 'Later'.
- Both go to the Paywall (soft). Closing the paywall lands in the reader.

PAYWALL (fullScreenModal, ink, ScrollView)
- Top row at y=55, height 44:
  - left: close X, 24pt stone, active from frame 0
  - right: 'Restore' (Inter 15 stone)
- 24pt: label 'UNSETLD'.
- 12pt: title 'Full Edition' (title.xl).
- 12pt: description, Inter 15 stone.
- 28pt: spec list, four rows, 40 tall, hairline above each and below the last:
  - label column 104 wide
  - value Inter 14 bone
- 32pt: three plan rows, 64 tall, hairline between and below:
  - left: 14pt square (selected = filled bone)
  - 16pt gap
  - name: Inter 500 17, bone if selected, muted if not
  - sub-line: Inter 13 stone
  - right: price Inter 600 17 tabular (bone/muted) + unit Inter 13 stone
  - Annual only: a second right-hand line 'per-month equivalent a month' in Inter 12 stone. It must stay smaller than the billed price.
  - Annual is preselected.
- 24pt: trial timeline, shown only when Annual is selected and the user is trial-eligible:
  - a rule-strong 1pt track
  - three 9pt square nodes at left, centre and right (first filled bone, the others 1pt bone outline)
  - labels under them: TODAY / DAY 2 / DAY 3
  - values: Inter 13 stone
- 28pt: primary CTA.
- 12pt: fine print, Inter 12/17 stone, centred.
- 8pt: links 'Terms of Use · Privacy Policy', Inter 12 stone, underlined, 44pt hit.
- Pricing data:
  - All prices come from RevenueCat/StoreKit priceString. Never hardcode.
  - While loading: plan prices show '—' and the CTA is disabled.
  - On failure: Inter 13 stone error line + text button 'Try again'.
- Never on this screen: countdowns, 'limited' or 'only today', 'Save X%' badges, strike-throughs, checkmark lists, red, win-back popups.
- After purchase: 400ms fade to the reader. No celebration.
- Non-production builds only: a mono.s stone line at the very bottom: 'Preview build. No charge.'

READER (root)
- Layers, bottom to top:
  1. Colorway background (fixed).
  2. Vertical FlatList: pagingEnabled, each page = screen height, decelerationRate 'fast', no indicator.
  3. Fixed overlays: running head and bottom bar.
- Running head at y=66, 16 tall:
  - left: chapter label (label style, colorway secondary); tappable
  - right: mono 'No. 0412' (secondary)
  - Content crossfades on page change.
  - On the first render of today's page each day, the left label reads 'DAY 41' for 2500ms, then crossfades to the chapter. A soft haptic fires and the walker glyph nudges.
- Line block:
  - top at 0.32H (270), left 28, width 334, colorway ink
  - size steps from the type spec
  - attributed quotes add the attribution 16pt below in label style (secondary), e.g. 'SENECA · LETTERS 13'
- Actions 24pt below the last baseline:
  - Save (bookmark), then Share
  - icons 22pt in 44pt hit areas, the first icon's left edge aligned to x=28, 20pt between hit areas
- Bottom bar, vertical centre at H − safeBottom − 30 (780):
  - left: index icon + 10 + 'Chapters' (Inter 14 secondary), 44 hit
  - right: colorway icon (18pt), then a 28pt gap, then the walker glyph 12x26 (colorway ink, lapels secondary)
  - accessibility labels 'Chapters', 'Colorway', 'Your record'
- Day 1 only: 'Swipe up for the next line.' in Inter 13 secondary, 44pt above the bottom bar, left 28. Removed after the first swipe and never shown again.
- Gestures:
  - swipe up: next line; swipe down: previous line
  - double-tap the line: save toggle (light haptic)
  - long-press the line opens an ActionSheet: Share, Copy line, Save / Remove from saved, Don't show this line again, Cancel
  - tap the running-head chapter: read that chapter only. The left label becomes 'FOCUS ONLY' + a 16pt × (44 hit); tap × to return to the mix
- Copy line: copies to the clipboard, light haptic, no toast.

IN-PAGER PAGES (same colorway, same running head, no popups)
- NIGHT CHECK
  - Running head: left label 'NIGHT CHECK', right mono 'Day 41'.
  - Question at 0.32H (title.l).
  - 24pt: the three rules, 40-tall hairline rows: mono 01–03 + Cormorant 23.
  - 32pt: primary 'Held'; 12pt; outline 'Not today'.
  - After an answer, the block crossfades to title.l 'Held.' or 'Noted.' plus Inter 15 secondary 'Day 41 is on record.' or 'Day 41 is still on record.' Swipe up continues.
  - Held = medium haptic.
- END CARD (free, after the 10th line)
  - Walker 64x142 centred, top at 0.22H.
  - 32pt: title.l centred, two lines: 'You've read enough lines like this one.' / 'Go do the work.'
  - 12pt: Inter 15 secondary 'Ten more tomorrow.'
  - 24pt: inline link 'Read more with Full Edition' opens the paywall.
  - This is the last page; no further swipe.
- DAY 3 ACCESS INTRO (once, page 2 on Day 3)
  - Label 'ACCESS', title.l, Inter 15 secondary body, link 'See your record'.
  - Hidden if the ACCESS_ENABLED flag is false.
- NEW VOLUME (once per volume)
  - Label 'VOLUME 002', title.l, body, link 'Read them' (filters to that volume).
- LIBRARY EXHAUSTED
  - title.l, body, links 'Chapters' · 'Start again'.

CHAPTERS SHEET
- Header:
  - 'Chapters' (title.m, 34pt variant)
  - right: mono stone 'VOLUME 001 · 83 LINES' (dynamic count)
- 16pt: row 'All my chapters' with value (e.g. 'Discipline, Focus'). It shows a filled square when the reader is in mix mode; tapping it returns to the mix.
- Then the 01–07 index (60-tall rows as in O4):
  - Right 64pt: square toggles in or out of the mix. Full Edition: any number ≥1; Discipline is always in.
  - Free users: Discipline shows 'ALWAYS'; the chosen extra chapter shows a filled square; all others show the label 'FULL EDITION' in stone.
  - Tapping a locked row opens an ActionSheet: 'Money is part of Full Edition.' / 'Make Money my free chapter' / 'See Full Edition' / 'Cancel'.
  - Tapping a row's name or scope reads that chapter only (closes the sheet).
- 32pt gap, then:
  - 'Saved' + mono count → closes the sheet and pushes Saved
  - 'Your lines' + mono count, or label 'FULL EDITION'

COLORWAY SHEET
- 'Colorway' (title.m).
- 2-column grid, 16pt gap. Swatch 159x283 (9:16), 0 radius, hairline border.
  - Inside: a different real line in Cormorant 500 15/17, colorway ink, 12pt inset top-left.
  - Below (8pt): name in label style (bone if selected, stone otherwise); right: 'FULL EDITION' label when locked.
  - Selected: 1pt bone outline offset 3pt outside the swatch.
- Tap applies to the reader immediately (live preview behind the sheet).
- Locked colorway: a fixed bar at the sheet bottom shows Inter 14 bone '{Name} is part of Full Edition.' + primary 'See Full Edition'. Closing the sheet reverts to the last owned colorway.
- The chosen colorway also applies to widgets and share cards.

SHARE SHEET
- Segmented 'Story | Post'.
- 24pt: live preview of the ShareCard: Story scaled to 220x391, Post 300x300, centred.
- 20pt: a row of 10 colorway squares, 28x28, 8 gap.
  - Locked ones at 40% opacity; tapping a locked one opens the paywall.
  - Selected one: 1pt bone outline offset 2.
- 24pt: primary 'Share' renders 1080x1920 or 1080x1080 via react-native-view-shot and opens expo-sharing.
- Text button 'Copy line' changes to 'Copied' for 1500ms.

SAVED (push)
- Back + title 'Saved'.
- FlatList rows with hairlines:
  - line in Cormorant 20/24 bone (max 3 lines)
  - 8pt
  - mono stone 'No. 0233 · FOCUS'
- Tap opens the reader on that line with the running head 'SAVED' ×.
- Long-press → ActionSheet 'Remove from saved'.
- Empty state: title.m 'Nothing saved yet.' + Inter 15 stone 'Double-tap a line to keep it here.'

YOUR LINES (push)
- Full Edition users:
  - Title 'Your lines'.
  - Row '+ Write a line' opens an inline input: Cormorant 23, placeholder 'Write the line you need to read.', maxLength 110, mono counter '0 / 110' right-aligned.
  - List of lines, Cormorant 20, long-press → Edit / Delete.
  - Footnote: 'Your lines stay on this phone. They show up in your daily lines and can go on your widgets.'
- Free users:
  - title.m 'Your lines are part of Full Edition.'
  - Inter 15 stone 'Write the lines you need to read. They show up in your daily lines and on your widgets.'
  - primary 'See Full Edition'

RECORD (push, ink, ScrollView)
- Nav: back chevron left; 'Settings' right (Inter 15 stone).
- 24pt: label 'RECORD'.
- 12pt: numeral '41' (Cormorant 400 112/100) + 12pt + 'days on record' (italic accent, stone), bottom-aligned (italic paddingBottom 14).
- 32pt: BARCODE, 334x60.
  - N = min(daysSinceStart, 120) most recent days. pitch = min(8, 334/N); bar width = pitch ≥ 4 ? 2 : 1.
  - Day on record: bone, full height.
  - Missed: ash, 6 tall, bottom-aligned.
  - Today: signal, full height. Today is always on record when this screen is visible.
  - Under it, 8pt: mono stone, first shown date left ('23 AUG'), 'TODAY' right.
- 32pt: STATS. Three equal columns, hairline top and bottom, hairline vertical dividers, height 76.
  - label RUN / LONGEST / HELD
  - value mono.l bone + mono 13 stone unit: '12 days' / '19 days' / '33 of 41'
  - RUN = consecutive days on record ending today. LONGEST = longest run. HELD = nights answered Held / days on record.
- If ACCESS_ENABLED:
  - 48pt: 'Access' (title.m) left, 'Details' right (Inter 15 stone).
  - 8pt: Inter 13 stone 'Earned with days on record. It can't be bought.'
  - 32pt: ROAD, 334x56.
    - Baseline at y=36: walked part 1.5pt bone; remainder 1pt rule-strong.
    - Ticks 1pt x 8pt at x = 334·i/5 for milestones 7, 30, 90, 180, 365.
    - Labels mono.s centred 8pt under each tick (the last one right-aligned); bone if passed, stone if not.
    - Walker 22x49 standing on the line. x is piecewise-linear over [0,7,30,90,180,365] → [0,1,2,3,4,5]/5·334.
  - 24pt: MILESTONE ROWS, ≥64 tall, hairlines:
    - mono '007' (column 48; bone if open, stone if not)
    - title Inter 500 16 (bone if open, muted if not)
    - description Inter 13 stone
    - right: label status 'OPEN' (bone), 'USED' (stone), 'PAUSED' (stone) or '49 DAYS' (stone)
    - Tap → Milestone detail.
  - 24pt: only while a member price is open and unused for the current collection: Inter 15 stone 'Your member price is open.' + inline link 'Use it at unsetld.com'.
- 64pt bottom padding.

MILESTONE DETAIL (push)
- mono '030', title.xl 'Member price', 16pt, Inter 15/22 bone body (copy deck).
- 32pt: one primary action when relevant.
- Text 'Access terms'.
- No account → the action opens Account first.

MILESTONE LETTER (fullScreenModal)
- Shown on the first reader open after reaching 7, 30, 90, 180 or 365, and on comeback.
- Opaque ink, 400ms fade.
- Close X top-left.
- At 0.28H: mono stone 'DAY 030'.
- 12pt: 'Day 30.' (letter.day).
- 16pt: letter.sub line (stone).
- 24pt: Inter 15/22 bone perk sentence.
- 32pt: primary action + text secondary.
- Bottom: walker 22x49 centred at safeBottom + 40. Day 365 uses the Evolution print at 140 tall if approved.
- Shown once each; recorded in lettersShown.

SETTINGS (push, ink, flat grouped list, no row icons)
- Section headers in label style, 32pt above and 8 below.
- Rows are 52 tall, with the hairline inset 28 left:
  - title Inter 16 bone
  - value Inter 14 stone + chevron
  - native Switch: trackColor {false '#2A2825', true '#EDE9E3'}, thumbColor '#0A0A0A' when on and '#EDE9E3' when off, ios_backgroundColor '#2A2825'
- Footnotes: Inter 13 stone, 8pt below the row.
- Sections and rows (copy deck has the exact text):
  - DAILY: Reminders, Night check, Your standard
  - READING: Chapters, Colorway, Strong language, Saved, Your lines
  - WIDGETS: Add a widget, Wallpapers
  - UNSETLD: Drop alerts, Account
  - FULL EDITION: Plan, Restore purchases
  - ABOUT: How the record works, Access terms, Contact, Terms of Use, Privacy Policy
- Footer: mono.s stone 'unsetld · version 2.0.0 · volume 001'.

REMINDERS (push)
- The O5 content, with the title 'Reminders' and primary 'Save'.
- If permission is denied: a top row 'Notifications are off for unsetld.' + link 'Open Settings' (Linking.openSettings).

ACCOUNT (push)
- Title 'Account', body (copy deck).
- Sign in with Apple via expo-apple-authentication: AppleAuthenticationButton, style WHITE, cornerRadius 2, height 54.
- Signed in: shows the relay email in stone (or 'Signed in with Apple' when Apple gave no email) + text button 'Sign out'.
- Under Sign out: a quiet text button 'Delete account' → confirm dialog (copy deck) → POST /api/app/account/delete, then sign out locally. Required by App Store Guideline 5.1.1(v).
- The Account row in Settings shows while Access is on, or whenever the user is signed in, so deletion is always reachable.

4. DAILY LOGIC
- Day boundary: dayKey = local date of (now − 4h). A day runs 4:00 AM to 3:59 AM.
- Recording: the first time per dayKey that the Reader is focused while AppState is active, or a deep link opens a line, mark the day on record.
  - Store { onRecord: true, verified: trustedTime ok, held: null }.
  - Days can't be backfilled.
  - Onboarding completion records Day 1.
  - 'Day N' = count of days on record.
- Today's line:
  - Global and identical for every user.
  - schedule.json[dayKey] if present; else a deterministic hash of the dayKey over all clean lines ≤80 characters (attributed quotes excluded).
  - Free for every user regardless of chapter.
- Feed pool:
  - Lines in the mix (or the filtered chapter), not hidden.
  - Not seen in the last 30 days. If fewer than 15 remain, relax to 7 days, then to any.
  - Explicit lines only when Strong language is on AND the user has seen ≥10 lines lifetime.
  - Deterministic shuffle seeded by installSalt + dayKey.
  - Explicit lines at least 4 positions apart.
  - Avoid the same chapter twice in a row when the mix has ≥2 chapters.
  - The end-card line is never in the pool.
  - Onboarding always shows 0001 then 0002.
- Free limit: 10 counted pages per day, then the end card.
- Night check:
  - Default on at 9:30 PM.
  - Answer stored on that dayKey. Held/Not today never changes on-record status or Access.
- Reminder scheduling (expo-notifications, local):
  - First reminder at the First time: body = today's line.
  - The other (count − 1) reminders are evenly spaced between First and Last inclusive, with ±10 min jitter (first is exact).
  - Their bodies come from the slot prompt pool (morning 05–11, midday 11–15, evening 15–21, night 21–04), round-robin.
  - When count ≥5, every other reminder uses a clean mix line ≤90 characters instead.
  - A reminder within 30 min of the night check moves 45 min earlier.
  - Title is always 'unsetld'. No sound. threadIdentifier 'lines'.
  - Data { line: no } deep-links to that line.
  - The iOS limit is 64 pending, so schedule floor(60/(count+1)) days ahead and reschedule on every foreground.
- Night check notification:
  - category 'NIGHT_CHECK', actions HELD 'Held' and NOT_TODAY 'Not today', opensAppToForeground false
  - body 'Did you hold your standard today?'
  - Register the response listener at module scope in index.ts, and also apply getLastNotificationResponseAsync on launch (dedupe by request id).
- Never: streak guilt, 'your line is ready', Time Sensitive, notifications about drops (except the opt-in drop alerts) or discounts.

5. ACCESS (REWARDS)
LADDER (days on record; cumulative; access first, discount capped at 15%)
- 007 Early access: every UNSETLD drop opens to you 24 hours before the public.
- 030 Member price: 10% off one order each collection.
- 090 The patch: a woven patch with your number, free with your next order.
- 180 Member price, 15%: up from 10%, same limits.
- 365 The 365 piece: a numbered piece made only for people who reach a year. Sold at full price, never restocked.

LIMITS
- One member-price order per collection.
- $25 maximum off an order.
- No stacking with other codes, including the site's 10% first-order code.
- Excludes the 365 piece.
- One patch per person.
- US, 18+.
- No cash value. Not transferable.

PAUSE
- After 14 days with nothing on record, early access and member prices show 'PAUSED'.
- They reopen after 7 more days on record, with a comeback letter.
- The count and milestones never drop.

Identical for free and Full Edition users. Never earned by ratings, reviews, enabling notifications, following socials, posting or purchases.

DELIVERY
Account (Sign in with Apple) is required only to claim.

Backend: one small route set on the existing Next.js site (Vercel), or Supabase.
- The full route list (sync, checkin, proof, redeem, claim, account/delete) and the session model are in `docs/ACCESS.md`, which wins over this section.
- POST /api/app/sync {appleIdToken, authorizationCode, days, proofs}: on first sign-in. Exchanges the authorization code with Apple (keeping the refresh token for revocation), accepts only locally verified check-ins, one per day, none in the future, and returns {sessionToken}.
- Every later request carries the session token, never the Apple identity token. A 401 signs the phone out so the app asks to sign in again.
- POST /api/app/checkin {dayKey}: one per account per server day.
- POST /api/app/account/delete: deletes the account and what's held for it, and revokes the Apple refresh token.
- POST /api/app/claim {perk}: mints a single-use Shopify discount via the Admin API (percentage, once per customer, combinesWith none, $25 cap) and returns a URL:
  - Patch: https://www.unsetld.com/cart/{PATCH_VARIANT_ID}:1?discount={CODE} (100% off the patch)
  - Early access: a signed token that the storefront reads to reveal a drop collection 24h early (customer tag)
- All shop links open in Safari via Linking.openURL. No in-app browser.

Drop alerts (opt-in switch, default off):
- The app fetches https://www.unsetld.com/api/app/drops.json on foreground.
- For users with Day ≥7 and alerts on, it schedules a local notification at early-access open time.
- For users below Day 7, it schedules one at public open time.

Feature flag: ACCESS_ENABLED, from https://www.unsetld.com/api/app/config.json; default false until the backend works. When false, the whole Access section, the Day 3 page, the letters and milestone details are hidden. Never show 'coming soon'.

6. WIDGETS (expo-widgets + @expo/ui swift-ui; lines in system serif New York via font({design:'serif'}); labels in SF)

Three widgets in app.json:

UnsetldLine — displayName 'Line'
- Families: accessoryRectangular, systemSmall, systemMedium, systemLarge.
- accessoryRectangular:
  - VStack leading, spacing 2.
  - HStack, spacing 4: walker-template image 7x15 + Text 'unsetld' size 11 semibold, opacity 0.6.
  - Text(line): serif 15 semibold, lineLimit 3, minimumScaleFactor 0.8.
  - Only clean lines ≤60 characters. No background.
- systemSmall:
  - Colorway background (Black when free).
  - padding 16; VStack leading.
  - Line: serif 18 medium, lineLimit 5, minScale 0.75.
  - Spacer; walker 9x20.
  - Clean lines ≤80 characters.
- systemMedium:
  - Top HStack: chapter uppercased (size 10 semibold, kerning 1.5, secondary) + Spacer + 'No. 0412' (monospaced 10, secondary).
  - Spacer; line serif 22 medium, lineLimit 3.
  - Bottom HStack: Spacer + walker 12x27.
- systemLarge:
  - Top HStack: 'WED 7 OCT' (10 semibold, kerning 1.5) + Spacer + 'No. 0412' (mono 10).
  - Spacer; line serif 30 medium, lineLimit 6.
  - Spacer; HStack: walker 14x31 + 'unsetld' serif 13.

UnsetldRecord — displayName 'Record'
- Families: systemSmall, accessoryCircular, accessoryInline.
- systemSmall:
  - Colorway background.
  - Label 'RECORD' (10 semibold, kerning 1.5, secondary).
  - Spacer; '41' serif 56 regular; 'days on record' serif 13 italic, secondary.
  - 10pt; HStack of 7 squares (12x12, 4 gap) for the last 7 days, today rightmost:
    - on record = filled ink colour
    - missed = strokeBorder 1
    - today = strokeBorder 1.5 #C41E1E
- accessoryCircular: Gauge(value: daysOnRecordLast7/7), style accessoryCircular, currentValueLabel Text('41'), label = walker-template.
- accessoryInline: walker-template + Text('Day 41').

UnsetldStandard — displayName 'Standard'
- Family: accessoryRectangular.
- Three Text rows: serif 13 semibold, lineLimit 1, minScale 0.8.
- Numbers '01 ' to '03 ' in monospaced.

ALL WIDGETS
- Free, rendered in Black. Full Edition renders the chosen colorway (plates copied to the App Group 'group.com.unsetld.app' folder at first launch via expo-file-system's shared-container path; check the SDK 57 docs).
- Tap: widgetURL unsetld://line/{no} (Line) or unsetld://record. A tap records the day.
- Timeline:
  - entries at now, each reminder time, and each 4:00 AM boundary for 7 days
  - written on every foreground, after settings changes and after the night check
  - same line as the matching notification
- Never prices, perks, promos, milestone counts or explicit lines.
- Accented (tinted) mode: all text white, images as template.

7. SHARE CARD (ShareCard component; also used for previews)
- 1080x1920:
  - Colorway background.
  - Line in Cormorant 500, left x=76, block top at 653px. Size: ≤32 characters 112px; ≤56 96px; ≤80 84px; >80 72px. line-height 1.06.
  - Attribution for quotes in Inter 500 26px caps.
  - Bottom-left at y=1800: mono 30px secondary 'No. 0412'.
  - Bottom-right: walker 34x76 above the wordmark 'unsetld' (Cormorant 500 34px), right-aligned at x=1004.
- 1080x1080: all sizes ×0.8; block vertically centred at 45%.
- No chapter, day count, URL, rank or promo.
- Explicit lines share as written when the user shares them. Marketing previews use clean lines.

8. CONTENT MODEL (src/content)
- chapters.json: [{id, no, name, scope, free}].
- lines.json: [{no, chapter, text, explicit, volume:1, attribution?:{author, source, translator}, verified?}].
- reminders.json: [{slot, text}].
- standard.json: the 8 rules.
- colorways.json: tokens above + previewLine.
- milestones.json: copy + thresholds.
- schedule.json: dayKey → line no.
- copy.ts: all UI strings from the copy deck.

scripts/validate-content.mjs fails the build on:
- an original line over 80 characters or outside 7–14 words
- '!', '…' or emoji
- any banned word from the voice guide
- the explicit flag not matching the swear regex (damn|hell|shit|bullshit|piss|fuck)
- explicit share over 12% of the library, or more than 2 explicit in any chapter's first 80 lines
- duplicate numbers or text
- attributed quotes with verified !== true (excluded from the feed until verified)

lockEligible is computed as !explicit && text.length ≤ 60.

9. PURCHASES (RevenueCat)
- Entitlement 'full_edition'. Offering 'default'.
- Products:
  - unsetld_full_annual: $24.99/yr with a 3-day free-trial intro
  - unsetld_full_monthly: $4.99/mo
  - unsetld_full_lifetime: $39.99, non-consumable
- Trial eligibility via checkTrialOrIntroductoryPriceEligibility.
- Day-2 trial reminder: local notification at trial start + 48h.
- Restore in the paywall header and in Settings.
- Paywall entry points:
  - end of onboarding (soft)
  - locked chapter or colorway (ActionSheet → See Full Edition)
  - end-card link
  - Your lines
  - Settings > Plan
- Never interrupts reading.

10. APP STORE AND COMPLIANCE
- Screenshots: clean lines only. Ink background. Real device captures at 86% scale. Inter 600 captions.
- No laurels, badges or prices.
- Privacy: no tracking. Purchases via RevenueCat. Identifiers only if the user signs in for Access.
- Store links open in Safari, never an in-app browser.
- Drop alerts are a separate opt-in.
- Widgets show no promos.

11. REMOVE FROM THE CURRENT BUILD
Navigation and screens:
- The bottom tab navigator (Today / Rank / Me) and @react-navigation/bottom-tabs.
- RankScreen, MeScreen (replaced by Record + Settings), RankEmblem, RankUpCelebration, ToastHost and all toasts.

Systems and data:
- core/rank.ts and content/rank.json: XP, ranks SETTLED / HUNGRY / DIALED IN / RELENTLESS / UNSETLD, shields, decay, weekly and comeback XP.
- missions.json, non-negotiables and 'Today's Work'.
- core/codes.ts copy-code flow and scripts/shopify-codes.mjs: rotating public codes, the dashed code box, 'Tap to copy', the 'Shop unsetld.com' bag button.
- perksFeed if it only serves the old perks UI.

Content:
- lanes.json and the six old line files (show-up, bag-talk, gym-rat, lock-in, back-yourself, cut-it-off), replaced by chapters.json + lines.json.
- themes.json (Obsidian Gold, Onyx Silver, Black Marble, Carbon, Gunmetal, Espresso, Midnight navy, Noir Grain, Graphite), replaced by colorways.json.
- assets/textures/* (brushed, carbon, marble, grain, heavy-grain) and the global TextureBackground grain overlay.
- onboarding.json questions: 'What are you working on?', 'What's hitting hardest right now?', 'How do you want it?', 'When should we check on you?', 'Pick your look', 'How did you find us?', 'Everyone starts SETTLED'.
- The Clean / Unfiltered tone choice, replaced by the Strong language switch in Settings.
- Old notification copy (streak guilt, 'Today's line just dropped').

UI components:
- Chip, Card, Stepper, ProgressBar.
- HourPicker chip scroller, replaced by the native wheel picker in a sheet.
- Every red fill, border, eyebrow and badge. accent #c41e1e becomes the signal token only.
- 'Save 58%'.
- The 'PREVIEW · no real charges' pill in production.
- 'coming soon' strings.
- The persistent 'Swipe up for more' hint.
- The '2 left today' and '+10 XP' pills.

Config:
- app.json widget descriptions that mention streak and rank.
- DevTools outside __DEV__.

Keep and rewrite: core/time, lines, reminders, random, pricing; services/purchases, notifications, share, haptics, trustedTime, clock, widgets; state/store and storage.

Add with npx expo install:
- @expo-google-fonts/ibm-plex-mono
- expo-video
- expo-apple-authentication
- expo-file-system
- expo-image (if absent)

12. ACCEPTANCE CHECKS
- A real line is on screen within 2 taps of first launch.
- The reader has nothing but the line, 2 action icons, the running head and the bottom bar.
- Red appears only for today.
- No explicit line reaches a widget, notification, onboarding page or the paywall.
- Paywall: billed price is the largest price; close is active at 0 s; Restore, Terms and Privacy are visible.
- Every text under 18pt meets 4.5:1 contrast.
- Typecheck, lint, unit tests (feed spacing, day boundary, reminder spacing, milestone and pause logic) and validate-content all pass.
