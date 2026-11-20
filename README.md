# 2xo_rps.zip — GIF ARCHIVE

## 구성
- `index.html`: 웹사이트 화면
- `styles.css`: 디자인
- `app.js`: 목록, 로그인, 업로드, 삭제 기능
- `config.js`: Supabase 연결 정보

## 1. Supabase 연결
`config.js`를 열고 아래 두 항목을 본인의 Supabase 프로젝트 값으로 바꿉니다.
- `SUPABASE_URL`: Project URL
- `SUPABASE_ANON_KEY`: Publishable key

`service_role` 또는 `secret` 키는 절대 넣지 마세요.

## 2. 필요한 Supabase 설정
이 사이트는 다음 구성을 사용합니다.
- 테이블: `public.gif_files`
- Storage bucket: `archive` (public)
- 파일 최대 크기: 25MB
- 허용 형식: GIF, JPG/JPEG, PNG, WEBP

RLS 정책은 관리자 UID를 제한하도록 이미 설정한 정책을 사용합니다. 브라우저에는 Publishable key만 사용합니다.

## 3. GitHub에 올리기
압축을 푼 뒤 저장소의 최상위 폴더에 `index.html`, `styles.css`, `app.js`, `config.js`, `README.md`를 올립니다.

## 4. 보안 참고
- 공개 버킷이므로 업로드된 이미지는 링크를 아는 누구나 볼 수 있습니다.
- 관리자 비밀번호와 Supabase secret/service_role key는 공개 저장소에 올리지 마세요.
- `config.js`에는 Publishable key만 넣으세요. 쓰기 권한은 Supabase RLS 정책이 제한해야 합니다.
