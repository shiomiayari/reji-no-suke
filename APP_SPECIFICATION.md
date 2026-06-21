# 居酒屋 極 (レジの助) - アプリケーション仕様書

本ドキュメントは、モバイルオーダーシステム「レジの助」の基本仕様、アーキテクチャ、およびAPI仕様をまとめたものです。

## 1. システム概要
「レジの助」は、居酒屋などの飲食店において、顧客が自身のスマートフォンから卓のQRコードを読み取り、直接注文を行うことができるセルフオーダーシステムです。

### 1.1 主な機能
- **顧客向け機能**
  - QRコード（URL）による自動ログイン・卓の紐付け
  - メニュー一覧の閲覧
  - カートへの商品追加・注文確定
  - 注文履歴と現在の合計金額の確認
  - 会計完了時のサンクスページ表示
- **管理者・スタッフ向け機能**
  - 各卓の現在の利用状況（アクティブ/会計済み）の確認
  - 各卓の現在の注文合計金額の確認
  - 卓の会計処理（ステータス変更）
  - 卓のリセット処理

---

## 2. システムアーキテクチャ
- **フロントエンド**: HTML5, Vanilla JavaScript, Tailwind CSS (Stitch Design System準拠)
- **バックエンド**: Cloudflare Workers (Honoフレームワーク使用)
- **データベース**: Cloudflare D1 (サーバーレス SQLite)
- **認証方式**: JWT (JSON Web Token) をLocalStorageに保存し、APIリクエスト時に `Authorization: Bearer <token>` 形式で送信。

---

## 3. データベース仕様 (schema.sql)

### 3.1 `tables` (卓情報)
| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `name` | TEXT (PK) | 卓の識別子 (例: table_1) |
| `status` | TEXT | 卓の状態 ('active' または 'checked_out') |

### 3.2 `menu_items` (メニュー情報)
| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | INTEGER (PK) | 商品ID |
| `name` | TEXT | 商品名 |
| `price` | INTEGER | 価格（円） |
| `is_hidden` | INTEGER | 1=非公開(裏メニュー), 0=公開 (デフォルト0) |

### 3.3 `orders` (注文履歴)
| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | INTEGER (PK) | 注文ID |
| `table_id` | TEXT | 注文した卓名 (tables.name へのFK) |
| `menu_item_id` | INTEGER | 注文した商品ID (menu_items.id へのFK) |
| `quantity` | INTEGER | 注文数量 |
| `ordered_at` | TEXT | 注文日時 (ISO8601形式) |

---

## 4. API 仕様 (抜粋)
ベースURL: `/api/v2`

### 4.1 顧客向けエンドポイント
- **`POST /auth/signin`**
  - 概要: 卓番号を受け取り、JWTトークンを発行する。
  - リクエスト: `{ "qr_data": "table_1" }`
  - レスポンス: `{ "token": "...", "table_name": "table_1" }`

- **`GET /menu/list`** (要JWT)
  - 概要: 公開されているメニュー(`is_hidden=0`)のリストを取得する。

- **`POST /orders`** (要JWT)
  - 概要: 新しい注文を確定する。
  - リクエスト: `{ "menu_item_id": 1, "quantity": 2 }`

- **`GET /r/session-data`** (要JWT)
  - 概要: ログイン中の卓のこれまでの注文履歴一覧を取得する。

- **`GET /table/status`** (要JWT)
  - 概要: 現在の卓のステータス(`active`か`checked_out`か)を取得する。ポーリングに使用。

### 4.2 管理者向けエンドポイント
- **`GET /admin/tables`**
  - 概要: 全卓の利用状況と売上合計金額を取得する。（※現在テスト中のため認証を一時的に外しています）

- **`POST /admin/checkout`**
  - 概要: 指定した卓のステータスを `checked_out` (会計済み) に変更する。
  - リクエスト: `{ "table_name": "table_1" }`

- **`POST /admin/reset`**
  - 概要: 卓のステータスを `active` に戻し、その卓の注文履歴をすべて削除する。

---

## 5. 画面遷移フロー
1. `/?t=table_1` にアクセス（QRコード読み取り）
2. `app.js` がURLパラメータを検知し、自動で `/auth/signin` を実行。
3. 認証成功後、`order.html` へ遷移。
4. 顧客は注文や履歴確認を行う。
5. 管理者が `/admin.html` から会計処理（`checkout`）を行う。
6. `order.html` は数秒間隔でステータスを確認しており、`checked_out` を検知すると自動的に `thankyou.html` へリダイレクトされる。
