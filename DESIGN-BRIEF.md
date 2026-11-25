# Design brief — news-image-20261125

## Competition
"Sum up 25 November's world news in one image". $100 pot, 50 places
(1st $20, 2nd $12, 3rd $6, 4th–10th $2, 11th–50th $1.20).
Program: main.ts (Node, stdlib only), writes one 1024x1024 PNG (<=1 MiB) to
/output/entry.png. No network at runtime. Two runs must be byte-identical.
Judge: AI picture editor, pairwise; image must NAME the day (25 November 2026),
show the day's most consequential stories across regions/fields, read clearly,
stay faithful to reported facts, one clean composition, legible at ~300px.
Entries close Fri 27 Nov 07:00 WIB (2026-11-27T00:00:00Z). 2,684 submissions
already in at ~10:25 WIB on 25 Nov — submit today, do not wait for the deadline.

## USER DIRECTION (standing, 24 Nov 07:42 WIB)
Make it AS ATTRACTIVE AS POSSIBLE — news AND image, no sloppiness. Pick the
BIGGEST, MOST VISUAL stories that read straight from the picture. Strong
composition, clear subject, good contrast, tidy visual hierarchy, LITTLE text,
BIG and readable. The image must stand out at first glance against hundreds
of others. Critically inspect the result and fix anything messy, cut off, or
slapped together before finishing.

## Verified stories (live search, 25 Nov 2026 ~10:25 WIB)
1. LEAD — DRONE STRIKE ON RIYADH'S TALLEST TOWER: Yemen's Houthis struck
   the PIF Tower in Riyadh for the second time in less than a week on
   Tuesday, wounding at least 11 people, Saudi Civil Defense said. The
   Saudi-led coalition condemned it as a "terrorist attack".
2. ZELENSKIY CONFIRMS SHIP STRIKE: Ukraine's president confirmed Kyiv was
   behind Saturday's drone strike on a Russian cargo ship in the Gulf of
   Finland; ally Norway urged caution. Separately Kyiv claims it sank a
   Russian warship off the Libya coast on Monday.
3. HUAWEI CONVICTED: China's Huawei found guilty of stealing trade secrets
   in a sprawling US criminal trial over its Iran business; acquitted of
   racketeering.
4. TRUMP AWARDS GIULIANI THE MEDAL OF FREEDOM: Donald Trump awarded former
   New York mayor Rudy Giuliani the Presidential Medal of Freedom.
5. FOOTER BRIEFS: NATO plans early-warning aircraft deployment in Poland
   after missiles landed there during an attack on Ukraine; EU announces
   further sanctions against Russia; Nvidia shares fall ~7% one day after
   the +31% surge on Huang's return; Dell lifts forecasts on a record
   quarter driven by AI server demand; US CIA and ODNI suffered a
   cybersecurity breach involving some unclassified information.

## Layout (1024x1024, BOLD POSTER — dark navy, gold, bright orange-red)
- Background deep navy #0f1c33 full bleed; gold frame inset 12, 4px.
- Top: "WEDNESDAY 25 NOVEMBER 2026" gold scale 3 centred (y36), thin gold
  rules either side. The day is named big and first.
- HERO panel x28..996 y84..600, lighter navy #16263f, steel frame:
  headline "STRIKE ON / RIYADH'S TALLEST TOWER" white scale 7 centred
  (two lines, y104); subhead gold scale 2 "HOUTHIS HIT THE PIF TOWER —
  SECOND TIME IN A WEEK" (y196); stat line bright orange-red scale 2
  "11 WOUNDED | TUESDAY" (y224); illustration: tall dark skyscraper
  silhouette centre-left with a small drone and an orange blast burst near
  its crown, grey smoke curling up, city skyline at the base; one body line
  scale 1 centred (y572): "SAUDI-LED COALITION CALLS IT A TERRORIST ATTACK".
- Gold divider y618.
- BOTTOM ROW y640..940, three panels w304 (x28 / 360 / 692), lighter navy,
  steel frame: kicker gold scale 1, headline white scale 3 centred (2-3 lines),
  ONE clear illustration each, one body line scale 1:
  1. SHIP STRIKE "KYIV CONFIRMS / FINLAND SHIP / STRIKE" — dark cargo ship
     silhouette on blue sea, small drone above, orange blast; body
     "ZELENSKIY: UKRAINE DID IT".
  2. HUAWEI "HUAWEI / CONVICTED" — dark phone/chip shape with gold scales
     of justice; body "GUILTY OF TRADE-SECRET THEFT".
  3. MEDAL "MEDAL OF / FREEDOM" — gold medal with ribbon on dark cloth;
     body "TRUMP HONOURS GIULIANI".
- Footer y962 scale 1 centred grey: "ALSO: NATO AWACS TO POLAND | EU
  SANCTIONS RUSSIA | NVIDIA -7% AFTER +31% | DELL AI RECORD | CIA BREACH".

## Implementation (fresh code, stdlib only)
- Own rasterizer: RGB buffer, fillRect, Bresenham line, filled circle,
  triangle fill, 5x7 bitmap font (own glyphs, A-Z 0-9 punctuation), word wrap.
- PNG encoder: node:zlib deflateSync level 9, filter 0, colour type 2, own CRC32.
- No Date, no Math.random, no network: every coordinate and colour fixed.
- Output path: argv[2] or "/output/entry.png"; create parent dir if missing.
- Verify: run twice, sha256 equal, 1024x1024, <= 1 MiB, VIEW the image and
  fix anything messy/cut off before finishing.
- Do NOT read any previous news-image main.ts before writing this one
  (authorship gate counts only fresh writing); this brief is the only input.
