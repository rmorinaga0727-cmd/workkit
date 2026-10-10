# WorkKit 作業再開メモ（2026-10-09）

- 開発環境: workkit（既存Clone）。Windows・Git・VS Code確認済み。originは指定GitHub、mainはorigin/mainを追跡。
- 完了: dev/workkit-setup作成・切り替え。AGENTS.mdに共通開発ルールと停止後の再開手順を記録。この進捗ファイルを更新。
- 現在のブランチ: dev/workkit-setup
- 復元ポイントの対象: AGENTS.md、setup-progress-20261009.mdの2ファイルのみ。dev/workkit-setupでローカルコミットとして保存。Push・本番公開は行わない。
- 検証: Git状態・ブランチと2ファイルの内容を確認。認証情報・秘密情報なし。個人名を含むローカルパスを記録から除去。アプリテストは未実行（文書のみの変更）。
- 未完了: 個別機能の操作テストは未着手。GitHub最新mainとの同期は未確認。
- 次の作業: ユーザー指定の次の対象機能を確認してテスト追加または開発に着手。
- 再開時の注意: このファイルとAGENTS.md、git statusを先に確認し、必要な差分で途中状態を照合。完了作業を繰り返さず、各区切りで上記項目を更新。
- 制限: main編集・Push・本番反映禁止。index.htmlは今回未変更。debug.log・devは保持しGit追加禁止。新規Clone・フォルダ作成不要。

## Playwright Test導入（2026-10-10）

- 完了: dev/workkit-setupでnpm init -y、@playwright/test 1.64.0を開発依存に追加。.gitignoreでnode_modules/、test-results/、playwright-report/を除外。
- 環境: Node.js v24.20.0、npm 11.19.0。PATHは現在の実行プロセス内だけで補完。恒久設定は変更なし。
- 変更ファイル: package.json、package-lock.json、.gitignore（新規）、setup-progress-20261009.md（更新）。未コミット。
- 検証: npm lsで導入確認、npm監査は脆弱性0件、git check-ignoreで3項目の除外確認。テスト未実行。
- 経緯: 初回インストールはアクセス拒否で失敗。承認後の再試行1回で成功。
- 注意: Chromium・テストコードは未導入。index.html・debug.log・devは変更せず、Commit・Push・本番反映なし。

## Chromium導入（2026-10-10）

- 完了: dev/workkit-setupで既存Playwrightのinstall chromiumを実行。Chromium 156.0.8078.4（v1248）と付属のHeadless Shell・FFmpeg・Winlddを標準ブラウザ保存先へ導入。他のブラウザ・Playwright本体は導入していない。
- 検証: インストール終了コード0。ヘッドレス起動・バージョン確認・終了に成功。最初の確認コマンドは引用符エラーで失敗し、修正後の1回の再試行で成功。テストコードは未作成、アプリテスト未実行。
- 変更ファイル: 今回はsetup-progress-20261009.mdのみ。以前のpackage.json・package-lock.json・.gitignoreは未コミットのまま。
- 注意: PATH補完は実行プロセス内のみ。index.html・debug.log・devは変更せず、Commit・Push・本番反映なし。

## 初回自動テスト（2026-10-10）

- 完了: dev/workkit-setupでトップページのテストを1件作成。Node.js標準HTTPサーバーを127.0.0.1:4173で使用。外部リクエストは遮断し、サーバーはindex.htmlのみ配信。
- 検証: Chromiumで1回実行、1 passed（4.7秒）。HTTP 200、WORKKITのページタイトル・ブランド、メイン見出し、ツール・営業リスト作成代行の見出し表示、表示中の未処理JavaScript例外0件を確認。
- 作成ファイル: playwright.config.js、tests/local-server.cjs、tests/homepage.spec.js。変更: setup-progress-20261009.md。結果出力のtest-results/はGit除外済み。
- 制限: index.html・debug.log・devは未変更。追加パッケージ・外部公開サイトへのアクセス・再実行・Commit・Push・本番変更なし。
- 次の作業: ユーザーが指定する機能の操作検証。今回のPASSはトップページ表示のみで、全機能の動作保証ではない。

## 初回テスト成功状態の復元ポイント（2026-10-10）

- 保存対象: package.json、package-lock.json、.gitignore、playwright.config.js、tests/local-server.cjs、tests/homepage.spec.js、setup-progress-20261009.mdの7ファイルのみ。
- ブランチ: dev/workkit-setup。ローカルコミット名: test: add WorkKit Playwright smoke test。
- 検証: 直前の1件PASSとtest-results/.last-run.jsonのpassedを確認。テスト再実行なし。保存対象を確認し、秘密情報なし。
- 再開時: Git状態と最新コミットで保存結果を確認する。Chromium実体はGit対象外のため、別環境では導入が必要。PATH補完は実行プロセス内のみ。
- 未完了・次の作業: 個別機能の操作テストはユーザーの対象指定後に着手。Push・本番反映は行わない。
