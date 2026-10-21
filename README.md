# NAMU Trouble Shooting Wiki

사이트: https://namumg.github.io/NAMU/

방문자는 로그인 없이 문서와 이미지를 볼 수 있습니다. Flow 원문 링크는 별도 로그인이 필요할 수 있습니다.

## 자동 갱신

- GitHub Actions가 매시간 17분에 Flow Trouble Shooting 프로젝트(2970230)를 확인합니다. 실행 대기 상황에 따라 지연될 수 있습니다.
- 변경이 있을 때만 문서 데이터를 갱신하고 사이트를 배포합니다.
- PC를 켜거나 브라우저에 로그인할 필요가 없습니다. 기존 로컬 도우미는 평소 실행하지 않아도 됩니다.
- API 키는 GitHub Actions Secret `FLOW_API_KEY`에 보관합니다. HTML이나 코드에 입력하지 마세요.
- 수집 실패, 누락, 수집 도중 원본 변경이 감지되면 기존 사이트를 유지합니다.
- 디자인·기능 코드는 그대로 유지하며, 데이터 영역만 교체합니다.

## 지금 갱신하기

저장소 **Actions → Flow API sync & publish → Run workflow → Run workflow**를 선택합니다. 완료 결과도 같은 화면에서 확인할 수 있습니다.

## 배포 설정

Settings → Pages → Source는 **GitHub Actions**입니다. 별도 HTML 업로드나 브랜치 배포로 변경할 필요가 없습니다.

## 포함 기능

브랜드·모델·문서 탐색, 검색, 즐겨찾기, 최근 열람, 다크모드, 사이드바 너비 조절, 이미지 확대, YouTube 재생 및 모바일 화면을 지원합니다. 본문의 원본 이미지 순서를 보존합니다.

설정과 유지보수 상세: [자동 연동 안내](api-sync/README.md)
