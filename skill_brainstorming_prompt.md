# AI Skill Brainstorming Prompt

以下のテキストを他のAI（ChatGPT, Gemini, Claudeなど）に貼り付けて、スキルのアイデア出しに使ってください。

---

## 依頼内容
現在開発中の2D見下ろし型アクションRPGのために、新しい「スキル」のアイデアを考えてください。
世界観はファンタジーで、魔法や剣技が存在します。

## ゲームの仕様
- **操作:** WASD移動、マウスまたはキーでスキル発動。
- **スキルタイプ:**
  - `normal` (通常攻撃/Spaceキー): 基本的にクールダウンが短い (0.2s - 0.5s)
  - `primary` (メインスキル/Eキー): 主力の攻撃 (1s - 3s)
  - `secondary` (移動・補助/Shiftキー): 回避やバフ (2s - 5s)
  - `ultimate` (必殺技/Qキー): 強力だがクールダウンが長い (5s - 10s)

## データ構造（JSONフォーマット）
実装には以下のJSON形式を使用します。既存の `behavior` を再利用するか、新しい `behavior` のロジックも提案してください。

```javascript
{
    id: 'unique_id', // 英数字
    name: 'Skill Name', // 日本語でもOK
    type: 'primary', // normal, primary, secondary, ultimate
    icon: 'assets/icon_name.png',
    cooldown: 1.0, // 秒
    behavior: 'projectile', // 以下のBehaviorリストから選択、または新規提案
    params: {
        damage: 40, // ダメージ量 (HPは100程度)
        range: 100, // 射程
        duration: 1.0, // 持続時間
        color: '#ff0000', // エフェクトの色
        // その他、挙動に必要なパラメータ
    }
}
```



## 考えてほしいこと
1. **ユニークなスキル案を5つ** 提案してください。
2. それぞれについて、**ユニークな名前**、**どんな動きをするか**、**どのタイプか** を説明してください。
3. もし既存のBehaviorで実現できそうならその設定値を、新しい動きが必要なら「どんなロジックが必要か（例：敵を引き寄せる、設置型など）」も補足してください。

---
