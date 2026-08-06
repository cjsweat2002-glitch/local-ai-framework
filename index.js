require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 5000;

const WORKSPACE_BASE = path.join(__dirname, 'workspaces');
if (!fs.existsSync(WORKSPACE_BASE)) fs.mkdirSync(WORKSPACE_BASE);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize Local SQLite Database with Profile Columns
const db = new Database('framework_state.db');
db.exec(`CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    complexity_level INTEGER,
    status TEXT,
    prompt TEXT,
    output TEXT,
    profile TEXT
)`);
try {
    db.exec(`ALTER TABLE executions ADD COLUMN profile TEXT`);
} catch (e) {
    // Column already exists
}

const PROFILE_SKILLS = {
    "Standard": { tag: "STD-LOGIC", speed: "1.0x", detail: "Default procedural execution rules." },
    "Manus": { tag: "MANUS-CORE", speed: "1.5x", detail: "Advanced geometric analysis, code sandboxing automation, and hardware-level parsing routines." }
};

const MANUS_API_KEY = process.env.MANUS_API_KEY; 
const MANUS_API_BASE_URL = 'https://api.manus.ai';

app.post('/api/manus-task', async (req, res) => {
    const { prompt, branch, conversationHistory, agentProfile, structuredOutputSchema } = req.body;
    const taskId = `manus_task_${Date.now().toString().slice(-6)}`;

    if (!MANUS_API_KEY) {
        return res.status(500).json({ error: 'Manus API Key not configured.' });
    }

    try {
        db.prepare(`INSERT INTO executions (id, complexity_level, status, prompt, output, profile) VALUES (?, ?, ?, ?, ?, ?)`).run(taskId, 0, 'QUEUED_MANUS', prompt, '', agentProfile || 'Manus');
        io.emit('manus_task_update', { taskId, status: 'QUEUED', prompt, agentProfile });

        const manusTaskPayload = {
            agent_profile: agentProfile || 'standard',
            messages: [
                ...(conversationHistory || []),
                { role: 'user', content: `[Branch: ${branch || 'General'}] ${prompt}` }
            ],
            ...(structuredOutputSchema && { structured_output_schema: structuredOutputSchema })
        };

        const response = await fetch(`${MANUS_API_BASE_URL}/v2/task.create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-manus-api-key': MANUS_API_KEY
            },
            body: JSON.stringify(manusTaskPayload)
        });

        const data = await response.json();

        if (data.ok) {
            const manusTaskId = data.task_id;
            db.prepare(`UPDATE executions SET status = ?, output = ? WHERE id = ?`).run('PROCESSING_MANUS', `Manus Task ID: ${manusTaskId}`, taskId);
            io.emit('manus_task_update', { taskId, status: 'PROCESSING', manusTaskId });
            pollManusTaskStatus(taskId, manusTaskId, agentProfile);
            res.json({ success: true, taskId, manusTaskId, status: 'PROCESSING_MANUS', agentProfile });
        } else {
            db.prepare(`UPDATE executions SET status = ?, output = ? WHERE id = ?`).run('FAILED_MANUS', `Manus API Error: ${data.error.message}`, taskId);
            io.emit('manus_task_update', { taskId, status: 'FAILED', error: data.error.message });
            res.status(500).json({ error: data.error.message });
        }
    } catch (error) {
        db.prepare(`UPDATE executions SET status = ?, output = ? WHERE id = ?`).run('FAILED_MANUS', `Integration Error: ${error.message}`, taskId);
        io.emit('manus_task_update', { taskId, status: 'FAILED', error: error.message });
        res.status(500).json({ error: 'Internal server error.' });
    }
});

async function pollManusTaskStatus(localTaskId, manusTaskId, agentProfile) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`${MANUS_API_BASE_URL}/v2/task.listMessages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-manus-api-key': MANUS_API_KEY
                },
                body: JSON.stringify({ task_id: manusTaskId })
            });
            const data = await response.json();

            if (data.ok && data.messages) {
                const lastMessage = data.messages[data.messages.length - 1];
                const status = lastMessage.status;
                const output = lastMessage.content || (lastMessage.structured_output_result && JSON.stringify(lastMessage.structured_output_result.value, null, 2)) || 'No output yet.';

                io.emit('manus_task_update', { localTaskId, manusTaskId, status, output, agentProfile });
                db.prepare(`UPDATE executions SET status = ?, output = ? WHERE id = ?`).run(status, output, localTaskId);

                if (status === 'COMPLETED' || status === 'FAILED' || status === 'STOPPED') {
                    clearInterval(interval);
                    io.emit('manus_task_completed', { localTaskId, manusTaskId, status, finalOutput: output, agentProfile });
                }
            } else if (!data.ok) {
                clearInterval(interval);
                io.emit('manus_task_completed', { localTaskId, manusTaskId, status: 'FAILED', error: data.error.message });
                db.prepare(`UPDATE executions SET status = ?, output = ? WHERE id = ?`).run('FAILED_MANUS', `Polling Error: ${data.error.message}`, localTaskId);
            }
        } catch (error) {
            clearInterval(interval);
            io.emit('manus_task_completed', { localTaskId, manusTaskId, status: 'FAILED', error: error.message });
            db.prepare(`UPDATE executions SET status = ?, output = ? WHERE id = ?`).run('FAILED_MANUS', `Polling Error: ${error.message}`, localTaskId);
        }
    }, 5000);
}

app.post('/api/task', (req, res) => {
    const { prompt, level, profile } = req.body;
    const activeProfile = profile || "Standard";
    const taskId = `task_${Date.now().toString().slice(-6)}`;
    try {
        db.prepare(`INSERT INTO executions (id, complexity_level, status, prompt, output, profile) VALUES (?, ?, ?, ?, ?, ?)`).run(taskId, level, 'QUEUED', prompt, '', activeProfile);
        processAgentTask(taskId, level, prompt, activeProfile);
        res.json({ success: true, taskId, status: 'QUEUED', assignedLevel: level, profile: activeProfile });
    } catch (err) {
        return res.status(500).json({ error: 'Database transaction failed' });
    }
});

function processAgentTask(taskId, level, prompt, profile) {
    db.prepare(`UPDATE executions SET status = 'PROCESSING' WHERE id = ?`).run(taskId);
    io.emit('task_update', { taskId, status: 'PROCESSING', level, profile });
    const config = PROFILE_SKILLS[profile] || PROFILE_SKILLS["Standard"];
    io.emit('terminal_stream', { taskId, chunk: `\n[PROFILE EMULATION ACTIVE]: Executing as [${profile}]\n\n` });
    if (level === 1) {
        finalizeTask(taskId, 'COMPLETED', `Processed via ${config.tag}.`);
    } else if (level === 2) {
        finalizeTask(taskId, 'COMPLETED', JSON.stringify({ mode: 'milestones', steps: ['Initialize', 'Analyze', 'Compile'] }));
    } else if (level === 3) {
        executeCodeSandbox(taskId, prompt, profile);
    }
}

function executeCodeSandbox(taskId, prompt, profile) {
    const projectDir = path.join(WORKSPACE_BASE, taskId);
    fs.mkdirSync(projectDir, { recursive: true });
    const scriptPath = path.join(projectDir, 'runner.py');
    const config = PROFILE_SKILLS[profile] || PROFILE_SKILLS["Standard"];
    const pythonScript = `print("-> [${profile} Sandbox Pipeline Initialized]")\nprint(f"-> Active Kernel Mode: ${config.tag}")`;
    fs.writeFileSync(scriptPath, pythonScript.trim());
    const child = spawn('python', [scriptPath], { cwd: projectDir });
    let terminalAccumulator = '';
    child.stdout.on('data', (data) => {
        const chunk = data.toString();
        terminalAccumulator += chunk;
        io.emit('terminal_stream', { taskId, chunk });
    });
    child.on('close', (code) => {
        finalizeTask(taskId, (code === 0) ? 'COMPLETED' : 'FAILED', terminalAccumulator);
    });
}

function finalizeTask(taskId, status, output) {
    db.prepare(`UPDATE executions SET status = ?, output = ? WHERE id = ?`).run(status, output, taskId);
    io.emit('task_update', { taskId, status, finalOutput: output });
}

let agentCommandQueue = [];
app.post('/api/agent/enqueue', (req, res) => {
    const { command, profile } = req.body;
    const cmdId = `cmd_${Date.now().toString().slice(-4)}`;
    agentCommandQueue.push({ id: cmdId, command, profile: profile || 'Manus' });
    res.json({ success: true, cmdId, status: "QUEUED" });
});

app.get('/api/agent/next', (req, res) => {
    if (agentCommandQueue.length > 0) res.json(agentCommandQueue.shift());
    else res.json({ idle: true });
});

app.post('/api/agent/callback', (req, res) => {
    const { id, output, status } = req.body;
    io.emit('terminal_stream', { taskId: id, chunk: `\n[AGENT CALLBACK]: ${status}\n${output}\n` });
    res.json({ received: true });
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`[AI PLATFORM ENGINE]: Active at http://127.0.0.1:${PORT}`);
    console.log(`======================================================\n`);
});
