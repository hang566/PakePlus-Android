const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const DB_DIR = path.join(__dirname, '../../db');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'DELETE' && req.url === '/api/data/clear') {
        handleClearData(req, res);
    } else if (req.method === 'GET' && req.url === '/api/data') {
        handleGetData(req, res);
    } else if (req.method === 'POST' && req.url === '/api/data') {
        handlePostData(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

function handleClearData(req, res) {
    try {
        const pluginCenterPath = path.join(DB_DIR, 'PluginCenter', 'PluginCenter.json');
        
        const defaultData = JSON.stringify([
            {
                "dbPluginCenter": "本地插件数据库",
                "dbPluginCenter-V": "0.1"
            }
        ], null, 2);

        fs.writeFileSync(pluginCenterPath, defaultData);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: '所有站点数据已清空' }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
    }
}

function handleGetData(req, res) {
    try {
        const pluginCenterPath = path.join(DB_DIR, 'PluginCenter', 'PluginCenter.json');
        const data = fs.readFileSync(pluginCenterPath, 'utf-8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
    }
}

function handlePostData(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const pluginCenterPath = path.join(DB_DIR, 'PluginCenter', 'PluginCenter.json');
            
            fs.writeFileSync(pluginCenterPath, JSON.stringify(data, null, 2));
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: '数据导入成功' }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
    });
}

server.listen(PORT, () => {
    console.log(`数据管理服务器运行在 http://localhost:${PORT}`);
});