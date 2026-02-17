// 1. Changed "sync" to "async" (required to use "await")
async function sendCode() {
    const codeInput = document.getElementById('codeInput').value;
    const modelChoice = document.getElementById('modelSelect').value; // Get choice from dropdown
    const outputDiv = document.getElementById('codeOutput');

    // 1. Basic Validation
    if (!codeInput.trim()) {
        alert("Please paste some code first!");
        return;
    }

    // 2. Loading State (Visual Feedback)
    outputDiv.innerHTML = `
        <div class="flex items-center gap-3 animate-pulse text-blue-400">
            <svg class="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>🚀 OptiCode is using ${modelChoice.toUpperCase()} to analyze your logic...</span>
        </div>`;
    outputDiv.classList.add('opacity-70');

    try {
        // 3. API Call to FastAPI
        const response = await fetch('http://localhost:8000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                code: codeInput,
                model: modelChoice // Pass the selected model to the backend
            })
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        
        // 4. Dynamic Styling for Security Badge (Based on Hugging Face result)
        const isSecure = data.security_score.toLowerCase() === 'secure';
        const statusColor = isSecure ? 'text-emerald-400' : 'text-red-500';
        const borderColor = isSecure ? 'border-emerald-900/50' : 'border-red-900/50';

        // 5. Update the UI with HTML and Markdown
        // marked.parse() converts the AI's markdown response into beautiful HTML
        outputDiv.innerHTML = `
            <div class="mb-6 p-3 border ${borderColor} rounded-lg bg-slate-900/80 shadow-inner flex items-center justify-between">
                <div>
                    <span class="text-xs font-bold uppercase tracking-tighter text-slate-400">Local Security Scan:</span>
                    <span class="${statusColor} font-black ml-2">${data.security_score.toUpperCase()}</span>
                </div>
                <div class="text-[10px] text-slate-500 italic">Engine: ${modelChoice.toUpperCase()}</div>
            </div>
            <div class="prose prose-invert max-w-none prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700">
                ${marked.parse(data.analysis)}
            </div>
        `;
        
    } catch (error) {
        outputDiv.innerHTML = `
            <div class="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
                <p class="font-bold">❌ Error: Could not connect to the engine.</p>
                <p class="text-sm">Make sure your FastAPI server is running on <code class="bg-red-900/40 px-1">localhost:8000</code></p>
            </div>`;
        console.error("Connection Error:", error);
    } finally {
        outputDiv.classList.remove('opacity-70');
    }
}