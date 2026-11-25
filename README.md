# News Image — 25 November 2026

[![make.fun](https://img.shields.io/badge/make.fun-bounty-blue)](https://make.fun/r/6yqrkbx0)
[![Node](https://img.shields.io/badge/node-stdlib%20only-green)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A bold newspaper-poster image summing up the world news of
**Wednesday 25 November 2026** — built with a hand-rolled rasterizer and
PNG encoder in plain Node.js (stdlib only, no network, no randomness).

## The stories

- **Lead:** Houthi drone strike on Riyadh's PIF Tower — the second in a
  week — wounding 11 people.
- **Kyiv confirms** the Finland ship strike; **Huawei convicted** of
  trade-secret theft; **Trump awards Giuliani** the Medal of Freedom.
- **Also:** NATO AWACS to Poland, EU sanctions on Russia, Nvidia −7%
  after +31%, Dell's AI record, CIA breach.

## Run it

```sh
node main.ts out/entry.png
```

Two runs produce byte-identical output: 1024×1024 PNG, well under 1 MiB.

## Links

- Competition: [make.fun](https://make.fun/r/6yqrkbx0)
- Design brief: [DESIGN-BRIEF.md](DESIGN-BRIEF.md)
