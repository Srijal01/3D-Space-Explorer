// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Color themes
const themes = {
    cyber: { p: '#00d4ff', s: '#ff00ff' },
    fire: { p: '#ff4500', s: '#ffa500' },
    ocean: { p: '#00ced1', s: '#1e90ff' },
    forest: { p: '#32cd32', s: '#9acd32' },
    sunset: { p: '#ff8c00', s: '#9370db' },
    rainbow: { p: 'rainbow', s: 'rainbow' },
    mono: { p: '#ffffff', s: '#aaaaaa' }
};

// Settings
const settings = {
    count: 100,
    size: 3,
    speed: 100,
    distance: 150,
    mouse: 50,
    gravity: 0,
    wind: 0,
    turbulence: 0,
    collision: false,
    bounce: true,
    theme: 'cyber',
    trail: 10,
    glow: 10,
    lineWidth: 1,
    connections: true,
    shape: 'circle'
};

// Mouse
const mouse = { x: null, y: null };
canvas.addEventListener('mousemove', e => { mouse.x = e.x; mouse.y = e.y; });
canvas.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

// Particle class
class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = Math.random() * (settings.size - 1) + 1;
        this.hue = Math.random() * 360;
    }

    update() {
        const speed = settings.speed / 100;
        
        // Mouse
        if (mouse.x && mouse.y) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
                const force = (200 - dist) / 200;
                const angle = Math.atan2(dy, dx);
                this.vx += Math.cos(angle) * force * (settings.mouse / 100);
                this.vy += Math.sin(angle) * force * (settings.mouse / 100);
            }
        }

        // Physics
        this.vy += settings.gravity * 0.1;
        this.vx += settings.wind * 0.05;
        
        if (settings.turbulence > 0) {
            this.vx += (Math.random() - 0.5) * settings.turbulence * 0.1;
            this.vy += (Math.random() - 0.5) * settings.turbulence * 0.1;
        }

        this.vx *= 0.99;
        this.vy *= 0.99;

        this.x += this.vx * speed;
        this.y += this.vy * speed;

        // Boundaries
        if (settings.bounce) {
            if (this.x < 0 || this.x > canvas.width) {
                this.vx *= -1;
                this.x = Math.max(0, Math.min(canvas.width, this.x));
            }
            if (this.y < 0 || this.y > canvas.height) {
                this.vy *= -1;
                this.y = Math.max(0, Math.min(canvas.height, this.y));
            }
        } else {
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }

        this.hue += 0.5;
        if (this.hue > 360) this.hue = 0;
    }

    draw() {
        const theme = themes[settings.theme];
        let color = theme.p;
        
        if (settings.theme === 'rainbow') {
            color = `hsl(${this.hue}, 100%, 50%)`;
        }

        ctx.shadowBlur = settings.glow;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();

        switch (settings.shape) {
            case 'circle':
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                break;
            case 'square':
                ctx.rect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
                break;
            case 'triangle':
                ctx.moveTo(this.x, this.y - this.size);
                ctx.lineTo(this.x + this.size, this.y + this.size);
                ctx.lineTo(this.x - this.size, this.y + this.size);
                break;
            case 'star':
                this.drawStar(this.x, this.y, 5, this.size, this.size / 2);
                break;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
    }

    drawStar(cx, cy, spikes, outer, inner) {
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        ctx.moveTo(cx, cy - outer);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
            rot += step;
        }
        ctx.lineTo(cx, cy - outer);
    }
}

// Particles
let particles = [];
function initParticles() {
    particles = [];
    for (let i = 0; i < settings.count; i++) {
        particles.push(new Particle());
    }
}
initParticles();

// Draw connections
function drawConnections() {
    if (!settings.connections) return;
    
    const theme = themes[settings.theme];
    
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < settings.distance) {
                const opacity = (1 - dist / settings.distance) * 0.5;
                let color = theme.p;
                
                if (settings.theme === 'rainbow') {
                    const hue = (particles[i].hue + particles[j].hue) / 2;
                    color = `hsla(${hue}, 100%, 50%, ${opacity})`;
                } else {
                    const hex = color;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                }

                ctx.strokeStyle = color;
                ctx.lineWidth = settings.lineWidth;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    // Mouse connections
    if (mouse.x && mouse.y) {
        particles.forEach(p => {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < settings.distance) {
                const opacity = (1 - dist / settings.distance) * 0.8;
                let color = theme.s;
                
                if (settings.theme === 'rainbow') {
                    color = `hsla(${p.hue}, 100%, 50%, ${opacity})`;
                } else {
                    const hex = color;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                }

                ctx.strokeStyle = color;
                ctx.lineWidth = settings.lineWidth * 1.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        });
    }
}

// FPS
let fps = 0, frames = 0, lastTime = performance.now();
function updateFPS() {
    frames++;
    const now = performance.now();
    if (now >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (now - lastTime));
        frames = 0;
        lastTime = now;
        document.getElementById('fps').textContent = `${fps} FPS`;
    }
}

// Animation
let paused = false;
function animate() {
    if (!paused) {
        const alpha = settings.trail / 100;
        ctx.fillStyle = `rgba(10, 10, 10, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => p.update());
        drawConnections();
        particles.forEach(p => p.draw());
        updateFPS();
    }
    requestAnimationFrame(animate);
}
animate();

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
});

// Controls
document.getElementById('particleCount').addEventListener('input', e => {
    settings.count = parseInt(e.target.value);
    document.getElementById('countVal').textContent = settings.count;
    initParticles();
});

document.getElementById('particleSize').addEventListener('input', e => {
    settings.size = parseFloat(e.target.value);
    document.getElementById('sizeVal').textContent = settings.size;
});

document.getElementById('particleSpeed').addEventListener('input', e => {
    settings.speed = parseInt(e.target.value);
    document.getElementById('speedVal').textContent = settings.speed;
});

document.getElementById('connectionDistance').addEventListener('input', e => {
    settings.distance = parseInt(e.target.value);
    document.getElementById('distanceVal').textContent = settings.distance;
});

document.getElementById('particleShape').addEventListener('change', e => {
    settings.shape = e.target.value;
});

document.getElementById('mouseAttraction').addEventListener('input', e => {
    settings.mouse = parseInt(e.target.value);
    const text = settings.mouse > 0 ? `Attract (${settings.mouse})` : 
                 settings.mouse < 0 ? `Repel (${Math.abs(settings.mouse)})` : 'None';
    document.getElementById('mouseVal').textContent = text;
});

document.getElementById('gravity').addEventListener('input', e => {
    settings.gravity = parseFloat(e.target.value);
    document.getElementById('gravityVal').textContent = settings.gravity;
});

document.getElementById('wind').addEventListener('input', e => {
    settings.wind = parseFloat(e.target.value);
    document.getElementById('windVal').textContent = settings.wind;
});

document.getElementById('turbulence').addEventListener('input', e => {
    settings.turbulence = parseFloat(e.target.value);
    document.getElementById('turbulenceVal').textContent = settings.turbulence;
});

document.getElementById('collision').addEventListener('change', e => {
    settings.collision = e.target.checked;
});

document.getElementById('wallBounce').addEventListener('change', e => {
    settings.bounce = e.target.checked;
});

document.getElementById('colorTheme').addEventListener('change', e => {
    settings.theme = e.target.value;
});

document.getElementById('trailEffect').addEventListener('input', e => {
    settings.trail = parseInt(e.target.value);
    document.getElementById('trailVal').textContent = settings.trail;
});

document.getElementById('glowIntensity').addEventListener('input', e => {
    settings.glow = parseInt(e.target.value);
    document.getElementById('glowVal').textContent = settings.glow;
});

document.getElementById('lineWidth').addEventListener('input', e => {
    settings.lineWidth = parseFloat(e.target.value);
    document.getElementById('lineVal').textContent = settings.lineWidth;
});

document.getElementById('showConnections').addEventListener('change', e => {
    settings.connections = e.target.checked;
});

document.getElementById('showFPS').addEventListener('change', e => {
    document.getElementById('fps').classList.toggle('hidden', !e.target.checked);
});

// Presets
const presets = {
    galaxy: { count: 300, size: 2, distance: 100, mouse: 30, trail: 30, glow: 15, turbulence: 0.5 },
    fireflies: { count: 50, size: 4, distance: 0, mouse: -30, gravity: -0.2, wind: 0.5, turbulence: 2, trail: 50, glow: 20, theme: 'sunset' },
    matrix: { count: 200, size: 2, distance: 80, mouse: 0, gravity: 1, trail: 20, glow: 10, theme: 'forest' },
    storm: { count: 400, size: 1.5, distance: 120, mouse: 80, gravity: 0.3, wind: 1.5, turbulence: 3, trail: 15, theme: 'ocean' },
    fireworks: { count: 150, size: 3, distance: 200, mouse: -50, gravity: 0.5, turbulence: 1, trail: 40, glow: 20, theme: 'rainbow' },
    constellation: { count: 100, size: 2, distance: 250, mouse: 0, gravity: 0, trail: 5, glow: 8, theme: 'mono' }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const preset = presets[btn.dataset.preset];
        Object.assign(settings, preset);
        
        // Update all controls
        document.getElementById('particleCount').value = settings.count;
        document.getElementById('countVal').textContent = settings.count;
        document.getElementById('particleSize').value = settings.size;
        document.getElementById('sizeVal').textContent = settings.size;
        document.getElementById('connectionDistance').value = settings.distance;
        document.getElementById('distanceVal').textContent = settings.distance;
        document.getElementById('mouseAttraction').value = settings.mouse;
        document.getElementById('mouseVal').textContent = settings.mouse > 0 ? `Attract (${settings.mouse})` : `Repel (${Math.abs(settings.mouse)})`;
        document.getElementById('gravity').value = settings.gravity || 0;
        document.getElementById('gravityVal').textContent = settings.gravity || 0;
        document.getElementById('wind').value = settings.wind || 0;
        document.getElementById('windVal').textContent = settings.wind || 0;
        document.getElementById('turbulence').value = settings.turbulence || 0;
        document.getElementById('turbulenceVal').textContent = settings.turbulence || 0;
        document.getElementById('colorTheme').value = settings.theme;
        document.getElementById('trailEffect').value = settings.trail;
        document.getElementById('trailVal').textContent = settings.trail;
        document.getElementById('glowIntensity').value = settings.glow;
        document.getElementById('glowVal').textContent = settings.glow;
        
        initParticles();
    });
});

// Actions
document.getElementById('resetBtn').addEventListener('click', initParticles);

document.getElementById('pauseBtn').addEventListener('click', e => {
    paused = !paused;
    e.target.textContent = paused ? '▶️ Resume' : '⏸️ Pause';
});

document.getElementById('clearBtn').addEventListener('click', () => {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

document.getElementById('toggleControls').addEventListener('click', () => {
    const panel = document.getElementById('controlPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.key === ' ') {
        e.preventDefault();
        document.getElementById('pauseBtn').click();
    } else if (e.key.toLowerCase() === 'r') {
        initParticles();
    } else if (e.key.toLowerCase() === 'c') {
        document.getElementById('clearBtn').click();
    } else if (e.key.toLowerCase() === 'f') {
        document.getElementById('fullscreenBtn').click();
    }
});
