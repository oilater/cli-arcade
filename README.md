# CLI Arcade

OpenTUI + Bun으로 만든 터미널 아케이드 게임.

## 설치

```bash
bun install
bun link
ca
```

PATH 안 잡히면: `echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc`

자세한 가이드는 `ca guide`

## 게임

폭탄 깔고, 블록 부수고, 아이템 먹고, 마지막까지 살아남으면 승리.

폭발에 맞으면 바로 죽는 게 아니라 3초간 갇힘. 그 사이에 바늘(💉) 쓰면 탈출. 못 쓰면 사망. 갇힌 놈 밟으면 즉사.

## 아이템

- 💧 범위 — 폭발 범위 +1 (최대 8)
- 💣 폭탄 — 동시 설치 수 +1 (최대 5)
- 🎯 다트 — 던지면 폭탄 원격 폭파
- 💉 바늘 — 갇혔을 때 부활 (10% 드롭, 귀함)

## 조작

솔로: 방향키 이동, Space 폭탄, 1 다트, 2 바늘, Esc 종료

2인:

| | 이동 | 폭탄 | 다트 | 바늘 |
|---|---|---|---|---|
| P1 | WASD | Space | 1 | 2 |
| P2 | 방향키 | / | . | , |

## 모드

```bash
ca                          # 모드 선택
ca start --solo             # 봇 대전
ca start --online           # 온라인 자동매칭
ca start --join AB12        # 방 코드로 참가
ca start --host             # 로컬 네트워크 호스팅
ca start --join 192.168.x:7778  # 로컬 참가
```

`--name "닉네임"` 으로 이름 설정 가능

---

## Tech Stack

- **OpenTUI** — React reconciler 기반 터미널 UI (`<box>`, `<text>`, `<span>`, `useKeyboard`)
- **Bun** — 런타임, WebSocket 서버 (`Bun.serve`), CLI 등록 (`bun link`)
- **React** — 상태 관리 및 컴포넌트 렌더링 (불변 상태 패턴)

---

## Bomb Game — Implementation Details

봄버맨 스타일 대전 게임. 솔로(vs 봇) / 로컬 2P / 온라인 멀티 지원.

### 프로젝트 구조

```
src/apps/bomb/
├── game/
│   ├── types.ts          # 핵심 타입 정의
│   ├── constants.ts      # 게임 설정값
│   ├── map-gen.ts        # 맵 생성 알고리즘
│   ├── state.ts          # 초기 상태 생성
│   ├── actions.ts        # 플레이어 입력 (이동/폭탄/다트/바늘)
│   ├── tick.ts           # 매 틱 게임 로직 (폭발/사망/갇힘)
│   ├── utils.ts          # 공유 유틸리티
│   ├── index.ts          # Barrel export
│   └── bot.ts            # 봇 AI (BFS 기반)
├── components/
│   └── BombGrid.tsx      # 그리드 렌더러
├── screens/
│   ├── BombSetupScreen.tsx       # 모드 선택
│   ├── BombGameScreen.tsx        # 게임 화면 (솔로/로컬)
│   ├── BombGameOverScreen.tsx    # 결과 화면
│   ├── BombLobbyScreen.tsx       # 온라인 로비
│   └── OnlineBombGameScreen.tsx  # 온라인 게임 화면
├── hooks/
│   └── use-bomb-server.ts  # WebSocket 클라이언트 훅
├── server/
│   ├── ws-server.ts        # WebSocket 서버
│   └── protocol.ts         # 메시지 프로토콜
└── index.tsx               # 엔트리포인트
```

---

### 핵심 구현

#### 1. 상태 관리 — 완전 불변(Immutable)

모든 게임 상태 변경은 새 객체를 반환하는 순수 함수로 구현. 직접 수정(mutation) 없음.

```typescript
// 모든 상태 전이 함수 패턴
function tick(state: BombGameState, config, ...) → 새로운 BombGameState
function movePlayer(state, playerIndex, dx, dy) → 새로운 BombGameState
function placeBomb(state, playerIndex, config)  → 새로운 BombGameState
function throwDart(state, playerIndex)          → 새로운 BombGameState
```

게임 상태 구조:

| 필드 | 설명 |
|------|------|
| `map[][]` | 2D 타일맵 (`"wall"` / `"block"` / `"empty"`) |
| `players[]` | 위치, 생존여부, 갇힘타이머, 스탯(범위/폭탄수/다트/바늘) |
| `bombs[]` | 위치, 타이머, 소유자, 범위 |
| `explosions[]` | 위치, 잔여시간, 소유자 |
| `darts[]` | 위치, 방향(dx,dy), 소유자 |
| `items[]` | 위치, 타입(`range`/`bomb`/`dart`/`needle`) |

#### 2. 게임 루프

100ms 간격(10 tick/sec)으로 recursive `setTimeout` 실행. 틱 겹침 방지.

```
매 틱:
  1. 봇 행동 결정 (솔로모드만)
  2. tick() 실행 — 다트/폭탄/폭발/사망 처리
  3. 솔로: 인간 사망 시 즉시 게임오버
```

입력은 `enqueue()`를 통해 즉시 상태에 반영 → 렌더링 지연 없이 반응.

#### 3. tick() — 메인 게임 로직

한 틱에서 순서대로 처리:

**1단계: 다트 이동**
- 틱당 2칸 이동 (1칸 x 2스텝, 중간 셀마다 충돌 체크)
- 벽/블록 → 소멸
- 폭탄 적중 → 폭탄 강제 폭발 + 다트 소멸

**2단계: 폭탄 타이머 감소**
- 타이머 0 이하 → 폭발 큐에 추가

**3단계: 폭발 처리 (큐 기반 연쇄 반응)**
```
while (폭발 큐에 폭탄 있음):
  폭탄 위치에 explosion 생성
  4방향으로 range만큼 확산:
    벽 → 정지
    블록 → 파괴 + 40% 확률 아이템 드롭, 정지
    다른 폭탄 → 큐에 추가 (연쇄폭발)
    빈칸 → explosion 생성
```

**4단계: 갇힘 판정**
- explosion 위치에 있는 플레이어 → 즉사 대신 **갇힘 상태** (3초 카운트다운)
- 갇힌 동안 이동/폭탄/다트 사용 불가, 💀 깜빡임 표시
- 바늘(💉) 사용 시 즉시 탈출, 타이머 소진 시 사망
- 다른 플레이어가 갇힌 플레이어 위로 걸어가면 즉사
- 솔로모드: 봇은 인간(player 0)의 폭발에만 갇힘 (`owner` 필드로 구분)

**5단계: 승리 판정**
- 생존자 1명 이하 + 바늘 보유 사망자 없음 + 갇힌 플레이어 없음 → `gameOver: true`

#### 4. 이동 & 아이템

```
다음 칸 계산 → 벽/블록/폭탄이면 이동 불가
이동 성공 시 아이템 픽업:
  💧 range  → bombRange +1 (최대 8)
  💣 bomb   → maxBombs +1 (최대 5)
  🎯 dart   → darts +1
  💉 needle → needles +1 (10% 확률 드롭)
이동 방향은 항상 기록 (lastDx, lastDy) → 다트 발사 방향에 사용
갇힌 플레이어 위로 이동 시 → 갇힌 플레이어 즉사
```

#### 5. 봇 AI — 룰 기반 + BFS

규칙 기반 AI. 매 틱마다 우선순위에 따라 행동 결정.

**핵심 함수:**
- `isDangerous(x, y)` — 폭발중 / 폭탄 사정거리 / 최근 폭발 쿨다운(8틱) 체크
- `findEscapeDir()` — BFS 최대 15칸 탐색, 안전한 칸으로의 첫 방향 반환
- `countEscapeRoutes()` — 탈출로 2개 이상인지 확인 (폭탄 배치 전 안전성 검증)

**행동 우선순위:**
```
1. 위험 → BFS로 탈출 경로 탐색 → 이동
2. 안전 + 폭탄 배치 가능 (탈출로 2개 이상) → 설치 후 즉시 탈출
3. 근처에 아이템 → 아이템 방향으로 이동
4. 블록 옆 → 폭탄 설치
5. 할 일 없음 → 랜덤 이동
```

**봇 생존 보장:** 솔로모드에서 봇은 인간 플레이어의 폭발(`owner === 0`)에만 사망. 자폭이나 다른 봇의 폭발로는 죽지 않음.

#### 6. 렌더링 (BombGrid)

셀 렌더링 우선순위: **폭발 > 다트 > 플레이어 > 폭탄 > 아이템 > 지형**

각 레이어를 `useMemo`로 Map 캐싱 → O(1) 조회. 매 틱마다 전체 그리드를 `<text>` + `<span>`으로 렌더링.

| 요소 | 표시 |
|------|------|
| 내 캐릭터 | 파란 네모 |
| 상대/봇 | 색상별 블록 |
| 내 폭탄 | 파란 원 |
| 상대 폭탄 | 빨간 원 |
| 폭발 | 3단계 불꽃 애니메이션 (노랑→주황→빨강) |
| 다트 | 방향 화살표 (← → ↑ ↓) |
| 아이템 | 💧범위, 💣폭탄, 🎯다트, 💉바늘 |
| 갇힌 플레이어 | 💀 깜빡임 (3초 카운트다운) |
| 죽은 플레이어 | 회색 ✗✗ 표시 |
| 봇 (솔로) | 🤖 |

---

### 멀티플레이어 아키텍처

#### 호스트 (서버)

```
Bun.serve로 WebSocket 서버 시작 (0.0.0.0 바인딩)
  → 클라이언트 접속 시 welcome(playerId, config) 전송
  → 로비에서 대기 → 모두 ready 시 게임 시작
  → 서버에서 tick() 실행 → game_state 브로드캐스트
  → 게임 종료 시 game_over 전송
```

#### 클라이언트

```
WebSocket 연결 → join 메시지 전송
  → 키 입력 → move/bomb/dart 메시지 서버로 전송
  → 서버에서 받은 state로 렌더링
  → 연결 끊기면 500ms 후 자동 재접속
```

#### 로컬 네트워크 플레이

호스트가 LAN IP + 포트를 표시 → 같은 네트워크의 다른 컴퓨터에서 `ca start --join <IP>:<PORT>`로 접속.

---

### 게임 설정값

| 항목 | 값 |
|------|-----|
| 맵 크기 | 25x25 |
| 폭탄 타이머 | 25틱 (2.5초) |
| 폭발 지속시간 | 5틱 (0.5초) |
| 틱 레이트 | 100ms (10 tick/sec) |
| 아이템 드롭 확률 | 40% |

### 조작법

**솔로모드:**
- 방향키: 이동
- Space: 폭탄 설치
- 1: 다트 발사
- 2: 바늘 사용 (갇혔을 때 부활)
- Esc: 종료

**로컬 2P:**
- P1: WASD / Space:폭탄 / 1:다트 / 2:바늘
- P2: 방향키 / /:폭탄 / .:다트 / ,:바늘

**온라인:**
- 방향키: 이동
- Space: 폭탄 설치
- 1: 다트 발사

---

### 해결한 주요 문제들

| 문제 | 원인 | 해결 |
|------|------|------|
| 봇이 자폭 | 자기 폭발에 죽음 | Explosion에 `owner` 필드 추가, 솔로모드에서 봇은 인간 폭발에만 사망 |
| 다트가 폭탄을 건너뜀 | 2칸 점프로 중간 셀 무시 | 1칸 x 2스텝으로 변경, 매 셀 충돌 체크 |
| 키 입력 씹힘 | tick이 state를 덮어써서 입력 유실 | 즉시 적용 패턴 — `enqueue()`에서 바로 `onStateChange` 호출 |
| 멀티에서 폭탄 안죽임 | 솔로용 `soloHumanIndex` 로직이 온라인에도 적용 | `soloHumanIndex`를 optional로 변경, 온라인에서는 `undefined` 전달 |
| WebSocket 연결 실패 | localhost가 IPv6로 해석 | `127.0.0.1` 명시 + 서버 `hostname: "0.0.0.0"` |
| 죽으면 캐릭터 소실 | alive 플레이어만 렌더링 | 죽은 플레이어도 회색 X로 표시, 살아있는 플레이어가 우선 렌더링 |
