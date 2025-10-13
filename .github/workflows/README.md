# GLI WebSocket Server GitHub Actions 워크플로우

## 필요한 AWS 인프라

배포 전에 다음 AWS 리소스가 필요합니다:

### ECR (Elastic Container Registry)
```bash
aws ecr create-repository --repository-name gli-websocket-staging --region ap-northeast-2
aws ecr create-repository --repository-name gli-websocket-production --region ap-northeast-2
```

### ECS 클러스터 및 서비스
- Staging: `staging-gli-cluster`, `staging-websocket-service`
- Production: `production-gli-cluster`, `production-websocket-service`

### ALB (Application Load Balancer)
- Staging: `stg-ws.glibiz.com`
- Production: `ws.glibiz.com`
- WebSocket 지원 설정 필요

## 필요한 GitHub Secrets

다음 secrets를 GitHub repository에 설정해야 합니다:

### AWS 자격 증명
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## 워크플로우 파일

### ✅ 생성 완료
- `deploy-staging.yml` - stg 브랜치 push 시 자동 배포
- `deploy-production.yml` - main 브랜치 push 시 자동 배포

### 주요 기능
- Node.js 20 기반 Docker 이미지
- Docker 이미지 빌드 및 ECR 푸시
- ECS Task Definition 자동 생성
- ECS 서비스 업데이트
- 배포 상태 검증

## 배포 흐름

### Staging 배포
```
stg 브랜치 push → GitHub Actions → ECR 이미지 빌드 → ECS 서비스 업데이트
```

### Production 배포
```
main 브랜치 push → GitHub Actions → ECR 이미지 빌드 → ECS 서비스 업데이트
```

## 다음 단계

### 1. AWS ECR 리포지토리 생성
위의 명령 실행

### 2. AWS ECS 클러스터 생성
```bash
# 이미 생성되었다면 생략
aws ecs create-cluster --cluster-name staging-gli-cluster --region ap-northeast-2
aws ecs create-cluster --cluster-name production-gli-cluster --region ap-northeast-2
```

### 3. Security Group 생성
```bash
# Staging
aws ec2 create-security-group \
  --group-name staging-websocket-sg \
  --description "WebSocket Staging Security Group" \
  --vpc-id <VPC_ID>

# Production
aws ec2 create-security-group \
  --group-name production-websocket-sg \
  --description "WebSocket Production Security Group" \
  --vpc-id <VPC_ID>
```

### 4. ALB 설정 및 ECS 서비스 생성
- Target Group 생성 (WebSocket 지원)
- ALB 리스너 규칙 설정
- ECS 서비스 생성 (Auto Scaling 설정)

### 5. Route53 레코드 추가
- stg-ws.glibiz.com → Staging ALB
- ws.glibiz.com → Production ALB

### 6. GitHub Secrets 설정
리포지토리 Settings → Secrets and variables → Actions에서 설정

### 7. 테스트 배포 실행
```bash
# Staging 테스트
git checkout stg
git push origin stg

# Production 테스트 (신중하게!)
git checkout main
git push origin main
```

## WebSocket 클라이언트 연결

### Staging
```javascript
const ws = new WebSocket('wss://stg-ws.glibiz.com');

ws.on('open', () => {
  console.log('Connected to staging WebSocket');
});
```

### Production
```javascript
const ws = new WebSocket('wss://ws.glibiz.com');

ws.on('open', () => {
  console.log('Connected to production WebSocket');
});
```

## 모니터링

- GitHub Actions 워크플로우 실행 상태: 리포지토리의 Actions 탭
- ECS 서비스 상태: AWS Console → ECS → Clusters
- CloudWatch Logs: `/ecs/staging-gli-websocket`, `/ecs/production-gli-websocket`
- WebSocket 연결 테스트: wscat 도구 사용

```bash
# wscat 설치
npm install -g wscat

# 연결 테스트
wscat -c wss://stg-ws.glibiz.com
wscat -c wss://ws.glibiz.com
```

## 롤백 절차

### ECS 서비스 롤백
```bash
# 이전 Task Definition으로 롤백
aws ecs update-service \
  --cluster production-gli-cluster \
  --service production-websocket-service \
  --task-definition <PREVIOUS_TASK_DEFINITION_ARN>
```

### Git 레벨 롤백
```bash
git revert <commit-sha>
git push origin main
```
