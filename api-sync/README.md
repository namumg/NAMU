# NAMU Flow 자동 연동

GitHub Actions에서 매시간 17분(한국 시간 기준으로도 매시 17분)에 Trouble Shooting 프로젝트 2970230을 읽습니다. GitHub 실행 대기 상황에 따라 실제 시각은 지연될 수 있습니다.

- 로그인이나 PC 실행 없이 작동합니다. API 키는 저장소의 Actions Secret `FLOW_API_KEY`에만 설정합니다.
- 게시글 원본 HTML에서 본문·이미지·링크 순서를 읽고 현재 위키 데이터 형식으로 변환합니다.
- 사이트의 데이터 블록만 교체합니다. 테마와 기능은 재생성하지 않습니다.
- 변경이 없으면 커밋이나 배포를 생략합니다. 오류, 누락, 수집 중 원본 변경이 있으면 기존 사이트를 유지합니다.
- 기존 문서/모델 삭제는 자동 반영하지 않습니다. 원본 삭제 의도가 확인된 경우 별도로 정리해야 합니다.
- 지금 갱신하려면 GitHub → Actions → **Flow API sync & publish** → **Run workflow**를 누릅니다.
- 키 변경은 Settings → Secrets and variables → Actions → `FLOW_API_KEY`에서 합니다. 코드나 HTML에 붙여넣지 마세요.
- 공개 저장소의 예약 작업은 장기간 저장소 활동이 없으면 GitHub 정책에 따라 중단될 수 있습니다. Actions에서 다시 활성화할 수 있습니다.

공식 명세: https://api.flow.team/docs/api/user/posts
