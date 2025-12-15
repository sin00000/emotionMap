# Google Maps Geocoding API 활성화 가이드

## 🔴 현재 상태

API 키는 있지만 **Geocoding API가 활성화되지 않음** → `REQUEST_DENIED` 오류 발생

---

## ✅ 해결 방법 (5분 소요)

### 1단계: Google Cloud Console 접속

1. **브라우저에서 열기:** https://console.cloud.google.com/
2. **로그인:** Firebase 프로젝트를 만들 때 사용한 Google 계정으로 로그인
3. **프로젝트 선택:** 상단 메뉴에서 Firebase 프로젝트 선택
   - 프로젝트 이름: `emotionalmap-5d748` 또는 유사한 이름

---

### 2단계: Geocoding API 활성화

#### 방법 A: 직접 링크 사용 (가장 빠름)

1. **이 링크 클릭:** https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com
2. **"사용 설정" 버튼 클릭**
3. 완료! (몇 초 소요)

#### 방법 B: 수동으로 찾기

1. **Google Cloud Console 메인 화면**에서:
   ```
   왼쪽 메뉴 → "API 및 서비스" → "라이브러리"
   ```

2. **검색창에 입력:**
   ```
   Geocoding API
   ```

3. **"Geocoding API" 카드 클릭**
   - 설명: "Convert between addresses and geographic coordinates"

4. **"사용 설정" 버튼 클릭**
   - 파란색 "ENABLE" 또는 "사용 설정" 버튼

5. **완료 확인**
   - "API가 사용 설정되었습니다" 메시지 표시
   - 버튼이 "사용 중지"로 변경됨

---

### 3단계: API 키 제한 설정 확인 (선택사항, 보안 강화)

1. **왼쪽 메뉴:**
   ```
   "API 및 서비스" → "사용자 인증 정보"
   ```

2. **API 키 찾기:**
   - 키 이름: `AIzaSyBx_O6JD2VMrl9VSPUVHEpdol3E3iqKWu0` 로 시작하는 키

3. **키 편집 (연필 아이콘 클릭)**

4. **"API 제한사항" 섹션:**
   - "키 제한" 선택
   - 다음 API만 허용:
     - ✅ Geocoding API
     - ✅ (기존에 체크된 Firebase 관련 API들도 유지)

5. **"애플리케이션 제한사항" 섹션 (프로덕션 배포 시):**
   - 개발 중: "없음" 선택
   - 배포 후: "HTTP 리퍼러" 선택하고 도메인 추가
     ```
     http://localhost:*
     https://yourdomain.com/*
     ```

6. **"저장" 버튼 클릭**

---

### 4단계: 앱에서 테스트

1. **개발 서버 재시작:**
   ```bash
   npm run dev
   ```

2. **브라우저에서 앱 열기**
   - 로그인 후 "Add place" 버튼 클릭

3. **장소 검색 테스트:**
   - **한글:** "강남역", "명동", "서울시청"
   - **영어:** "New York", "Tokyo Tower"

4. **성공 확인:**
   - 검색 결과 표시됨 (주소, 좌표 포함)
   - 콘솔 로그: `🗺️ Google Maps API: "강남역" → 10 results found`

---

## 🔍 문제 해결

### ❌ 여전히 오류가 발생하는 경우

#### 1. API 활성화 확인
- https://console.cloud.google.com/apis/dashboard
- "Geocoding API"가 목록에 있고 "사용 설정됨" 상태인지 확인

#### 2. API 키 제한 확인
- 사용자 인증 정보에서 API 키 확인
- "API 제한사항"이 "키 제한"으로 설정된 경우:
  - Geocoding API가 허용 목록에 있는지 확인
  - 없으면 추가 후 "저장"

#### 3. 결제 계정 확인 (무료 할당량 있음)
- Google Cloud Console → "결제"
- 결제 계정이 연결되어 있는지 확인
  - **무료 할당량:** 월 $200 크레딧 (약 40,000건 검색 가능)
  - 초과 시에만 과금

#### 4. 브라우저 캐시 삭제
- 개발자 도구 열기 (F12)
- 네트워크 탭 → "캐시 사용 중지" 체크
- 새로고침 (Ctrl+Shift+R 또는 Cmd+Shift+R)

---

## 💰 요금 안내

### 무료 할당량
- **월 $200 USD 크레딧** (모든 Google Maps API 공용)
- **Geocoding API 요금:** $5 per 1,000 requests
- **무료로 사용 가능:** 약 40,000건/월

### 예상 사용량 (개인 프로젝트)
- 하루 10번 장소 검색 = 월 300건
- **비용:** $0 (무료 할당량 내)

### 비용 초과 방지
1. **청구 알림 설정:**
   - Google Cloud Console → "결제" → "예산 및 알림"
   - 예산: $1 설정
   - 알림: 50%, 90%, 100% 도달 시 이메일

2. **할당량 제한 설정:**
   - "API 및 서비스" → "할당량"
   - Geocoding API → 일일 요청 수 제한 (예: 100건/일)

---

## 📋 체크리스트

활성화 완료 후 다음을 확인하세요:

- [ ] Google Cloud Console에서 Geocoding API "사용 설정됨" 확인
- [ ] 앱에서 "강남역" 검색 시 결과 표시됨
- [ ] 앱에서 "New York" 검색 시 결과 표시됨
- [ ] 콘솔 로그에 `🗺️ Google Maps API:` 메시지 출력됨
- [ ] 오류 메시지 없음

---

## 🎯 빠른 링크

| 작업 | 링크 |
|------|------|
| Geocoding API 활성화 | https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com |
| API 대시보드 | https://console.cloud.google.com/apis/dashboard |
| 사용자 인증 정보 | https://console.cloud.google.com/apis/credentials |
| 할당량 관리 | https://console.cloud.google.com/apis/api/geocoding-backend.googleapis.com/quotas |
| 결제 설정 | https://console.cloud.google.com/billing |

---

## ✅ 완료 후 테스트 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드 테스트
npm run build
npm run preview
```

---

**문제가 계속되면 스크린샷을 보내주시면 도와드리겠습니다!**

- Google Cloud Console 스크린샷
- 브라우저 개발자 도구 콘솔 로그
- 네트워크 탭의 API 요청 상태
