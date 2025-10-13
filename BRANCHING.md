# GLI Project Branching Strategy

## Branch Structure

GLI 프로젝트는 3-tier 브랜치 전략을 사용합니다:

### 🚀 main (Production)
- **용도**: 프로덕션 환경
- **배포**: glibiz.com (api.glibiz.com, admin.glibiz.com, ws.glibiz.com)
- **특징**: 안정적이고 검증된 코드만 포함
- **보호 수준**: 최고 (직접 push 불가, PR 필수)
- **자동 배포**: main 브랜치로 merge 시 프로덕션 자동 배포

### 🧪 stg (Staging)
- **용도**: 스테이징 환경 (프로덕션 사전 테스트)
- **배포**: stg.glibiz.com (stg-api.glibiz.com, stg-admin.glibiz.com, stg-ws.glibiz.com)
- **특징**: 프로덕션 배포 전 최종 검증
- **보호 수준**: 중간 (PR 필수, 리뷰 권장)
- **자동 배포**: stg 브랜치로 merge 시 스테이징 자동 배포

### 🔧 dev (Development)
- **용도**: 개발 환경
- **배포**: 로컬 또는 개발 환경
- **특징**: 개발 진행 중인 기능들이 통합되는 브랜치
- **보호 수준**: 낮음 (개발자가 유연하게 작업)
- **자동 배포**: 없음 (로컬 테스트)

## 워크플로우

### 1. 기능 개발 (Feature Development)
```bash
# dev 브랜치에서 feature 브랜치 생성
git checkout dev
git pull origin dev
git checkout -b feature/user-authentication

# 개발 진행
# ... 코드 작성 ...

# 커밋 및 푸시
git add .
git commit -m "feat: implement user authentication with Solana wallet"
git push origin feature/user-authentication

# GitHub에서 dev 브랜치로 PR 생성
```

### 2. 스테이징 배포 (Staging Deployment)
```bash
# dev에서 stg로 머지 (multigit 스크립트 사용)
./multigit-merge-dev-to-stg.sh

# 또는 수동으로
git checkout stg
git pull origin stg
git merge dev
git push origin stg
# ✅ 자동으로 스테이징 환경에 배포됩니다
```

### 3. 프로덕션 배포 (Production Deployment)
```bash
# stg에서 main으로 머지 (multigit 스크립트 사용)
./multigit-merge-stg-to-main.sh

# 또는 수동으로
git checkout main
git pull origin main
git merge stg
git push origin main
# ✅ 자동으로 프로덕션 환경에 배포됩니다
```

### 4. 핫픽스 (Hotfix)
프로덕션에서 긴급 버그 수정이 필요한 경우:

```bash
# main에서 hotfix 브랜치 생성
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 수정 및 테스트
# ... 코드 수정 ...

# 커밋 및 푸시
git add .
git commit -m "hotfix: fix critical authentication bug"
git push origin hotfix/critical-bug-fix

# main으로 PR 생성 및 배포
# 배포 후 stg와 dev에도 반영
git checkout stg
git merge main
git push origin stg

git checkout dev
git merge main
git push origin dev
```

## 브랜치 명명 규칙

### Feature Branches
- 형식: `feature/<짧은-설명>`
- 예시: `feature/vpx-system`, `feature/member-management`

### Bugfix Branches
- 형식: `bugfix/<짧은-설명>`
- 예시: `bugfix/login-error`, `bugfix/api-timeout`

### Hotfix Branches
- 형식: `hotfix/<짧은-설명>`
- 예시: `hotfix/security-patch`, `hotfix/payment-issue`

## Commit Message Convention

```
<type>: <subject>

<body (optional)>
```

### Types
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 프로세스, 의존성 등

### 예시
```bash
git commit -m "feat: add VPX verification system"
git commit -m "fix: resolve member list pagination issue"
git commit -m "docs: update API documentation for token endpoints"
```

## MultiGit 스크립트

여러 리포지토리를 동시에 관리하기 위한 스크립트:

### `multigit-pull-dev.sh`
dev 브랜치의 최신 변경사항을 모든 리포지토리에서 가져옵니다.

### `multigit-merge-dev-to-stg.sh`
dev → stg 머지를 모든 리포지토리에서 일괄 수행합니다.

### `multigit-merge-stg-to-main.sh`
stg → main 머지를 모든 리포지토리에서 일괄 수행합니다. (프로덕션 배포)

## GitHub Actions CI/CD

### 자동 배포 트리거
- `dev` 브랜치 push → 로컬/개발 환경 (수동)
- `stg` 브랜치 push → 스테이징 환경 자동 배포
- `main` 브랜치 push → 프로덕션 환경 자동 배포

### 배포 파이프라인
1. **API Server** (gli_api-server)
   - Docker 이미지 빌드
   - ECR 푸시
   - ECS 서비스 업데이트
   - Django 마이그레이션 자동 실행

2. **User Frontend** (gli_user-frontend)
   - Vue.js 빌드
   - S3 업로드
   - CloudFront 캐시 무효화

3. **Admin Frontend** (gli_admin-frontend)
   - Vue.js 빌드
   - S3 업로드
   - CloudFront 캐시 무효화

4. **WebSocket Server** (gli_websocket)
   - Docker 이미지 빌드
   - ECR 푸시
   - ECS 서비스 업데이트

## 주의사항

⚠️ **절대 하지 말아야 할 것**:
- main 브랜치에 직접 push
- force push to main/stg (`git push -f`)
- 리뷰 없이 main으로 merge
- 테스트하지 않은 코드를 stg로 merge

✅ **항상 해야 할 것**:
- dev에서 충분히 테스트
- stg에서 프로덕션 환경과 동일한 조건으로 검증
- PR 생성 시 명확한 설명 작성
- 리뷰어 지정 및 리뷰 반영

## GLI 리포지토리 목록

1. **gli_root** - 메인 프로젝트 루트
2. **gli_admin-frontend** - 관리자 대시보드 (Vue.js)
3. **gli_api-server** - Django REST API
4. **gli_database** - 데이터베이스 설정
5. **gli_rabbitmq** - RabbitMQ 설정
6. **gli_redis** - Redis 설정
7. **gli_user-frontend** - 사용자 프론트엔드 (Vue.js)
8. **gli_websocket** - WebSocket 서버 (Node.js)

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-10-13
