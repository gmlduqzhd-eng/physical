# 소개 영상 제작

## 그림 장면

실제 교실 촬영 대신, 앱 디자인 토큰(배경 `#faf8f2`, 숲색 `#566d4d`, 신호색 `#f59e0b` 등)으로 그린
평면 벡터 일러스트를 HTML/SVG로 움직여 영상으로 굽는다. 아이와 선생님은 얼굴 없이 뒷모습·옆모습으로만 그린다.

- 장면 파일: `video/art/<이름>.html` — 브라우저로 바로 열면 실시간 미리보기.
  공통 도구 `kit.js`(인물·교실·시간 처리), 스타일 `art.css`, 글꼴 `fonts.css`(`public/fonts` 참조), QR `qr.svg`.
- 장면: `rain-window`, `classroom-idle`, `hand-remote`, `classroom-standup`, `classroom-move`,
  `classroom-cheer`, `classroom-pause`, `group-phones`, `classroom-highfive`, `end-card`.
  오버레이 틀: `phone-frame`(폰 화면 투명), `split-frame`(왼쪽 TV + 오른쪽 폰, 두 화면 투명).
- 움직임은 모두 시간 `t`만으로 계산(`window.__seek(t)`)하므로 녹화가 프레임 단위로 정확하다.
  반복 동작의 주기는 14초를 나누어떨어지게 맞춰 끊김 없이 반복되고, 한 번 일어나는 동작
  (리모컨으로 TV 켜기, 일어서기, 일시정지, 마지막 카드)은 끝난 뒤 차분한 상태를 유지한다.

### 굽기

```bash
node video/record-art.mjs                    # 전체(장면당 약 50초) → video/out/art/
node video/record-art.mjs classroom-move     # 일부 장면만
node video/record-art.mjs --thumbs           # 영상 없이 썸네일·manifest만
node video/record-art.mjs --sec 10 --at 2    # 길이, 썸네일 시각 바꾸기
```

출력(`video/out/`은 git 제외):

- `out/art/<이름>.mp4` — 1920x1080, H.264 yuv420p, 30fps, 기본 14초
- `out/art/phone-frame.png`, `out/art/split-frame.png` — RGBA, 화면 부분 투명
- `out/art/thumbs/<이름>.jpg` — 확인용 장면 사진
- `out/art/manifest.json` — 합성기가 쓰는 화면 영역(픽셀)

| 항목 | 영역 x, y, w, h |
| --- | --- |
| 교실 TV 화면(`classroom-standup`·`move`·`cheer`·`pause`) | 544, 72, 832, 468 (16:9) |
| `phone-frame` 화면 | 750, 85, 420, 910 |
| `split-frame` TV | 110, 200, 1120, 630 |
| `split-frame` 폰 | 1430, 150, 360, 780 |

폰 화면 비율(약 0.46)은 앱 폰 녹화(480x1040 → 498x1080)와 같다. 교실 TV 영역에는 아이들 팔·머리가 들어가지 않으므로
녹화를 그대로 덮어도 된다(꽃가루만 TV 뒤로 지나가는 것처럼 가려진다).

## 앱 화면 녹화

로컬 빌드(가짜 Supabase 주소)를 `127.0.0.1:5200`에 띄우고, Playwright로 `scenes.json`의 `rec`/`rec2` 장면을 녹화한다.
서버 요청(Supabase REST·RPC·실시간, `/api/teacher`)은 모두 `record-fixtures.mjs`의 가짜 응답으로 처리하므로
실제 서비스에는 접속하지 않는다. 학생은 번호(7번)만 쓰고 이메일·실명은 나오지 않는다.

```bash
node video/record-app.mjs                      # 빌드 + 전체 장면(약 10분)
node video/record-app.mjs --no-build boss-main # 기존 빌드로 일부 장면만
node video/record-app.mjs --list               # 장면 이름
```

- 출력: `out/rec/<이름>.mp4`(H.264 yuv420p 30fps), `out/rec/manifest.json`(`{이름:{sec,w,h}}`), `out/rec/thumbs/<이름>.jpg`(가운데 프레임).
- TV: 뷰포트 1920x1080. 휴대폰(`-phone`): 뷰포트 480x1040(휴대폰 배치)으로 녹화해 498x1080으로 맞춤.
  Playwright 영상은 deviceScaleFactor 2를 반영하지 않아(CSS 픽셀 크기로 찍히고 나머지는 회색) 2배 녹화는 쓰지 않는다.
- 흰 원 커서가 마우스를 따라가고 누르면 물결이 퍼진다. 장면마다 로딩은 잘라 내고 보여 줄 구간만 남긴다.
- `remote-pair-*`, `remote-next-*`는 TV·폰을 같은 시계로 잘라 길이와 시작이 같다(나란히 놓으면 맞음).
- `room-create-qr` 화면의 접속 주소 글자는 `physical-pi.vercel.app`으로 바꿔 보여 준다(QR 내용은 로컬 주소).
- 실패한 장면은 `out/rec/thumbs/FAILED-<장면>-<n>.png`에 그 순간 화면을 남긴다.
