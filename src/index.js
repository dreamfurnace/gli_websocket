import { WebSocketServer } from "ws";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

// 환경별 .env 파일 로드
if (process.env.NODE_ENV === 'production') {
    dotenv.config(); // 프로덕션: .env 파일 사용
} else {
    dotenv.config({ path: '.env.development' }); // 개발환경: .env.development 사용
}

// 환경변수 검증 및 설정
function validateAndLoadEnvironment() {
    const errors = [];

    // 필수 환경변수 검증
    const requiredEnvVars = ['JWT_SECRET', 'WS_PORT'];

    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            errors.push(`환경변수 ${varName}이(가) 설정되지 않았습니다.`);
        }
    });

    if (errors.length > 0) {
        console.error('❌ 환경변수 검증 실패:');
        errors.forEach(err => console.error(`  - ${err}`));
        console.error('\n💡 .env.development 파일을 확인하거나 생성해주세요.');
        process.exit(1);
    }

    return {
        JWT_SECRET: process.env.JWT_SECRET,
        WS_PORT: parseInt(process.env.WS_PORT || '8080', 10),
        DJANGO_API_URL: process.env.DJANGO_API_URL || 'http://localhost:8000',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672'
    };
}

const config = validateAndLoadEnvironment();

console.log('🚀 GLI WebSocket Server 시작 중...');
console.log(`📍 포트: ${config.WS_PORT}`);
console.log(`🔗 Django API: ${config.DJANGO_API_URL}`);
console.log(`🗂  Redis: ${config.REDIS_URL}`);
console.log(`🐰 RabbitMQ: ${config.RABBITMQ_URL}`);

// HTTP 서버 생성
const httpServer = createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'gli-websocket',
            timestamp: new Date().toISOString(),
            connections: wss ? wss.clients.size : 0
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// WebSocket 서버 생성
const wss = new WebSocketServer({ server: httpServer });

// 연결된 클라이언트 관리
const clients = new Map(); // clientId -> { ws, userId, roomId, ... }

// JWT 검증 함수
function verifyToken(token) {
    try {
        return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
        console.error('JWT 검증 실패:', error.message);
        return null;
    }
}

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    let userId = null;
    let authenticated = false;

    console.log(`🔌 새 연결: ${clientId} (IP: ${req.socket.remoteAddress})`);

    // 클라이언트 정보 저장
    clients.set(clientId, {
        ws,
        clientId,
        userId: null,
        authenticated: false,
        connectedAt: new Date(),
        lastPing: new Date()
    });

    // 환영 메시지
    ws.send(JSON.stringify({
        type: 'welcome',
        clientId,
        message: 'GLI WebSocket 서버에 연결되었습니다',
        timestamp: new Date().toISOString()
    }));

    // 메시지 수신 처리
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`📨 [${clientId}] 메시지 수신:`, message.type);

            switch (message.type) {
                case 'auth':
                    // JWT 인증
                    const payload = verifyToken(message.token);
                    if (payload) {
                        userId = payload.user_id || payload.userId;
                        authenticated = true;

                        const client = clients.get(clientId);
                        client.userId = userId;
                        client.authenticated = true;

                        ws.send(JSON.stringify({
                            type: 'auth_success',
                            userId,
                            message: '인증 성공',
                            timestamp: new Date().toISOString()
                        }));

                        console.log(`✅ [${clientId}] 인증 성공: 사용자 ${userId}`);
                    } else {
                        ws.send(JSON.stringify({
                            type: 'auth_failed',
                            message: '인증 실패: 유효하지 않은 토큰',
                            timestamp: new Date().toISOString()
                        }));

                        console.log(`❌ [${clientId}] 인증 실패`);
                    }
                    break;

                case 'ping':
                    // Ping-Pong
                    const client = clients.get(clientId);
                    if (client) {
                        client.lastPing = new Date();
                    }

                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    }));
                    break;

                case 'echo':
                    // 에코 테스트
                    ws.send(JSON.stringify({
                        type: 'echo_response',
                        data: message.data,
                        timestamp: new Date().toISOString()
                    }));
                    break;

                default:
                    console.log(`⚠️  [${clientId}] 알 수 없는 메시지 타입: ${message.type}`);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `알 수 없는 메시지 타입: ${message.type}`,
                        timestamp: new Date().toISOString()
                    }));
            }
        } catch (error) {
            console.error(`❌ [${clientId}] 메시지 처리 오류:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                message: '메시지 처리 중 오류 발생',
                timestamp: new Date().toISOString()
            }));
        }
    });

    // 연결 종료 처리
    ws.on('close', (code, reason) => {
        console.log(`🔌 [${clientId}] 연결 종료 (코드: ${code}, 이유: ${reason || '없음'})`);
        clients.delete(clientId);
    });

    // 에러 처리
    ws.on('error', (error) => {
        console.error(`❌ [${clientId}] WebSocket 에러:`, error);
        clients.delete(clientId);
    });
});

// Heartbeat 체크 (30초마다)
setInterval(() => {
    const now = new Date();
    let disconnected = 0;

    clients.forEach((client, clientId) => {
        const timeSinceLastPing = now - client.lastPing;

        // 60초 이상 ping 없으면 연결 종료
        if (timeSinceLastPing > 60000) {
            console.log(`⏰ [${clientId}] 타임아웃으로 연결 종료 (마지막 ping: ${timeSinceLastPing}ms 전)`);
            client.ws.terminate();
            clients.delete(clientId);
            disconnected++;
        }
    });

    if (disconnected > 0) {
        console.log(`🧹 타임아웃 정리: ${disconnected}개 연결 종료됨`);
    }
}, 30000);

// 서버 시작
httpServer.listen(config.WS_PORT, () => {
    console.log('✅ GLI WebSocket 서버 시작 완료');
    console.log(`📍 WebSocket: ws://localhost:${config.WS_PORT}`);
    console.log(`🏥 Health Check: http://localhost:${config.WS_PORT}/health`);
    console.log('');
});

// 종료 처리
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM 수신, 서버 종료 중...');
    httpServer.close(() => {
        console.log('✅ 서버 종료 완료');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT 수신, 서버 종료 중...');
    httpServer.close(() => {
        console.log('✅ 서버 종료 완료');
        process.exit(0);
    });
});
