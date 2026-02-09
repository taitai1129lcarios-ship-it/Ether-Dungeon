# Adobe Firefly Prompts for Skill Icons

スキルアイコン画像生成用のプロンプト案です。
敵画像と同様に `pixel art, 2D game asset, flat style, white background` を共通設定としています。

## Ice Signal (アイスシグナル)
**概要:** 目の前に氷の針を一瞬だけ出現させる鋭い攻撃。
**Prompt:**
`very sharp ice needle spike, thin and pointed, magical blue crystal, piercing forward, clean simple shape, centered, pixel art, 2D game asset, white background`

---
## 既存スキルのアイコン案 (参考)
もし他のスキルも生成し直す場合に使ってください。

### Slash (スラッシュ)
`thin white crescent energy blade, very sharp and narrow curve, sickle shape, wind vacuum cut, dynamic motion, simple clean lines, pixel art, 2D game asset, white background`

### Fireball (ファイアボール)
`fireball spell icon, burning orange flame, magic effect, simple shape, pixel art, 2D game asset`

### Ember Strike (エンバーストライク)
**概要:** 多数の火の玉を連続発射するアルティメットスキル。
**Prompt:**
`ember strike skill icon, multiple rapid fireballs, barrage of fire, intense burning effect, ultimate ability, dynamic action, pixel art, 2D game asset, white background`

### Thunder Burst (サンダーバースト)
**概要:** 周囲に電撃を帯びた爆発を起こすプライマリスキル。
**Prompt:**
`thunder burst skill icon, electrical explosion, lightning shockwave, yellow sparks, high energy discharge, pixel art, 2D game asset, white background`

---

## Skill Projectile Sprites (スキル攻撃の現物スプライト)
アニメーションする攻撃エフェクト用です。

### Fireball Base Image (ファイアボール：元画像単体)
**概要:** スプライトシート生成の元となる、単体の炎の球です。
**Prompt (日本語):**
`ドット絵、2Dゲームのアセット、火の玉、燃え盛るオレンジ色の炎、魔法のエフェクト、シンプルな形、横向きに飛んでいる、白い背景`

### Fireball Sprite Sheet (ファイアボール：スプライトシート化)

**概要:** 右方向へ飛んでいくアニメーションが含まれる画像。
**レイアウト:** 1行 x 4列 のグリッド形式を想定しています。
- 1行目: 右へ飛んでいく (Flying Right)

**Prompt:**
`pixel art sprite sheet of a fireball projectile, game asset, 1 row, 4 columns, burning animation, flying right, uniform grid, white background, high quality`

### Thunder Burst Animation Sprite Sheet (サンダーバースト：アニメーション)
**概要:** 爆発・放電アニメーション。
**レイアウト:** 4行 x 4列 (または 1行 x 4~8列) のグリッド。
**Prompt:**
`thunder burst explosion sprite sheet, electrical shockwave animation, yellow lightning expanding, high voltage sparks, pixel art, 2D game asset, black background, 4x4 grid sequence`

---

## 補足
- **背景:** 白または透明。黒背景(black background)の場合は加算合成(Additive)で使用します。
- **保存ファイル名:** `assets/fireball_sheet.png` / `assets/thunder_burst_sheet.png`
- **画像サイズ:** 各フレームが均等になるように生成してください（例: 全体で 128x32 または 256x64 など）。

---

## Bounce Spark Icon (バウンスパーク：アイコン)
**概要:** 壁に反射する電気の弾。
**スタイル:** ピクセルアート、アイコン、黒背景。
**Prompt:**
`yellow electric orb bouncing off a wall, lightning ricochet effect, zig-zag trajectory, high voltage spark, 2D game icon, pixel art, black background, vibrant yellow and cyan colors`
