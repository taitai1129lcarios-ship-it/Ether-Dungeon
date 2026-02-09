# Adobe Firefly Prompts for Treasure Chest

宝箱（Treasure Chest）の画像生成用プロンプト案です。
これまでの敵やスキルと同様に、**ピクセルアート（ドット絵）スタイル**で統一しています。

## 共通設定 (Common Style)
以下のキーワードをプロンプトの末尾に追加して、全体のトーンを合わせてください。
`pixel art, 2D game asset, sprite, white background, flat style, fantasy RPG`

---

## 1. Closed Chest (閉じた宝箱)
**概要:** 通常の状態の宝箱。木製で金属の縁取りがある王道なデザイン。
**Prompt:**
`wooden treasure chest, closed, iron bands, golden lock, sturdy, fantasy rpg item, isometric view, centered, pixel art, 2D game asset, white background`

## 2. Open Chest - Empty (開いた宝箱・空)
**概要:** アイテム取得後の、中身が空っぽの状態。
**Prompt:**
`wooden treasure chest, open lid, empty inside, dark wooden interior, iron bands, isometric view, centered, pixel art, 2D game asset, white background`

## 3. Open Chest - With Treasure (開いた宝箱・財宝入り)
**概要:** 開けた瞬間の、金貨や宝石が輝いている状態（エフェクト用など）。
**Prompt:**
`wooden treasure chest, open lid, filled with gold coins and gems, glowing treasure, sparkling, isometric view, centered, pixel art, 2D game asset, white background`

---

## 生成のコツ
- **視点（Angle）:** `isometric view`（クォータービュー）か `front view`（正面）か、ゲームの視点に合わせて選んでください。Aether Dungeonは見下ろし型なので `isometric view` や `top-down view` が馴染みやすいですが、アイコンとして使うなら `front view` もありです。
- **背景:** 白背景 (`white background`) で生成し、後で透明化してください。
- **バリエーション:**
    - **豪華な箱:** `gold treasure chest, jeweled, ornate`
    - **古い箱:** `old wooden crate, rusty lock, damaged`
