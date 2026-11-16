# webapps

개인용 웹앱 모음입니다. 앱마다 `apps/<이름>/` 폴더가 있고, `main`에 푸시하면 전부 빌드되어 GitHub Pages에 올라갑니다.

- 목록: https://junsince99.github.io/webapps/
- 각 앱: `https://junsince99.github.io/webapps/<이름>/` (Safari에서 열고 공유 → 홈 화면에 추가)

| 앱 | 폴더 | 설명 |
| --- | --- | --- |
| 한푼 | `apps/hanpun/` | 지출만 빠르게 기록하는 가계부. 기록은 각 기기 안에만 저장됩니다. |

## 구조

| 경로 | 내용 |
| --- | --- |
| `build.mjs` | `apps/*/build.mjs`를 차례로 실행해 `dist/<이름>/`에 빌드하고, `dist/index.html`에 앱 목록을 만듭니다 |
| `apps/<이름>/build.mjs` | 앱 하나의 빌드. 첫 번째 인자로 출력 폴더를 받습니다 |
| `apps/<이름>/public/manifest.webmanifest` | 앱 이름·설명 (목록 페이지에도 쓰입니다) |
| `apps/<이름>/public/icons/apple-touch-icon.png` | 앱 아이콘 (목록 페이지에도 쓰입니다) |
| `.github/workflows/pages.yml` | `main` 푸시 시 빌드해서 `gh-pages` 브랜치로 배포 |

## 새 앱 추가

1. `apps/<이름>/`에 `build.mjs`를 만들고, 인자로 받은 폴더에 정적 파일을 출력하게 합니다. `_`로 시작하는 폴더는 빌드에서 빠집니다.
2. 경로는 모두 상대 경로로 씁니다. 사이트가 `/webapps/<이름>/` 아래에서 서비스됩니다.
3. 서비스 워커는 앱 폴더 안에 두어, 범위가 그 앱으로만 한정되게 합니다.
4. 같은 도메인(`junsince99.github.io`)을 쓰는 앱끼리 브라우저 저장소를 공유하므로, 저장 키 앞에 앱 이름을 붙입니다 (예: `hanpun.v1`).

## 빌드

```bash
node build.mjs
```
