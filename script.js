/**
 * MANARA_LOST_ARCHIVE - Script di Sistema V.3.1
 * Fix: Stop Mobile Zoom, Rimozione Highlight Blu, Ripristino Scanner Line.
 */

// 0. INIEZIONE STILE AVANZATO (CRT & UI)
const style = document.createElement('style');
style.innerHTML = `
    :root {
        --cursor-color: #00FF41;
        --matrix-green: #00FF41;
        --dark-bg: #020202;
        --crt-curve: radial-gradient(circle, rgba(18,16,16,0) 0%, rgba(0,0,0,0.15) 80%, rgba(0,0,0,0.3) 100%);
    }

    /* Reset per eliminare il colore blu al tocco su mobile */
    * {
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    body {
        background-color: #050505;
        overflow: hidden;
        height: 100vh;
        width: 100vw;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        user-select: none; /* Impedisce la selezione blu del testo */
    }

    #crt-container {
        position: relative;
        width: 100%;
        height: 100%;
        background: var(--dark-bg);
        overflow: hidden;
        border-radius: 0;
        box-shadow: inset 0 0 100px rgba(0,0,0,0.5);
    }

    /* Scanlines - pointer-events: none permette di cliccare attraverso */
    #crt-container::before {
        content: " ";
        display: block;
        position: absolute;
        top: 0; left: 0; bottom: 0; right: 0;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%), 
                    linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 255, 0, 0.03));
        z-index: 9998;
        background-size: 100% 3px, 3px 100%;
        pointer-events: none; 
        animation: scanlineMove 10s linear infinite;
    }

    /* Effetto Flicker */
    #crt-container::after {
        content: "";
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        background: var(--crt-curve);
        pointer-events: none;
        z-index: 9999;
        animation: flicker 0.15s infinite;
    }

    @keyframes scanlineMove { 0% { background-position: 0 0; } 100% { background-position: 0 100%; } }
    @keyframes flicker { 0% { opacity: 0.98; } 50% { opacity: 1; } 100% { opacity: 0.99; } }

    /* --- PDF MODAL OPTIMIZATION --- */
    #pdf-modal {
        z-index: 100001 !important; /* Sopra a tutto il sistema */
        display: none;
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.95);
    }

    .modal-content {
        position: relative;
        background: #000;
        border: 1px solid var(--matrix-green);
        margin: 2% auto;
        width: 85%;
        height: 90%;
        box-shadow: 0 0 30px rgba(0, 255, 65, 0.2);
    }

    #pdf-viewer {
        width: 100%;
        height: 100%;
        border: none;
        background: #000;
    }

    @media (max-width: 768px) {
        .modal-content {
            width: 95% !important;
            height: 85% !important;
            margin: 10% auto !important;
        }
    }

    /* Input Passcode - Font 16px per evitare lo zoom su iOS/Android */
    #pass-input {
        background: rgba(0, 20, 0, 0.6) !important;
        border: 1px solid var(--matrix-green) !important;
        color: var(--matrix-green) !important;
        width: 80%;
        text-align: center;
        margin: 20px 0;
        padding: 12px;
        font-family: monospace;
        font-size: 16px !important; 
        letter-spacing: 4px;
    }

    /* RIGA DI SCANSIONE LOGIN */
    .scanner-line {
        position: absolute;
        width: 100%;
        height: 2px;
        background: var(--matrix-green);
        box-shadow: 0 0 15px var(--matrix-green);
        z-index: 100;
        top: 0;
        left: 0;
        animation: scannerLine 2s linear infinite;
        display: none;
        pointer-events: none;
    }
    @keyframes scannerLine { 0% { top: 0; } 100% { top: 100%; } }

    .matrix-text, p, span, div { text-shadow: 0 0 2px rgba(0, 255, 65, 0.4); }
    #floating-stats {
        position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%);
        font-family: monospace; font-size: 10px; color: var(--matrix-green);
        z-index: 9997; letter-spacing: 2px; opacity: 0; transition: opacity 1s ease-in;
    }
    #main-content { display: none; width: 100%; height: 100%; }
`;
document.head.appendChild(style);

const bodyContent = document.body.innerHTML;
document.body.innerHTML = `<div id="crt-container">${bodyContent}</div>`;

// 1. MOTORE AUDIO
const SoundEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    playTone(freq, type, duration, volume) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type; 
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + duration);
    },
    beep() { this.playTone(800, 'square', 0.1, 0.05); }, 
    access() { 
        this.playTone(400, 'square', 0.1, 0.05);
        setTimeout(() => this.playTone(600, 'square', 0.1, 0.05), 100);
        setTimeout(() => this.playTone(900, 'square', 0.2, 0.05), 200);
    },
    denied() { 
        this.playTone(150, 'square', 0.2, 0.1);
        setTimeout(() => this.playTone(100, 'square', 0.3, 0.1), 150);
    },
    typeKey() { this.playTone(1200, 'sine', 0.015, 0.015); },
    click() { this.playTone(1000, 'sine', 0.03, 0.05); },
    hdCrawl() { }
};

// 2. MOTORE OROLOGIO
function updateClock() {
    const timeDisplay = document.getElementById('digital-clock'); 
    if (timeDisplay) {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        timeDisplay.innerText = `${h}:${m}:${s}`;
    }
}

// 3. BOOT SISTEMA
window.addEventListener('load', () => {
    const statsDiv = document.createElement('div');
    statsDiv.id = 'floating-stats';
    statsDiv.innerHTML = `CPU_LOAD: <span id="cpu-load">12%</span> | MEM_FREE: <span id="mem-free">640KB</span>`;
    document.getElementById('crt-container').appendChild(statsDiv);

    setInterval(() => {
        const cpu = document.getElementById('cpu-load');
        const mem = document.getElementById('mem-free');
        if(cpu) cpu.innerText = Math.floor(Math.random() * 20 + 5) + '%';
        if(mem) mem.innerText = Math.floor(Math.random() * 50 + 590) + 'KB';
    }, 3000);

    setInterval(updateClock, 1000);
    const fill = document.querySelector('.progress-fill');
    if(fill) fill.style.width = '100%';
    
    setTimeout(() => {
        const loader = document.getElementById('loader');
        if(loader) loader.style.display = 'none';
        document.body.classList.remove('loading');
        openArchive(new Event('init'), 'SYSTEM_ROOT', true);
    }, 2500);
});

// 4. LOGS DI SISTEMA
const logs = ["RECONSTRUCTING_FRAGMENTS...", "VOICE_ECHO_DETECTED", "SIGNAL_FROM_1992", "DECRYPTING_MEMORIES...", "ARCHIVE_LAYER_7_UNLOCKED"];
const logBox = document.getElementById('console-logs');
setInterval(() => {
    if(!logBox) return;
    const entry = document.createElement('p');
    entry.className = "log-entry";
    entry.style.cssText = "font-size: 11px; color: #00FF41; margin-bottom: 3px; font-family: monospace;";
    entry.innerText = `> ${logs[Math.floor(Math.random() * logs.length)]}`;
    logBox.prepend(entry);
    if(logBox.childNodes.length > 11) logBox.lastChild.remove();
}, 1500);

// 5. ISPETTORE ANTEPRIMA
function inspect(id, name, type, imagePath) {
    const inspectId = document.getElementById('inspect-id');
    const inspectName = document.getElementById('inspect-name');
    const inspectType = document.getElementById('inspect-type'); // <--- AGGIUNTO
    const placeholder = document.querySelector('.preview-img-placeholder');

    if(inspectId) inspectId.innerText = id;
    if(inspectName) inspectName.innerText = name;
    
    // Gestione della riga sotto il titolo
    if(inspectType) {
        // Se il file è quello della storia, forza la scritta CORRUPTED_FILE_20
        if (name === "WHO_GAMED_THE_GAME?") {
            inspectType.innerText = "CORRUPTED_FILE_20";
        } else {
            inspectType.innerText = type;
        }
    }

    if(placeholder) {
        if(imagePath) {
            placeholder.style.backgroundImage = `url('${imagePath}')`;
            placeholder.style.backgroundSize = 'cover';
            if(inspectId) inspectId.style.display = 'none';
        } else {
            placeholder.style.backgroundImage = 'none';
            if(inspectId) inspectId.style.display = 'block';
        }
    }
}

// 6. AUTENTICAZIONE E PDF
const SYSTEM_PASSWORD = "(312)-555-0690";
let currentPendingFile = "";
let isSystemUnlocked = false;

function openArchive(event, fileName, isInitial = false) {
    if(event) event.preventDefault();
    currentPendingFile = fileName;
    SoundEngine.init();

    if (isSystemUnlocked && fileName !== 'SYSTEM_ROOT') {
        launchPDF(fileName);
        return; 
    }

    let authModal = document.getElementById('auth-modal');
    if (!authModal) {
        authModal = document.createElement('div');
        authModal.id = 'auth-modal';
        authModal.className = 'system-modal';
        authModal.innerHTML = `
            <div id="auth-container" class="modal-content auth-box" style="border: 1px solid var(--matrix-green); background: var(--dark-bg); padding: 0; min-width: 320px; position: relative; overflow: hidden;">
                <div class="scanner-line" id="scanner-line"></div>
                <div class="panel-header" style="background: var(--matrix-green); color: var(--dark-bg); padding: 8px; font-weight: bold;">SECURITY_CHECK_REQUIRED</div>
                <div style="padding: 30px; text-align: center;">
                    <p id="auth-status" style="font-size: 0.7rem; color: var(--matrix-green); letter-spacing: 2px;">INSERT_ACCESS_CODE</p>
                    <input type="password" id="pass-input" placeholder="********" autocomplete="off">
                    <br>
                    <button onclick="checkAuth()" style="background: var(--matrix-green); padding: 10px 25px; border: none; font-family: monospace; font-weight: bold; cursor: pointer; color: #000;">VERIFY</button>
                </div>
            </div>
        `;
        document.getElementById('crt-container').appendChild(authModal);
        document.getElementById('pass-input').addEventListener('keypress', (e) => { 
            if (e.key === 'Enter') checkAuth(); 
            else SoundEngine.typeKey();
        });
    }
    authModal.style.display = 'flex';
}

function checkAuth() {
    const input = document.getElementById('pass-input');
    const status = document.getElementById('auth-status');
    const scanner = document.getElementById('scanner-line');
    
    if(scanner) scanner.style.display = 'block';
    status.innerText = "SCANNING_CREDENTIALS...";

    setTimeout(() => {
        if (input.value === SYSTEM_PASSWORD) {
            if(scanner) scanner.style.display = 'none';
            status.innerText = "ACCESS_GRANTED";
            SoundEngine.access();
            
            setTimeout(() => {
                document.getElementById('auth-modal').style.display = 'none';
                if (!isSystemUnlocked) {
                    isSystemUnlocked = true;
                    document.getElementById('main-content').style.display = 'block';
                    document.getElementById('floating-stats').style.opacity = '0.8';
                }
                if (currentPendingFile !== 'SYSTEM_ROOT') launchPDF(currentPendingFile);
            }, 800);
        } else {
            if(scanner) scanner.style.display = 'none';
            status.innerText = "INVALID_CODE_ACCESS_DENIED";
            status.style.color = "#ff0000";
            SoundEngine.denied();
            input.value = "";
            setTimeout(() => { status.style.color = "var(--matrix-green)"; status.innerText = "INSERT_ACCESS_CODE"; }, 2000);
        }
    }, 1500);
}

function launchPDF(fileName) {
    if(!isSystemUnlocked) return;
    const modal = document.getElementById('pdf-modal');
    const iframe = document.getElementById('pdf-viewer');
    
    if(modal && iframe) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        let url = fileName;

        if (isMobile && !isLocal) {
            const loc = window.location.href;
            const path = loc.substring(0, loc.lastIndexOf('/') + 1);
            const absolutePdfUrl = path + fileName;
            url = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(absolutePdfUrl)}`;
        } else {
            url = fileName + '#toolbar=0&navpanes=0&view=FitH';
        }

        iframe.src = url;
        modal.style.display = 'block';
        SoundEngine.click();
    }
}

function closeArchive() {
    const modal = document.getElementById('pdf-modal');
    const iframe = document.getElementById('pdf-viewer');
    if(modal) {
        modal.style.display = 'none';
        if(iframe) iframe.src = "";
        SoundEngine.beep();
    }
}

// CHIUSURA MODALI
window.addEventListener('keydown', (e) => { if (e.key === "Escape") closeArchive(); });
window.onclick = (e) => { 
    if (e.target.id === 'pdf-modal') closeArchive(); 
    if (e.target.id === 'auth-modal' && isSystemUnlocked) document.getElementById('auth-modal').style.display = 'none';
};

// 1. Salviamo il testo della storia in una costante (una scatola che non cambia)
const STORIA_01 = `--- ARCHIVE_DECRYPTED ---

WHO GAMED THE GAME?

They were just four friends on a lazy Sunday afternoon. 
Wandering aimlessly through alleyways and dusty corners of the city, 
they stumbled upon a thrift store none of them remembered ever seeing before...
They were just four friends on a lazy Sunday afternoon.
Wandering aimlessly through alleyways and dusty corners of
the city, they stumbled upon a thrift store none of them
remembered ever seeing before.
The sign above the door had no name, only a symbol, an empty
square.
Inside, behind shelves of warped VHS tapes and cracked picture
frames, they found it.
A strange game console, unlike anything they'd ever seen.
Faded plastic, no brand, no markings, just a single cartridge
already inserted.
The shopkeeper, a gaunt, silent man, seemed reluctant to let it
go.
“It doesn’t work”
he mumbled.
But they insisted, and with a glance that almost seemed like a
warning, he finally gave in.
Back at home, they plugged it into an old television.
No startup screen, no menu.
Just a name appeared in silence:
ÆNCRYON.
Then the world opened up.
It was a role-playing game, or so it seemed.
Each of them had to choose an avatar and construct a world
from scratch.
The objective, according to the game's cryptic system prompts,
was simple:
"Find yourself"
But it quickly became clear that the game’s true purpose was to
prevent exactly that.
Each world was filled with misdirections, identity loops, and
characters that seemed to know more than they should, even
speaking directly to the players through their avatars.
The deeper they went, the less they remembered what was real.And the worlds weren't separate.
They began to intersect in strange ways, tunnels from one
dimension opening into the next.
One player discovered they could infiltrate another's reality.
With the right series of tasks, they could even steal the
identity of another avatar, absorbing it into their own world.
The game rewarded this behavior.
Encouraged it.
The four friends became competitors.
Then threats.
Then strangers.
ÆNCRYON’s true structure slowly emerged: only one player
could win, the one who successfully absorbed all four avatars
into a single, stable universe.
A “composite world,” the game called it.
After the last integration, when one player stood alone in
their now totalized world, the screen began to flicker, as if
responding to something.
A map appeared.
It showed thousands of other coordinates, other players, other
consoles, other realities.
The screen zoomed out again.
What they thought was a game was a system.
What they thought was virtual was real.
ÆNCRYON wasn't creating worlds.
It was revealing them.
Each world the players had built was real separate universes,
once isolated, now connected by this artifact.
And the avatars... weren’t just characters.
They were consciousnesses from those realities, pulled into
the game.
Swapped.
Shifted.Repurposed.
The act of playing had caused a rupture, an entanglement
across realities.
Who gamed the game?
No one ever asked that question.
But somewhere, in some unknowable space, someone (or
something) was watching.
And perhaps, one day, they would come to reclaim what was
taken.
[END]
(game over... insert coin)

`;

// 2. Funzione per APRIRE la storia
function openStory() {
    const modal = document.getElementById('text-modal');
    const body = document.getElementById('story-body');
    
    if (modal && body) {
        // Inseriamo il testo nella scatola HTML
        body.innerText = STORIA_01; 
        
        // Mostriamo il modal
        modal.style.display = 'block';
        
        // Effetto sonoro (se il tuo SoundEngine è attivo)
        if (typeof SoundEngine !== 'undefined') SoundEngine.click();
        
        // Reset dello scroll: ogni volta che apri, riparte dall'alto
        document.getElementById('story-container').scrollTop = 0;
    }
}

// 3. Funzione per CHIUDERE la storia
function closeTextArchive() {
    const modal = document.getElementById('text-modal');
    if (modal) {
        modal.style.display = 'none';
        if (typeof SoundEngine !== 'undefined') SoundEngine.beep();
    }
}
window.addEventListener('keydown', (e) => { 
    if (e.key === "Escape") {
        closeArchive();     // Chiude il vecchio PDF (se esiste ancora)
        closeTextArchive(); // Chiude il nuovo lettore testi
    }
});