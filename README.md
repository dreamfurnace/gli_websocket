# GLI WebSocket Server

GLI Platform의 실시간 통신을 위한 WebSocket 서버입니다.

## 기능

- WebSocket 실시간 연결
- JWT 기반 인증
- Ping/Pong heartbeat
- Health check endpoint
- Redis & RabbitMQ 연동 준비

## 설치

```bash
npm install
```

## 개발 환경 설정

`.env.development` 파일을 수정하여 환경변수를 설정하세요:

```env
JWT_SECRET=your-secret-key-here
WS_PORT=8080
DJANGO_API_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://admin:admin@localhost:5672
```

## 실행

### 개발 모드
```bash
npm run dev
```

### 프로덕션 모드
```bash
npm start
```

### 백그라운드 실행
```bash
../restart-websocket.sh --bf
```

## 테스트

### Health Check
```bash
curl http://localhost:8080/health
```

### WebSocket 연결 테스트
```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('연결됨');

    // 인증
    ws.send(JSON.stringify({
        type: 'auth',
        token: 'your-jwt-token'
    }));

    // Ping
    ws.send(JSON.stringify({ type: 'ping' }));
};

ws.onmessage = (event) => {
    console.log('수신:', JSON.parse(event.data));
};
```

## API

### 메시지 타입

#### auth
클라이언트 인증

```json
{
    "type": "auth",
    "token": "jwt-token"
}
```

#### ping
연결 유지 확인

```json
{
    "type": "ping"
}
```

#### echo
에코 테스트

```json
{
    "type": "echo",
    "data": "test message"
}
```

## 로그

로그 파일 위치: `./logs/gli_websocket.log`

```bash
tail -f ./logs/gli_websocket.log
```
