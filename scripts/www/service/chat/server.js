const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './chat.html';
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpeg';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code === 'ENOENT'){
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 房间管理
const rooms = {};
const clients = {};

// 生成唯一ID
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 获取房间信息
function getRoomInfo(roomId) {
    const room = rooms[roomId];
    if (!room) return null;
    
    return {
        id: roomId,
        name: room.name,
        members: Object.keys(room.clients).map(clientId => ({
            id: clientId,
            name: clients[clientId]?.name || '未知',
            avatar: clients[clientId]?.avatar || '?',
            online: true
        }))
    };
}

// 获取所有房间列表
function getAllRooms() {
    return Object.keys(rooms).map(roomId => {
        const room = rooms[roomId];
        return {
            id: roomId,
            name: room.name,
            description: room.description || '',
            members: Object.keys(room.clients).length,
            createdAt: room.createdAt
        };
    });
}

// 获取所有房间列表（带在线人数）
function getAllRoomsWithOnlineCount() {
    return Object.keys(rooms).map(roomId => {
        const room = rooms[roomId];
        return {
            id: roomId,
            name: room.name,
            description: room.description || '',
            onlineCount: Object.keys(room.clients).length,
            createdAt: room.createdAt
        };
    });
}

// WebSocket连接处理
wss.on('connection', (ws) => {
    const clientId = generateId();
    
    // 注册客户端
    clients[clientId] = {
        ws: ws,
        id: clientId,
        name: '用户' + Math.floor(Math.random() * 1000),
        avatar: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
        currentRoom: null
    };

    console.log(`Client connected: ${clientId}`);

    // 发送欢迎消息和房间列表
    ws.send(JSON.stringify({
        type: 'welcome',
        data: {
            clientId: clientId,
            user: clients[clientId],
            rooms: getAllRooms()
        }
    }));

    // 处理消息
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(clientId, data);
        } catch (error) {
            console.error('Invalid message:', error);
        }
    });

    // 连接关闭
    ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        
        const client = clients[clientId];
        if (client && client.currentRoom) {
            leaveRoom(clientId, client.currentRoom);
        }
        
        delete clients[clientId];
    });

    // 错误处理
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// 处理客户端消息
function handleMessage(clientId, data) {
    const client = clients[clientId];
    
    switch (data.type) {
        case 'login':
            handleLogin(clientId, data.data);
            break;
        case 'create-room':
            createRoom(clientId, data.data);
            break;
        case 'join-room':
            joinRoom(clientId, data.data.roomId);
            break;
        case 'leave-room':
            leaveRoom(clientId, data.data.roomId);
            break;
        case 'send-message':
            sendMessage(clientId, data.data);
            break;
        case 'signal':
            forwardSignal(clientId, data.data);
            break;
        case 'update-user':
            updateUser(clientId, data.data);
            break;
        case 'get-rooms':
            sendRooms(clientId);
            break;
        case 'get-room-members':
            sendRoomMembers(clientId, data.data.roomId);
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
}

// 处理登录
function handleLogin(clientId, loginData) {
    const client = clients[clientId];
    if (!client) return;
    
    if (loginData.userId) {
        client.id = loginData.userId;
    }
    if (loginData.name) {
        client.name = loginData.name;
    }
    
    // 发送登录成功消息和房间列表
    client.ws.send(JSON.stringify({
        type: 'login-success',
        data: {
            userId: client.id,
            name: client.name,
            avatar: client.avatar
        }
    }));
    
    // 发送房间列表
    client.ws.send(JSON.stringify({
        type: 'rooms-list',
        data: getAllRooms()
    }));
    
    console.log(`Client logged in: ${clientId} as ${client.name}`);
}

// 创建房间
function createRoom(clientId, roomData) {
    const roomId = 'room_' + Date.now();
    rooms[roomId] = {
        id: roomId,
        name: roomData.name || '未命名房间',
        description: roomData.description || '',
        createdAt: Date.now(),
        clients: {}
    };

    // 创建者自动加入房间
    joinRoom(clientId, roomId);

    // 通知所有客户端房间创建
    broadcast({
        type: 'room-created',
        data: {
            id: roomId,
            name: rooms[roomId].name,
            description: rooms[roomId].description,
            onlineCount: 1,
            createdAt: rooms[roomId].createdAt
        }
    });

    console.log(`Room created: ${roomId} by ${clientId}`);
}

// 加入房间
function joinRoom(clientId, roomId) {
    const room = rooms[roomId];
    const client = clients[clientId];
    
    if (!room || !client) return;

    // 先离开之前的房间
    if (client.currentRoom && client.currentRoom !== roomId) {
        leaveRoom(clientId, client.currentRoom);
    }

    // 加入新房间
    room.clients[clientId] = true;
    client.currentRoom = roomId;

    // 发送房间信息给客户端
    client.ws.send(JSON.stringify({
        type: 'room-joined',
        data: {
            roomId: roomId,
            room: {
                id: roomId,
                name: room.name,
                description: room.description || '',
                onlineCount: Object.keys(room.clients).length,
                createdAt: room.createdAt
            },
            messages: room.messages || []
        }
    }));

    // 通知房间内其他成员
    broadcastToRoom(roomId, {
        type: 'member-joined',
        data: {
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            online: true
        }
    }, clientId);

    // 发送房间列表更新
    broadcast({
        type: 'rooms-list',
        data: getAllRoomsWithOnlineCount()
    });

    console.log(`Client ${clientId} joined room ${roomId}`);
}

// 离开房间
function leaveRoom(clientId, roomId) {
    const room = rooms[roomId];
    const client = clients[clientId];
    
    if (!room || !client) return;

    delete room.clients[clientId];
    client.currentRoom = null;

    // 通知房间内其他成员
    broadcastToRoom(roomId, {
        type: 'member-left',
        data: clientId
    });

    // 如果房间没人了，删除房间
    if (Object.keys(room.clients).length === 0) {
        delete rooms[roomId];
    }

    // 发送房间列表更新
    broadcast({
        type: 'rooms-list',
        data: getAllRoomsWithOnlineCount()
    });

    console.log(`Client ${clientId} left room ${roomId}`);
}

// 发送消息
function sendMessage(clientId, messageData) {
    const client = clients[clientId];
    if (!client || !client.currentRoom) return;

    const room = rooms[client.currentRoom];
    if (!room) return;

    const message = {
        id: generateId(),
        roomId: client.currentRoom,
        senderId: clientId,
        senderName: client.name,
        senderAvatar: client.avatar,
        content: messageData.content,
        type: messageData.type || 'text',
        fileName: messageData.fileName,
        fileSize: messageData.fileSize,
        duration: messageData.duration,
        timestamp: Date.now(),
        status: 'delivered'
    };

    // 保存消息
    if (!room.messages) room.messages = [];
    room.messages.push(message);

    // 广播消息到房间内所有成员（排除发送者）
    broadcastToRoom(client.currentRoom, {
        type: 'message',
        data: message
    }, clientId);

    console.log(`Message sent in room ${client.currentRoom} by ${clientId}`);
}

// 转发WebRTC信令
function forwardSignal(clientId, signalData) {
    const client = clients[clientId];
    if (!client || !client.currentRoom) return;

    broadcastToRoom(client.currentRoom, {
        type: 'signal',
        data: {
            from: clientId,
            to: signalData.to,
            signal: signalData.signal
        }
    }, clientId);
}

// 更新用户信息
function updateUser(clientId, userData) {
    const client = clients[clientId];
    if (!client) return;

    if (userData.name) client.name = userData.name;
    if (userData.avatar) client.avatar = userData.avatar;

    // 通知当前房间的成员
    if (client.currentRoom) {
        broadcastToRoom(client.currentRoom, {
            type: 'userUpdated',
            data: {
                clientId: clientId,
                user: {
                    id: client.id,
                    name: client.name,
                    avatar: client.avatar
                }
            }
        });
    }

    console.log(`User ${clientId} updated: ${client.name}`);
}

// 发送房间列表
function sendRooms(clientId) {
    const client = clients[clientId];
    if (!client) return;

    client.ws.send(JSON.stringify({
        type: 'rooms',
        data: getAllRooms()
    }));
}

// 发送房间成员列表
function sendRoomMembers(clientId, roomId) {
    const client = clients[clientId];
    if (!client) return;

    client.ws.send(JSON.stringify({
        type: 'roomMembers',
        data: getRoomInfo(roomId)?.members || []
    }));
}

// 广播消息给所有客户端
function broadcast(message) {
    const data = JSON.stringify(message);
    Object.values(clients).forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}

// 广播消息给房间内所有成员
function broadcastToRoom(roomId, message, excludeId = null) {
    const room = rooms[roomId];
    if (!room) return;

    const data = JSON.stringify(message);
    Object.keys(room.clients).forEach(clientId => {
        if (clientId === excludeId) return;
        
        const client = clients[clientId];
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}

// 启动服务器
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// 处理进程退出
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});