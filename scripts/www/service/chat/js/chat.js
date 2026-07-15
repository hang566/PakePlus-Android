// 全局状态
let ws = null;
let peerConnection = null;
let localStream = null;
let dataChannel = null;
let isAudioOn = true;
let isVideoOn = true;
let currentRoom = null;
let rooms = [];
let currentUser = { id: '', name: '我', avatar: '我' };
let mediaRecorder = null;
let isRecording = false;
let messages = {};
let roomMembers = {};
let signalingPartner = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// WebRTC配置 - 局域网优先使用本地STUN
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ]
};

// 表情列表
const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
    '😚', '😋', '🤤', '😛', '😜', '🤪', '😝', '🤑',
    '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑',
    '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔',
    '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎',
    '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯',
    '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥',
    '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩',
    '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
    '🐵', '🐶', '🐺', '🦊', '🦝', '🐱', '🦁', '🐯',
    '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸'
];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initEmojiGrid();
    connectWebSocket();
    loadMockData();
});

// 连接WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = 8080;
    const url = `${protocol}//${host}:${port}`;

    console.log('连接WebSocket:', url);
    
    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log('WebSocket连接成功');
        reconnectAttempts = 0;
        updateConnectionStatus('已连接', '#07c160');
        
        // 发送登录消息
        const userId = localStorage.getItem('userId') || 'user_' + Date.now();
        localStorage.setItem('userId', userId);
        currentUser.id = userId;
        
        sendToServer('login', { userId, name: currentUser.name });
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleServerMessage(message);
        } catch (error) {
            console.error('解析消息失败:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        updateConnectionStatus('连接错误', '#dc3545');
    };

    ws.onclose = () => {
        console.log('WebSocket连接关闭');
        updateConnectionStatus('已断开', '#dc3545');
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = Math.min(Math.pow(2, reconnectAttempts) * 1000, 30000);
            console.log(`尝试重新连接 (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})，延迟 ${delay}ms`);
            setTimeout(connectWebSocket, delay);
        } else {
            console.log('已达到最大重连尝试次数');
        }
    };
}

// 发送消息到服务器
function sendToServer(type, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data }));
    }
}

// 处理服务器消息
function handleServerMessage(message) {
    switch (message.type) {
        case 'login-success':
            currentUser.id = message.data.userId;
            currentUser.name = message.data.name;
            break;
        
        case 'rooms-list':
            rooms = message.data;
            updateRoomList();
            break;
        
        case 'room-created':
            rooms.push(message.data);
            updateRoomList();
            break;
        
        case 'room-joined':
            currentRoom = message.data.room;
            messages[currentRoom.id] = [];
            updateRoomList();
            updateRoomSelector();
            updateChatHeader();
            loadMessages(message.data.roomId);
            break;
        
        case 'member-joined':
            if (!roomMembers[currentRoom.id]) {
                roomMembers[currentRoom.id] = [];
            }
            const existingMember = roomMembers[currentRoom.id].find(m => m.id === message.data.id);
            if (!existingMember) {
                roomMembers[currentRoom.id].push(message.data);
            }
            updateMemberList();
            break;
        
        case 'member-left':
            if (roomMembers[currentRoom.id]) {
                roomMembers[currentRoom.id] = roomMembers[currentRoom.id].filter(m => m.id !== message.data);
            }
            updateMemberList();
            break;
        
        case 'message':
            addMessage(message.data);
            break;
        
        case 'signal':
            handleSignal(message.data);
            break;
        
        case 'peer-connected':
            signalingPartner = message.data.from;
            console.log('P2P连接已建立:', signalingPartner);
            break;
        
        default:
            console.log('未知消息类型:', message.type);
    }
}

// 更新连接状态
function updateConnectionStatus(status, color) {
    const element = document.getElementById('connectionStatus');
    if (element) {
        element.textContent = status;
        element.style.color = color;
    }
}

// 初始化表情选择器
function initEmojiGrid() {
    const emojiGrid = document.getElementById('emojiGrid');
    if (emojiGrid) {
        emojis.forEach(emoji => {
            const button = document.createElement('button');
            button.textContent = emoji;
            button.style.fontSize = '24px';
            button.style.padding = '8px';
            button.style.border = 'none';
            button.style.background = 'transparent';
            button.style.cursor = 'pointer';
            button.style.borderRadius = '8px';
            button.onclick = () => insertEmoji(emoji);
            button.onmouseenter = () => button.style.background = '#f0f0f0';
            button.onmouseleave = () => button.style.background = 'transparent';
            emojiGrid.appendChild(button);
        });
    }
}

// 插入表情
function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    if (input) {
        input.value += emoji;
        input.focus();
    }
    closeEmojiModal();
}

// 显示/隐藏表情选择器
function toggleEmojiPicker() {
    const modal = document.getElementById('emojiModal');
    if (modal) {
        modal.classList.toggle('show');
    }
}

function closeEmojiModal() {
    const modal = document.getElementById('emojiModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 显示创建房间弹窗
function showCreateRoomModal() {
    const modal = document.getElementById('createRoomModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeCreateRoomModal() {
    const modal = document.getElementById('createRoomModal');
    if (modal) {
        modal.classList.remove('show');
    }
    document.getElementById('roomNameInput').value = '';
    document.getElementById('roomDescInput').value = '';
}

// 创建房间
function createRoom() {
    const roomName = document.getElementById('roomNameInput').value.trim();
    const roomDesc = document.getElementById('roomDescInput').value.trim();
    
    if (!roomName) {
        alert('请输入房间名称');
        return;
    }
    
    sendToServer('create-room', { name: roomName, description: roomDesc });
    closeCreateRoomModal();
}

// 更新房间列表
function updateRoomList() {
    const roomList = document.getElementById('roomList');
    if (!roomList) return;
    
    if (rooms.length === 0) {
        roomList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">💬</span>
                <span class="empty-text">暂无房间</span>
            </div>
        `;
        return;
    }
    
    roomList.innerHTML = rooms.map(room => `
        <div class="room-item ${currentRoom?.id === room.id ? 'active' : ''}" onclick="joinRoom('${room.id}')">
            <div class="room-avatar">${room.name.charAt(0)}</div>
            <div class="room-info">
                <div class="room-name">${room.name}</div>
                <div class="room-meta">
                    <span class="online-badge ${room.onlineCount > 0 ? '' : 'offline'}"></span>
                    <span>${room.onlineCount} 人在线</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 更新房间选择器
function updateRoomSelector() {
    const selector = document.getElementById('roomSelector');
    if (!selector) return;
    
    selector.innerHTML = '<option value="">选择房间</option>' + 
        rooms.map(room => `
            <option value="${room.id}" ${currentRoom?.id === room.id ? 'selected' : ''}>${room.name}</option>
        `).join('');
}

// 加入房间
function joinRoom(roomId) {
    sendToServer('join-room', { roomId });
}

// 切换房间
function switchRoom() {
    const selector = document.getElementById('roomSelector');
    const roomId = selector.value;
    if (roomId) {
        joinRoom(roomId);
    }
}

// 更新聊天头部
function updateChatHeader() {
    if (!currentRoom) {
        document.getElementById('currentRoomAvatar').textContent = '?';
        document.getElementById('currentRoomName').textContent = '选择一个房间开始聊天';
        document.getElementById('currentRoomStatus').innerHTML = '<span class="online-dot"></span><span>离线</span>';
        return;
    }
    
    document.getElementById('currentRoomAvatar').textContent = currentRoom.name.charAt(0);
    document.getElementById('currentRoomName').textContent = currentRoom.name;
    document.getElementById('currentRoomStatus').innerHTML = `
        <span class="online-dot"></span>
        <span>${roomMembers[currentRoom.id]?.length || 0} 人在线</span>
    `;
}

// 加载消息
function loadMessages(roomId) {
    messages[roomId] = messages[roomId] || [];
    updateMessagesContainer();
}

// 更新消息容器
function updateMessagesContainer() {
    const container = document.getElementById('messagesContainer');
    if (!container || !currentRoom) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">💬</span>
                <span class="empty-text">选择房间开始聊天</span>
            </div>
        `;
        return;
    }
    
    const roomMessages = messages[currentRoom.id] || [];
    
    if (roomMessages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">💬</span>
                <span class="empty-text">开始发送消息吧</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = roomMessages.map(msg => createMessageElement(msg)).join('');
    container.scrollTop = container.scrollHeight;
}

// 创建消息元素
function createMessageElement(msg) {
    const isLocal = msg.senderId === currentUser.id;
    const avatar = isLocal ? currentUser.avatar : (msg.senderAvatar || '?');
    const senderName = isLocal ? '我' : (msg.senderName || '未知');
    
    let content = '';
    
    switch (msg.type) {
        case 'text':
            content = `<div class="message-bubble">${escapeHtml(msg.content)}</div>`;
            break;
        
        case 'voice':
            content = `
                <div class="message-bubble">
                    <div class="voice-message" id="voice-${msg.id}">
                        <button class="voice-play-btn" onclick="playVoice('${msg.id}', '${msg.content}')">▶</button>
                        <div class="voice-wave">
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                            <div class="voice-bar"></div>
                        </div>
                        <span class="voice-duration">${msg.duration || '0:00'}</span>
                    </div>
                </div>
            `;
            break;
        
        case 'image':
            content = `
                <div class="message-bubble">
                    <img class="message-image" src="${msg.content}" onclick="previewImage('${msg.content}')">
                </div>
            `;
            break;
        
        case 'file':
            content = `
                <div class="message-bubble">
                    <div class="file-message" onclick="downloadFile('${msg.content}', '${msg.fileName}')">
                        <span class="file-icon">📄</span>
                        <div class="file-info">
                            <div class="file-name">${msg.fileName}</div>
                            <div class="file-size">${msg.fileSize}</div>
                        </div>
                    </div>
                </div>
            `;
            break;
        
        default:
            content = `<div class="message-bubble">${escapeHtml(msg.content)}</div>`;
    }
    
    return `
        <div class="message ${isLocal ? 'local' : 'remote'}">
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${senderName}</span>
                    <span class="message-time">${formatTime(msg.timestamp)}</span>
                </div>
                ${content}
                ${isLocal ? `<div class="message-status ${msg.status || 'sent'}">${msg.status === 'delivered' ? '已送达' : '已发送'}</div>` : ''}
            </div>
        </div>
    `;
}

// 转义HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 添加消息
function addMessage(msg) {
    if (!currentRoom) return;
    
    if (!messages[currentRoom.id]) {
        messages[currentRoom.id] = [];
    }
    
    messages[currentRoom.id].push(msg);
    updateMessagesContainer();
}

// 发送消息
function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content || !currentRoom) return;
    
    const message = {
        roomId: currentRoom.id,
        type: 'text',
        content,
        senderId: currentUser.id,
        senderName: currentUser.name,
        timestamp: Date.now(),
        status: 'sent'
    };
    
    sendToServer('send-message', message);
    addMessage({ ...message, senderId: currentUser.id });
    input.value = '';
    
    // 通过Data Channel发送（如果P2P已建立）
    sendViaDataChannel(content);
}

// 通过Data Channel发送消息
function sendViaDataChannel(content) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'message',
            content,
            senderId: currentUser.id,
            senderName: currentUser.name,
            timestamp: Date.now()
        }));
    }
}

// 处理输入框按键
function handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// 选择图片
function selectImage() {
    document.getElementById('imageInput').click();
}

// 发送图片
function sendImage() {
    const input = document.getElementById('imageInput');
    const file = input.files[0];
    
    if (!file || !currentRoom) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const message = {
            roomId: currentRoom.id,
            type: 'image',
            content: e.target.result,
            senderId: currentUser.id,
            senderName: currentUser.name,
            timestamp: Date.now(),
            status: 'sent'
        };
        
        sendToServer('send-message', message);
        addMessage({ ...message, senderId: currentUser.id });
    };
    
    reader.readAsDataURL(file);
    input.value = '';
}

// 选择文件
function selectFile() {
    document.getElementById('fileInput').click();
}

// 发送文件
function sendFile() {
    const input = document.getElementById('fileInput');
    const file = input.files[0];
    
    if (!file || !currentRoom) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const message = {
            roomId: currentRoom.id,
            type: 'file',
            content: e.target.result,
            fileName: file.name,
            fileSize: formatFileSize(file.size),
            senderId: currentUser.id,
            senderName: currentUser.name,
            timestamp: Date.now(),
            status: 'sent'
        };
        
        sendToServer('send-message', message);
        addMessage({ ...message, senderId: currentUser.id });
    };
    
    reader.readAsDataURL(file);
    input.value = '';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 预览图片
function previewImage(src) {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `<img class="preview-image" src="${src}">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

// 下载文件
function downloadFile(dataUrl, fileName) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.click();
}

// 录音相关
function toggleRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            isRecording = true;
            
            const chunks = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = (e) => {
                    const message = {
                        roomId: currentRoom.id,
                        type: 'voice',
                        content: e.target.result,
                        duration: formatDuration(chunks),
                        senderId: currentUser.id,
                        senderName: currentUser.name,
                        timestamp: Date.now(),
                        status: 'sent'
                    };
                    
                    sendToServer('send-message', message);
                    addMessage({ ...message, senderId: currentUser.id });
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start(1000);
            updateRecordingUI(true);
        })
        .catch(error => {
            console.error('录音失败:', error);
            alert('无法访问麦克风');
        });
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        updateRecordingUI(false);
    }
}

function updateRecordingUI(isRecording) {
    const sendBtn = document.getElementById('sendBtn');
    if (isRecording) {
        sendBtn.textContent = '⏹';
        sendBtn.style.background = '#dc3545';
        sendBtn.onclick = stopRecording;
    } else {
        sendBtn.textContent = '➤';
        sendBtn.style.background = '#07c160';
        sendBtn.onclick = sendMessage;
    }
}

function formatDuration(chunks) {
    const duration = chunks.length;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// 播放语音
function playVoice(msgId, dataUrl) {
    const voiceElement = document.getElementById(`voice-${msgId}`);
    if (!voiceElement) return;
    
    const audio = new Audio(dataUrl);
    audio.onplaying = () => voiceElement.classList.add('playing');
    audio.onended = () => voiceElement.classList.remove('playing');
    audio.play();
}

// 显示成员列表
function showMemberList() {
    const sidebar = document.getElementById('membersSidebar');
    const modal = document.getElementById('membersModal');
    
    if (window.innerWidth > 1200) {
        sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
    } else {
        modal.classList.add('show');
    }
    
    updateMemberList();
}

function closeMembersModal() {
    const modal = document.getElementById('membersModal');
    modal.classList.remove('show');
}

// 更新成员列表
function updateMemberList() {
    const members = roomMembers[currentRoom?.id] || [];
    
    // 更新侧边栏
    const sidebarList = document.getElementById('membersList');
    const modalList = document.getElementById('modalMembersList');
    
    const html = members.map(member => `
        <div class="member-item ${member.id === currentUser.id ? 'owner' : ''}">
            <div class="member-avatar">
                ${member.avatar || '?'}
                <div class="member-status ${member.online ? '' : 'offline'}"></div>
            </div>
            <div class="member-info">
                <div class="member-name">${member.name}</div>
                <div class="member-role">${member.id === currentUser.id ? '我' : member.role || '成员'}</div>
            </div>
        </div>
    `).join('');
    
    if (sidebarList) sidebarList.innerHTML = html;
    if (modalList) modalList.innerHTML = html;
    
    // 更新成员数量
    const count = document.getElementById('membersCount');
    if (count) {
        count.textContent = `${members.length} 人在线`;
    }
}

// 视频通话相关
function showVideoCall() {
    if (!peerConnection) {
        startPeerConnection();
    }
    
    const modal = document.getElementById('videoModal');
    modal.classList.add('show');
}

function closeVideoCall() {
    const modal = document.getElementById('videoModal');
    modal.classList.remove('show');
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    document.getElementById('localVideo').srcObject = null;
    document.getElementById('remoteVideo').srcObject = null;
}

function toggleAudio() {
    if (localStream) {
        isAudioOn = !isAudioOn;
        localStream.getAudioTracks().forEach(track => track.enabled = isAudioOn);
        
        const btn = document.getElementById('audioBtn');
        btn.textContent = isAudioOn ? '🔊' : '🔇';
        btn.classList.toggle('disabled', !isAudioOn);
    }
}

function toggleVideo() {
    if (localStream) {
        isVideoOn = !isVideoOn;
        localStream.getVideoTracks().forEach(track => track.enabled = isVideoOn);
        
        const btn = document.getElementById('videoBtn');
        btn.textContent = isVideoOn ? '📹' : '📷';
        btn.classList.toggle('disabled', !isVideoOn);
    }
}

// 启动WebRTC Peer连接
async function startPeerConnection() {
    try {
        // 获取本地媒体流
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;
        
        // 创建PeerConnection
        peerConnection = new RTCPeerConnection(configuration);
        
        // 添加本地轨道到PeerConnection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // 处理远程轨道
        peerConnection.ontrack = (event) => {
            document.getElementById('remoteVideo').srcObject = event.streams[0];
        };
        
        // 处理ICE候选
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && signalingPartner) {
                sendToServer('signal', {
                    to: signalingPartner,
                    signal: {
                        type: 'ice-candidate',
                        candidate: event.candidate
                    }
                });
            }
        };
        
        // 处理Data Channel消息
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            dataChannel.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === 'message') {
                    addMessage({
                        ...msg,
                        type: 'text',
                        status: 'delivered'
                    });
                }
            };
        };
        
        // 创建Data Channel
        dataChannel = peerConnection.createDataChannel('chat');
        dataChannel.onopen = () => {
            console.log('Data Channel已打开');
        };
        dataChannel.onclose = () => {
            console.log('Data Channel已关闭');
        };
        
        // 创建Offer
        createOffer();
        
    } catch (error) {
        console.error('WebRTC错误:', error);
        alert('无法启动视频通话: ' + error.message);
    }
}

// 创建Offer
async function createOffer() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        sendToServer('signal', {
            to: signalingPartner,
            signal: {
                type: 'offer',
                sdp: offer.sdp
            }
        });
    } catch (error) {
        console.error('创建Offer失败:', error);
    }
}

// 处理信令消息
function handleSignal(data) {
    if (!peerConnection) {
        startPeerConnection();
    }
    
    signalingPartner = data.from;
    
    switch (data.signal.type) {
        case 'offer':
            handleOffer(data.signal);
            break;
        
        case 'answer':
            handleAnswer(data.signal);
            break;
        
        case 'ice-candidate':
            handleIceCandidate(data.signal);
            break;
    }
}

// 处理Offer
async function handleOffer(signal) {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription({
            type: 'offer',
            sdp: signal.sdp
        }));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        sendToServer('signal', {
            to: signalingPartner,
            signal: {
                type: 'answer',
                sdp: answer.sdp
            }
        });
    } catch (error) {
        console.error('处理Offer失败:', error);
    }
}

// 处理Answer
async function handleAnswer(signal) {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: signal.sdp
        }));
    } catch (error) {
        console.error('处理Answer失败:', error);
    }
}

// 处理ICE候选
async function handleIceCandidate(signal) {
    try {
        if (signal.candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    } catch (error) {
        console.error('处理ICE候选失败:', error);
    }
}

// 加载模拟数据
function loadMockData() {
    if (rooms.length === 0) {
        rooms = [
            { id: 'room1', name: '技术讨论群', description: '技术交流和分享', onlineCount: 3, createdAt: Date.now() },
            { id: 'room2', name: '产品团队', description: '产品需求讨论', onlineCount: 2, createdAt: Date.now() },
            { id: 'room3', name: '项目组', description: '项目进度同步', onlineCount: 5, createdAt: Date.now() }
        ];
        updateRoomList();
        updateRoomSelector();
    }
}

// 点击外部关闭弹窗
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});