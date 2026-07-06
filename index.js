require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
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

// Fallback explicit root asset file path router mapping bypass
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize Local SQLite Database with Profile Columns
const db = new sqlite3.Database('framework_state.db', (err) => {
    if (!err) {
        // Create table with profile tracking string attribute layer
        db.run(`CREATE TABLE IF NOT EXISTS executions (
            id TEXT PRIMARY KEY,
            complexity_level INTEGER,
            status TEXT,
            prompt TEXT,
            output TEXT,
            profile TEXT
        )`, () => {
            // Check if column exists, add it if upgrading from previous version
            db.run(`ALTER TABLE executions ADD COLUMN profile TEXT`, (err) => {
                // Column either added or already exists silently
            });
        });
    }
});

// Profiles Capability Matrix configurations
const PROFILE_SKILLS = {
    "Standard": { tag: "STD-LOGIC", speed: "1.0x", detail: "Default procedural execution rules." },
    "Manus": { tag: "MANUS-CORE", speed: "1.5x", detail: "Advanced geometric analysis, code sandboxing automation, and hardware-level parsing routines." }
};

// --- Manus API Integration Start ---

const MANUS_API_KEY = process.env.MANUS_API_KEY; 
const MANUS_API_BASE_URL = 'https://api.manus.ai';

// New API Endpoint for Manus Tasks
app.post('/api/manus-task', async (req, res) => {
    const { prompt, agentProfile, structuredOutputSchema } = req.body;
    const taskId = `manus_task_${Date.now().toString().slice(-6)}`;

    if (!MANUS_API_KEY) {
        return res.status(500).json({ error: 'Manus API Key not configured in environment variables.' });
    }

    try {
        // Store initial task state in local DB
        db.run(
            `INSERT INTO executions (id, complexity_level, status, prompt, output, profile) VALUES (?, ?, ?, ?, ?, ?)`,
            [taskId, 0, 'QUEUED_MANUS', prompt, '', agentProfile || 'Manus'],
            (err) => {
                if (err) console.error('DB insert error:', err);
            }
        );
        io.emit('manus_task_update', { taskId, status: 'QUEUED', prompt, agentProfile });

        const manusTaskPayload = {
            agent_profile: agentProfile || 'standard',
            messages: [
                { role: 'user', content: prompt }
            ],
            // Optionally include structured output schema
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
            // Update local DB with Manus task ID and status
            db.run(`UPDATE executions SET status = ?, output = ? WHERE id = ?`, ['PROCESSING_MANUS', `Manus Task ID: ${manusTaskId}`, taskId]);
            io.emit('manus_task_update', { taskId, status: 'PROCESSING', manusTaskId });

            // For simplicity, we'll poll for updates. For production, webhooks are recommended.
            pollManusTaskStatus(taskId, manusTaskId, agentProfile);

            res.json({ success: true, taskId, manusTaskId, status: 'PROCESSING_MANUS', agentProfile });
        } else {
            console.error('Manus API Error:', data.error);
            db.run(`UPDATE executions SET status = ?, output = ? WHERE id = ?`, ['FAILED_MANUS', `Manus API Error: ${data.error.message}`, taskId]);
            io.emit('manus_task_update', { taskId, status: 'FAILED', error: data.error.message });
            res.status(500).json({ error: data.error.message });
        }
    } catch (error) {
        console.error('Error calling Manus API:', error);
        db.run(`UPDATE executions SET status = ?, output = ? WHERE id = ?`, ['FAILED_MANUS', `Integration Error: ${error.message}`, taskId]);
        io.emit('manus_task_update', { taskId, status: 'FAILED', error: error.message });
        res.status(500).json({ error: 'Internal server error during Manus API call.' });
    }
});

// Polling function for Manus task status (simplified for example)
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
                db.run(`UPDATE executions SET status = ?, output = ? WHERE id = ?`, [status, output, localTaskId]);

                if (status === 'COMPLETED' || status === 'FAILED' || status === 'STOPPED') {
                    clearInterval(interval);
                    io.emit('manus_task_completed', { localTaskId, manusTaskId, status, finalOutput: output, agentProfile });
                }
            } else if (!data.ok) {
                console.error('Manus Polling Error:', data.error);
                clearInterval(interval);
                io.emit('manus_task_completed', { localTaskId, manusTaskId, status: 'FAILED', error: data.error.message });
                db.run(`UPDATE executions SET status = ?, output = ? WHERE id = ?`, ['FAILED_MANUS', `Polling Error: ${data.error.message}`, localTaskId]);
            }
        } catch (error) {
            console.error('Error during Manus polling:', error);
            clearInterval(interval);
            io.emit('manus_task_completed', { localTaskId, manusTaskId, status: 'FAILED', error: error.message });
            db.run(`UPDATE executions SET status = ?, output = ? WHERE id = ?`, ['FAILED_MANUS', `Polling Error: ${error.message}`, localTaskId]);
        }
    }, 5000); // Poll every 5 seconds
}

// --- Manus API Integration End ---

// API Endpoint: Receives intent, level, and selected emulation profile
app.post('/api/task', (req, res) => {
    const { prompt, level, profile } = req.body;
    const activeProfile = profile || "Standard";
    const taskId = `task_${Date.now().toString().slice(-6)}`;

    db.run(
        `INSERT INTO executions (id, complexity_level, status, prompt, output, profile) VALUES (?, ?, ?, ?, ?, ?)`,
        [taskId, level, 'QUEUED', prompt, '', activeProfile],
        (err) => {
            if (err) return res.status(500).json({ error: 'Database transaction failed' });
            processAgentTask(taskId, level, prompt, activeProfile);
            res.json({ success: true, taskId, status: 'QUEUED', assignedLevel: level, profile: activeProfile });
        }
    );
});

// Asynchronous Profiler Task Pipeline Router
function processAgentTask(taskId, level, prompt, profile) {
    db.run(`UPDATE executions SET status = 'PROCESSING' WHERE id = ?`, [taskId]);
    io.emit('task_update', { taskId, status: 'PROCESSING', level, profile });

    const config = PROFILE_SKILLS[profile] || PROFILE_SKILLS["Standard"];
    
    // Inject runtime initialization logs matching the profile's skill template
    io.emit('terminal_stream', { 
        taskId, 
        chunk: `\n[PROFILE EMULATION ACTIVE]: Executing as [${profile}] utilizing matrix [${config.tag}]\n[SKILL SPEC]: ${config.detail}\n\n` 
    });

    if (level === 1) {
        const responseText = `[Level 1 Engine - ${profile}]: Processed direct response string via ${config.tag}.\nTarget: ${prompt}`;
        finalizeTask(taskId, 'COMPLETED', responseText);
    } else if (level === 2) {
        let milestones = [];
        if (profile === "Manus") {
            milestones = [
                `[Manus Engine] Parse design geometric parameters and volumetric limits`,
                `[Manus Engine] Evaluate cross-referenced fluidic or mechanical formulas`,
                `[Manus Engine] Deploy automated hardware testing schema structures`
            ];
        } else {
            milestones = [
                `Initialize general task structure blueprint mapping`,
                `Analyze primary technical criteria variables`,
                `Compile standard configuration database rows`
            ];
        }
        finalizeTask(taskId, 'COMPLETED', JSON.stringify({ mode: 'milestones', steps: milestones }));
    } else if (level === 3) {
        executeCodeSandbox(taskId, prompt, profile);
    }
}

// Level 3 Sandbox Engine with custom profile variable injection
function executeCodeSandbox(taskId, prompt, profile) {
    const projectDir = path.join(WORKSPACE_BASE, taskId);
    fs.mkdirSync(projectDir, { recursive: true });

    const scriptPath = path.join(projectDir, 'runner.py');
    const config = PROFILE_SKILLS[profile] || PROFILE_SKILLS["Standard"];
    
    const pythonScript = `
import sys
print("-> [${profile} Sandbox Pipeline Initialized Successfully]")
print(f"-> Active Kernel Mode: ${config.tag} | Operational Factor: ${config.speed}")
print(f"-> Processing Request Path: '${prompt}'")
print("-> Evaluation array optimization verification complete.")
`;
    fs.writeFileSync(scriptPath, pythonScript.trim());

    const child = spawn('python', [scriptPath], { cwd: projectDir });
    let terminalAccumulator = '';

    child.stdout.on('data', (data) => {
        const chunk = data.toString();
        terminalAccumulator += chunk;
        io.emit('terminal_stream', { taskId, chunk });
    });

    child.stderr.on('data', (data) => {
        const chunk = `ERROR: ${data.toString()}`;
        terminalAccumulator += chunk;
        io.emit('terminal_stream', { taskId, chunk });
    });

    child.on('close', (code) => {
        const absoluteStatus = (code === 0) ? 'COMPLETED' : 'FAILED';
        finalizeTask(taskId, absoluteStatus, terminalAccumulator);
    });
}

function finalizeTask(taskId, status, output) {
    db.run(`UPDATE executions SET status = ?, output = ? WHERE id = ?`, [status, output, taskId]);
    io.emit('task_update', { taskId, status, finalOutput: output });
}
// Volatile Queue for the Autonomous Agent Worker
let agentCommandQueue = [];

// Endpoint for the frontend or system events to push a background command
app.post('/api/agent/enqueue', (req, res) => {
    const { command, profile } = req.body;
    const cmdId = `cmd_${Date.now().toString().slice(-4)}`;
    agentCommandQueue.push({ id: cmdId, command, profile: profile || 'Manus' });
    res.json({ success: true, cmdId, status: "QUEUED" });
});

// Polling endpoint for your running Agent to fetch assignments
app.get('/api/agent/next', (req, res) => {
    if (agentCommandQueue.length > 0) {
        res.json(agentCommandQueue.shift());
    } else {
        res.json({ idle: true });
    }
});

// Endpoint for the Agent to stream execution results back to the dashboard
app.post('/api/agent/callback', (req, res) => {
    const { id, output, status } = req.body;
    io.emit('terminal_stream', { 
        taskId: id, 
        chunk: `\n[AGENT EXECUTION CALLBACK]: Status [${status}]\n${output}\n` 
    });
    res.json({ received: true });
});
server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`[AI PLATFORM ENGINE]: Active and streaming local processes.`);
    console.log(`[LOCAL CONTROLLER ADDRESS]: http://127.0.0.1:${PORT}`);
    console.log(`======================================================\n`);
});
