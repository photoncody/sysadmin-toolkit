// --- Navigation Logic ---
document.querySelectorAll('#nav-links button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Reset Nav
        document.querySelectorAll('#nav-links button').forEach(b => {
            b.classList.remove('bg-blue-600', 'text-white');
            b.classList.add('hover:bg-gray-700');
        });
        e.target.classList.add('bg-blue-600', 'text-white');
        e.target.classList.remove('hover:bg-gray-700');

        // Switch Tab
        const target = e.target.getAttribute('data-target');
        document.querySelectorAll('.tool-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        
        // Auto-focus the input field when switching tabs
        const activeSection = document.getElementById(target);
        const firstInput = activeSection.querySelector('input, textarea');
        if (firstInput) firstInput.focus();
    });
});

// --- Clipboard Logic ---
function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('opacity-0');
    setTimeout(() => toast.classList.add('opacity-0'), 2000);
}

document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('data-copy-target');
        const textToCopy = document.getElementById(targetId).innerText;
        if(textToCopy && textToCopy !== "Awaiting input...") {
            navigator.clipboard.writeText(textToCopy).then(showToast);
        }
    });
});

// --- Global Enter Key & Reset Logic (Easily Expandable) ---

// 1. Enter Key for Inputs (Standard Enter)
document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const section = this.closest('section');
            const primaryBtn = section.querySelector('.primary-action');
            if (primaryBtn) primaryBtn.click();
        }
    });
});

// 2. Enter Key for Textareas (Ctrl+Enter or Cmd+Enter)
document.querySelectorAll('textarea').forEach(textarea => {
    textarea.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const section = this.closest('section');
            const primaryBtn = section.querySelector('.primary-action');
            if (primaryBtn) primaryBtn.click();
        }
    });
});

// 3. Generic Reset Logic
document.querySelectorAll('.btn-reset').forEach(btn => {
    btn.addEventListener('click', function() {
        const section = this.closest('section');
        
        // Clear all inputs and textareas in this section
        section.querySelectorAll('input, textarea').forEach(el => el.value = '');
        
        // Reset all `<pre>` text outputs
        section.querySelectorAll('pre').forEach(el => el.innerText = 'Awaiting input...');
        
        // Specific reset for QR Code output container
        const qrOutput = section.querySelector('#qr-output');
        const qrPlaceholder = section.querySelector('.placeholder-text');
        if (qrOutput) {
            qrOutput.innerHTML = '';
            qrOutput.classList.add('hidden');
        }
        if (qrPlaceholder) {
            qrPlaceholder.classList.remove('hidden');
        }
        
        // Re-focus the input
        const firstInput = section.querySelector('input, textarea');
        if (firstInput) firstInput.focus();
    });
});

// --- 1. Subnet Calculator ---
function ipToInt(ip) {
    return ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;
}
function intToIp(int) {
    return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
}
function maskToCidr(mask) {
    return ipToInt(mask).toString(2).split('1').length - 1;
}

document.getElementById('calc-subnet').addEventListener('click', () => {
    try {
        let input = document.getElementById('subnet-input').value.trim();
        if(!input) return; // Do nothing if empty
        let [ipPart, netPart] = input.split('/');
        if(!ipPart || !netPart) throw new Error("Format must be IP/CIDR or IP/Mask");

        let cidr;
        if (netPart.includes('.')) cidr = maskToCidr(netPart);
        else cidr = parseInt(netPart, 10);

        const ipInt = ipToInt(ipPart);
        const maskInt = ~((1 << (32 - cidr)) - 1) >>> 0;
        const netInt = (ipInt & maskInt) >>> 0;
        const bcastInt = (netInt | ~maskInt) >>> 0;

        const network = intToIp(netInt);
        const broadcast = intToIp(bcastInt);
        const mask = intToIp(maskInt);
        const gateway = cidr < 31 ? intToIp(netInt + 1) : "N/A";
        const dns = cidr < 31 ? intToIp(netInt + 2) : "N/A";
        const usableRange = cidr < 31 ? `${intToIp(netInt + 1)} - ${intToIp(bcastInt - 1)}` : "None";

        const output = `IP Address:         ${ipPart}
Subnet Mask:        ${mask}
Gateway:            ${gateway}
DNS:                ${dns}
Network Address:    ${network}
Broadcast Address:  ${broadcast}
Usable IP Range:    ${usableRange}`;

        document.getElementById('subnet-output').innerText = output;
    } catch (e) {
        document.getElementById('subnet-output').innerText = "Error: Invalid format. Use 192.168.0.10/24 or 192.168.0.10/255.255.255.0";
    }
});

// --- 2. MAC Normalizer ---
document.getElementById('norm-mac').addEventListener('click', () => {
    let raw = document.getElementById('mac-input').value;
    if(!raw) return;
    let clean = raw.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (clean.length === 12) {
        let normalized = clean.match(/.{1,2}/g).join(':');
        document.getElementById('mac-output').innerText = normalized;
    } else {
        document.getElementById('mac-output').innerText = "Error: Invalid MAC length.";
    }
});

// --- 3. Docker Run to Compose ---
function parseDockerRun(cmd) {
    const matchArgs = /--?[a-zA-Z0-9-]+\s+("[^"]*"|'[^']*'|\S+)|--?[a-zA-Z0-9-]+|\S+/g;
    const tokens = cmd.match(matchArgs);
    if (!tokens || tokens[0] !== 'docker' || tokens[1] !== 'run') return "Invalid docker run command";

    let serviceName = "app";
    let composeObj = { version: '3.8', services: {} };
    let service = {};

    let i = 2;
    while (i < tokens.length) {
        const token = tokens[i];
        if (token === '-d' || token === '--detach') { i++; continue; }
        if (token.startsWith('--name')) {
            serviceName = tokens[i+1].replace(/['"]/g, '');
            i+=2; continue;
        }
        if (token === '-p' || token === '--publish') {
            service.ports = service.ports || [];
            service.ports.push(tokens[i+1].replace(/['"]/g, ''));
            i+=2; continue;
        }
        if (token === '-v' || token === '--volume') {
            service.volumes = service.volumes || [];
            service.volumes.push(tokens[i+1].replace(/['"]/g, ''));
            i+=2; continue;
        }
        if (token === '-e' || token === '--env') {
            service.environment = service.environment || [];
            service.environment.push(tokens[i+1].replace(/['"]/g, ''));
            i+=2; continue;
        }
        if (!token.startsWith('-')) {
            service.image = token;
            break; 
        }
        i++;
    }
    
    composeObj.services[serviceName] = service;
    return jsyaml.dump(composeObj);
}

document.getElementById('btn-run2compose').addEventListener('click', () => {
    let input = document.getElementById('dr-input').value.trim();
    if(!input) return;
    try {
        let yaml = parseDockerRun(input);
        document.getElementById('compose-output').innerText = yaml;
    } catch(e) { document.getElementById('compose-output').innerText = "Parse Error"; }
});

// --- 4. Compose to Docker Run ---
document.getElementById('btn-compose2run').addEventListener('click', () => {
    let input = document.getElementById('dc-input').value.trim();
    if(!input) return;
    try {
        const doc = jsyaml.load(input);
        if (!doc.services) throw new Error("No services found");
        
        let outCmds = [];
        for (const [name, config] of Object.entries(doc.services)) {
            let cmd = `docker run -d --name ${name}`;
            if (config.ports) config.ports.forEach(p => cmd += ` -p ${p}`);
            if (config.volumes) config.volumes.forEach(v => cmd += ` -v ${v}`);
            if (config.environment) {
                if(Array.isArray(config.environment)) {
                    config.environment.forEach(e => cmd += ` -e "${e}"`);
                } else {
                    for(const [k,v] of Object.entries(config.environment)) cmd += ` -e "${k}=${v}"`;
                }
            }
            if (config.image) cmd += ` ${config.image}`;
            outCmds.push(cmd);
        }
        document.getElementById('run-output').innerText = outCmds.join('\n\n');
    } catch(e) { document.getElementById('run-output').innerText = "Invalid YAML"; }
});

// --- 5. QR Code Generator ---
let qrCode = null;
document.getElementById('btn-qr').addEventListener('click', () => {
    let input = document.getElementById('qr-input').value.trim();
    let container = document.getElementById('qr-output');
    let placeholder = document.querySelector('#qr .placeholder-text');
    
    if(!input) return;

    container.innerHTML = ""; 
    container.classList.remove('hidden');
    placeholder.classList.add('hidden');

    qrCode = new QRCode(container, { text: input, width: 200, height: 200 });
    
    setTimeout(() => {
        const canvas = container.querySelector('canvas');
        if(canvas) {
            const btn = document.createElement('button');
            btn.innerText = "📋 Copy Image";
            btn.className = "mt-4 w-full bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm";
            btn.onclick = () => {
                canvas.toBlob(blob => navigator.clipboard.write([new ClipboardItem({'image/png': blob})]).then(showToast));
            };
            container.appendChild(btn);
        }
    }, 100);
});

// --- 6. Base64 ---
document.getElementById('btn-b64-enc').addEventListener('click', () => {
    let input = document.getElementById('b64-input').value;
    if(!input) return;
    document.getElementById('b64-output').innerText = btoa(unescape(encodeURIComponent(input)));
});
document.getElementById('btn-b64-dec').addEventListener('click', () => {
    let input = document.getElementById('b64-input').value;
    if(!input) return;
    try { document.getElementById('b64-output').innerText = decodeURIComponent(escape(atob(input))); }
    catch(e) { document.getElementById('b64-output').innerText = "Invalid Base64 string."; }
});