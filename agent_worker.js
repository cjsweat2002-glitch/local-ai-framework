require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const simpleGit = require('simple-git');
const fetch = require('node-fetch');

const SERVER_URL = 'http://127.0.0.1:5000';
const POLL_INTERVAL = 3000; 
const PROJECT_DIR = __dirname; // Using __dirname for portability

const git = simpleGit(PROJECT_DIR);

// Manus API Configuration
const MANUS_API_KEY = process.env.MANUS_API_KEY;
const MANUS_API_BASE_URL = 'https://api.manus.ai/v2'; // Pointing to Manus API v2

// Determine if we should use Manus or local Ollama
const useManus = !!MANUS_API_KEY;

const openai = new OpenAI({
    baseURL: useManus ? MANUS_API_BASE_URL : 'http://127.0.0.1:11434/v1',
    apiKey: useManus ? MANUS_API_KEY : 'local-machine-token' 
});

console.log(`-> [Autonomous Git UI Agent Worker] Status: Active.`);
console.log(`-> Mode: ${useManus ? 'Manus API' : 'Local Ollama'}`);
console.log("-> Awaiting orchestration intents...");

async function agentLoop() {
    while (true) {
        try {
            const response = await fetch(`${SERVER_URL}/api/agent/next`);
            const task = await response.json();

            if (task && !task.idle) {
                console.log(`\n[Autonomy Triggered] Processing UI Modification Intent: "${task.command}"`);
                
                const systemPrompt = `You are an autonomous UI engineer with access to Git.
Your objective is to safely modify or update the project's UI files based on user requests.
Available file paths:
- ${path.join(PROJECT_DIR, 'public', 'index.html')} (Dashboard Interface)
- ${path.join(PROJECT_DIR, 'index.js')} (Backend Server Layer)

You must respond ONLY with a valid JSON object matching this schema. Do not wrap it in markdown code blocks:
{
    "reasoning": "Brief technical explanation of your plan to update the UI section.",
    "target_file": "${path.join(PROJECT_DIR, 'public', 'index.html')}",
    "file_content": "The complete updated code content of the target file.",
    "git_action": "branch-and-commit",
    "commit_message": "feat: update UI layout section"
}`;

                const completion = await openai.chat.completions.create({
                    model: useManus ? 'gpt-4o' : 'llama3', 
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Task Request: ${task.command}` }
                    ],
                    temperature: 0.2
                });

                // Clear out raw text buffers to extract pure JSON metadata safely
                let rawContent = completion.choices[0].message.content.trim();
                if (rawContent.startsWith("```json")) {
                    rawContent = rawContent.substring(7, rawContent.length - 3).trim();
                } else if (rawContent.startsWith("```")) {
                    rawContent = rawContent.substring(3, rawContent.length - 3).trim();
                }

                try {
                    const action = JSON.parse(rawContent);
                    let executionLog = `[Reasoning]: ${action.reasoning}\n`;

                    if (action.target_file && action.file_content) {
                        const branchName = `ui-patch-${Date.now().toString().slice(-4)}`;
                        
                        // Execute isolated Git workflow
                        await git.checkoutLocalBranch(branchName);
                        fs.writeFileSync(action.target_file, action.file_content, 'utf8');
                        
                        await git.add(action.target_file);
                        await git.commit(action.commit_message || 'feat: automated UI layout adjustment');
                        
                        executionLog += `[Git Branch Created & Committed]: Switched to isolated branch ${branchName} and saved code update safely.\n`;
                        
                        // Switch back to master safely to protect mainline work
                        await git.checkout('master');
                    }

                    await fetch(`${SERVER_URL}/api/agent/callback`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: task.id, output: executionLog, status: 'COMPLETED' })
                    });

                } catch (parseError) {
                    await fetch(`${SERVER_URL}/api/agent/callback`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            id: task.id, 
                            output: `JSON Parsing Failed. Clean output structure was compromised.\nRaw Content:\n${rawContent}`, 
                            status: 'FAILED' 
                        })
                    });
                }
            }
        } catch (err) {
            // Server rest error protection catch block
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

agentLoop();
