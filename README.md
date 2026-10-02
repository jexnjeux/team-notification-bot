# team-availability-bot

매일 아침 오늘 연락이 어려운 팀원을 Slack으로 알려주는 봇입니다.

- 부재 일정: `data/availability.json`
- 알림 스크립트: `src/notify.js`
- 실행: GitHub Actions `Availability Notification` workflow (`workflow_dispatch`)

## 매일 09:00 자동 실행 설정 (외부 스케줄러)

GitHub Actions의 `schedule` 트리거가 이 저장소에서 동작하지 않아서,
외부 스케줄러가 GitHub API로 workflow를 실행합니다.

### 1. GitHub 토큰 발급 (Fine-grained PAT)

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Repository access: **Only select repositories** → `team-notification-bot`
   (Public repositories를 선택하면 쓰기 권한을 줄 수 없습니다)
3. Permissions → **+ Add permissions** → **Actions** 선택 → 접근 수준을 **Read and write**로 변경
   (Metadata: Read-only가 함께 추가되면 그대로 둡니다)
4. 만료일을 정하고 **Generate token** → 토큰을 바로 복사합니다. 이 화면을 벗어나면 다시 볼 수 없습니다.
   (만료되면 401 오류로 알림이 멈추므로, 재발급 후 스케줄러에 다시 넣어야 합니다)

### 2. cron-job.org 등록

[cron-job.org](https://cron-job.org)에서 새 cronjob을 만듭니다.

| 항목 | 값 |
|---|---|
| URL | `https://api.github.com/repos/jexnjeux/team-notification-bot/actions/workflows/availability-notify.yml/dispatches` |
| Schedule | 매주 월–금 09:00, Time zone `Asia/Seoul` |
| Request method | `POST` |
| Header | `Authorization: Bearer <발급한 토큰>` |
| Header | `Accept: application/vnd.github+json` |
| Header | `X-GitHub-Api-Version: 2022-11-28` |
| Request body | `{"ref":"main"}` |

- 헤더는 작업 편집 화면의 **ADVANCED** 탭 → **Headers**에 넣습니다. 같은 탭의 HTTP authentication 칸은 비워 둡니다.
- `Authorization` 값은 `Bearer` + 띄어쓰기 한 칸 + 토큰입니다.
- `X-GitHub-Api-Version: 2022-11-28`은 **2028-03-10**까지 지원됩니다. 그전에 새 버전 값으로 바꿔야 합니다.

정상 호출 시 응답 코드는 `204`입니다.

### 3. 확인

cron-job.org의 **Test run**으로 한 번 실행한 뒤,
GitHub Actions 탭에 `workflow_dispatch` 실행이 생기고 Slack 알림이 오는지 확인합니다.
(Test run도 실제 Slack 알림을 보냅니다)

| 응답 코드 | 원인 |
|---|---|
| `204` | 정상 |
| `401` | 토큰이 전달되지 않았거나 잘못됨 → 헤더 위치·형식, 토큰 만료 확인 |
| `403` / `404` | 토큰 권한 부족 → Actions: Read and write, 대상 저장소 선택 확인 |

### 알림 잠시 끄기

cron-job.org 작업 목록에서 해당 작업의 **Enabled** 스위치를 끕니다. 다시 켜야 알림이 재개됩니다.

### 수동으로 호출하기

```bash
curl -X POST \
  -H "Authorization: Bearer <토큰>" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/jexnjeux/team-notification-bot/actions/workflows/availability-notify.yml/dispatches \
  -d '{"ref":"main"}'
```
