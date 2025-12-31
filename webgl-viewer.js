// Get canvas and WebGL context
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

if (!gl) {
    alert('WebGL not supported in this browser!');
}

// Canvas resize
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Settings
const settings = {
    shape: 'cube',
    rotationSpeed: 1.0,
    zoom: 5.0,
    colorScheme: 'gradient',
    wireframe: false,
    autoRotate: true,
    lighting: true,
    rimLight: true,
    trailEffect: false,
    starCount: 200,
    cameraMode: 'orbit'
};

// Multiple objects
const objects = [];
let positionBuffer, normalBuffer, colorBuffer, indexBuffer;
let currentGeometry = null;

// Shader sources
const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec3 aColor;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
        vColor = aColor;
        vNormal = mat3(uNormalMatrix) * aNormal;
        vPosition = (uModelViewMatrix * vec4(aPosition, 1.0)).xyz;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    
    varying vec3 vColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    uniform bool uLighting;
    uniform bool uWireframe;
    uniform bool uRimLight;
    uniform vec3 uCameraPos;
    
    void main() {
        vec3 color = vColor;
        
        if (uLighting) {
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            vec3 normal = normalize(vNormal);
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 ambient = vec3(0.3);
            color = color * (ambient + diff * 0.7);
            
            // Rim lighting effect
            if (uRimLight) {
                vec3 viewDir = normalize(uCameraPos - vPosition);
                float rim = 1.0 - max(dot(viewDir, normal), 0.0);
                rim = pow(rim, 3.0);
                vec3 rimColor = vec3(0.4, 0.8, 1.0);
                color += rimColor * rim * 0.8;
            }
        }
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Compile shader
function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

// Create program
const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
}

gl.useProgram(program);

// Get attribute and uniform locations
const aPosition = gl.getAttribLocation(program, 'aPosition');
const aNormal = gl.getAttribLocation(program, 'aNormal');
const aColor = gl.getAttribLocation(program, 'aColor');
const uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
const uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
const uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
const uLighting = gl.getUniformLocation(program, 'uLighting');
const uWireframe = gl.getUniformLocation(program, 'uWireframe');
const uRimLight = gl.getUniformLocation(program, 'uRimLight');
const uCameraPos = gl.getUniformLocation(program, 'uCameraPos');

// Matrix operations
const mat4 = {
    identity: () => [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    
    perspective: (fov, aspect, near, far) => {
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        return [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, 2 * far * near * nf, 0
        ];
    },
    
    translate: (mat, x, y, z) => {
        const out = [...mat];
        out[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
        out[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
        out[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
        out[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
        return out;
    },
    
    rotateX: (mat, angle) => {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const out = [...mat];
        const a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
        const a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
        out[4] = a10 * c + a20 * s;
        out[5] = a11 * c + a21 * s;
        out[6] = a12 * c + a22 * s;
        out[7] = a13 * c + a23 * s;
        out[8] = a20 * c - a10 * s;
        out[9] = a21 * c - a11 * s;
        out[10] = a22 * c - a12 * s;
        out[11] = a23 * c - a13 * s;
        return out;
    },
    
    rotateY: (mat, angle) => {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const out = [...mat];
        const a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
        const a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
        out[0] = a00 * c - a20 * s;
        out[1] = a01 * c - a21 * s;
        out[2] = a02 * c - a22 * s;
        out[3] = a03 * c - a23 * s;
        out[8] = a00 * s + a20 * c;
        out[9] = a01 * s + a21 * c;
        out[10] = a02 * s + a22 * c;
        out[11] = a03 * s + a23 * c;
        return out;
    },
    
    invert: (mat) => {
        const a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
        const a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
        const a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
        const a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
        
        const b00 = a00 * a11 - a01 * a10;
        const b01 = a00 * a12 - a02 * a10;
        const b02 = a00 * a13 - a03 * a10;
        const b03 = a01 * a12 - a02 * a11;
        const b04 = a01 * a13 - a03 * a11;
        const b05 = a02 * a13 - a03 * a12;
        const b06 = a20 * a31 - a21 * a30;
        const b07 = a20 * a32 - a22 * a30;
        const b08 = a20 * a33 - a23 * a30;
        const b09 = a21 * a32 - a22 * a31;
        const b10 = a21 * a33 - a23 * a31;
        const b11 = a22 * a33 - a23 * a32;
        
        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if (!det) return null;
        det = 1.0 / det;
        
        return [
            (a11 * b11 - a12 * b10 + a13 * b09) * det,
            (a02 * b10 - a01 * b11 - a03 * b09) * det,
            (a31 * b05 - a32 * b04 + a33 * b03) * det,
            (a22 * b04 - a21 * b05 - a23 * b03) * det,
            (a12 * b08 - a10 * b11 - a13 * b07) * det,
            (a00 * b11 - a02 * b08 + a03 * b07) * det,
            (a32 * b02 - a30 * b05 - a33 * b01) * det,
            (a20 * b05 - a22 * b02 + a23 * b01) * det,
            (a10 * b10 - a11 * b08 + a13 * b06) * det,
            (a01 * b08 - a00 * b10 - a03 * b06) * det,
            (a30 * b04 - a31 * b02 + a33 * b00) * det,
            (a21 * b02 - a20 * b04 - a23 * b00) * det,
            (a11 * b07 - a10 * b09 - a12 * b06) * det,
            (a00 * b09 - a01 * b07 + a02 * b06) * det,
            (a31 * b01 - a30 * b03 - a32 * b00) * det,
            (a20 * b03 - a21 * b01 + a22 * b00) * det
        ];
    },
    
    transpose: (mat) => [
        mat[0], mat[4], mat[8], mat[12],
        mat[1], mat[5], mat[9], mat[13],
        mat[2], mat[6], mat[10], mat[14],
        mat[3], mat[7], mat[11], mat[15]
    ]
};

// Geometry generators
const geometries = {
    cube: () => {
        const positions = [
            -1,-1,-1,  1,-1,-1,  1, 1,-1, -1, 1,-1,
            -1,-1, 1,  1,-1, 1,  1, 1, 1, -1, 1, 1,
            -1,-1,-1, -1, 1,-1, -1, 1, 1, -1,-1, 1,
             1,-1,-1,  1, 1,-1,  1, 1, 1,  1,-1, 1,
            -1, 1,-1,  1, 1,-1,  1, 1, 1, -1, 1, 1,
            -1,-1,-1,  1,-1,-1,  1,-1, 1, -1,-1, 1
        ];
        
        const normals = [
            0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1,
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
           -1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0
        ];
        
        const indices = [
            0,1,2, 0,2,3,   4,6,5, 4,7,6,   8,9,10, 8,10,11,
            12,14,13, 12,15,14,   16,17,18, 16,18,19,   20,22,21, 20,23,22
        ];
        
        return { positions, normals, indices };
    },
    
    sphere: () => {
        const positions = [], normals = [], indices = [];
        const latBands = 30, longBands = 30;
        
        for (let lat = 0; lat <= latBands; lat++) {
            const theta = lat * Math.PI / latBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let long = 0; long <= longBands; long++) {
                const phi = long * 2 * Math.PI / longBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
                
                normals.push(x, y, z);
                positions.push(x, y, z);
            }
        }
        
        for (let lat = 0; lat < latBands; lat++) {
            for (let long = 0; long < longBands; long++) {
                const first = lat * (longBands + 1) + long;
                const second = first + longBands + 1;
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
        
        return { positions, normals, indices };
    },
    
    torus: () => {
        const positions = [], normals = [], indices = [];
        const R = 1.0, r = 0.4;
        const sides = 30, segments = 30;
        
        for (let i = 0; i <= sides; i++) {
            const u = i * 2 * Math.PI / sides;
            const cu = Math.cos(u), su = Math.sin(u);
            
            for (let j = 0; j <= segments; j++) {
                const v = j * 2 * Math.PI / segments;
                const cv = Math.cos(v), sv = Math.sin(v);
                
                const x = (R + r * cv) * cu;
                const y = r * sv;
                const z = (R + r * cv) * su;
                
                const nx = cv * cu;
                const ny = sv;
                const nz = cv * su;
                
                positions.push(x, y, z);
                normals.push(nx, ny, nz);
            }
        }
        
        for (let i = 0; i < sides; i++) {
            for (let j = 0; j < segments; j++) {
                const a = i * (segments + 1) + j;
                const b = a + segments + 1;
                indices.push(a, b, a + 1);
                indices.push(b, b + 1, a + 1);
            }
        }
        
        return { positions, normals, indices };
    },
    
    pyramid: () => {
        const positions = [
            0, 1, 0,  -1,-1, 1,   1,-1, 1,
            0, 1, 0,   1,-1, 1,   1,-1,-1,
            0, 1, 0,   1,-1,-1,  -1,-1,-1,
            0, 1, 0,  -1,-1,-1,  -1,-1, 1,
           -1,-1, 1,   1,-1, 1,   1,-1,-1,  -1,-1,-1
        ];
        
        const normals = [];
        for (let i = 0; i < positions.length; i += 9) {
            const v1 = [positions[i+3] - positions[i], positions[i+4] - positions[i+1], positions[i+5] - positions[i+2]];
            const v2 = [positions[i+6] - positions[i], positions[i+7] - positions[i+1], positions[i+8] - positions[i+2]];
            const nx = v1[1] * v2[2] - v1[2] * v2[1];
            const ny = v1[2] * v2[0] - v1[0] * v2[2];
            const nz = v1[0] * v2[1] - v1[1] * v2[0];
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
            for (let j = 0; j < 3; j++) {
                normals.push(nx/len, ny/len, nz/len);
            }
        }
        
        const indices = [0,1,2, 3,4,5, 6,7,8, 9,10,11, 12,14,13, 12,15,14];
        return { positions, normals, indices };
    },
    
    cylinder: () => {
        const positions = [], normals = [], indices = [];
        const segments = 30;
        const height = 2;
        
        for (let i = 0; i <= segments; i++) {
            const angle = i * 2 * Math.PI / segments;
            const x = Math.cos(angle);
            const z = Math.sin(angle);
            
            positions.push(x, height/2, z);
            normals.push(x, 0, z);
            positions.push(x, -height/2, z);
            normals.push(x, 0, z);
        }
        
        for (let i = 0; i < segments; i++) {
            const a = i * 2;
            const b = a + 1;
            const c = a + 2;
            const d = a + 3;
            indices.push(a, b, c);
            indices.push(b, d, c);
        }
        
        return { positions, normals, indices };
    }
};

// Generate colors
function generateColors(positions, scheme) {
    const colors = [];
    const count = positions.length / 3;
    
    for (let i = 0; i < count; i++) {
        switch(scheme) {
            case 'gradient':
                colors.push(
                    0.5 + positions[i*3] * 0.5,
                    0.5 + positions[i*3+1] * 0.5,
                    0.5 + positions[i*3+2] * 0.5
                );
                break;
            case 'solid':
                colors.push(0.8, 0.4, 0.2);
                break;
            case 'rainbow':
                const hue = (i / count) * 360;
                const rgb = hslToRgb(hue / 360, 1, 0.5);
                colors.push(...rgb);
                break;
            case 'texture':
                colors.push(
                    Math.abs(Math.sin(i * 0.5)),
                    Math.abs(Math.cos(i * 0.3)),
                    Math.abs(Math.sin(i * 0.7))
                );
                break;
        }
    }
    
    return colors;
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [r, g, b];
}

// Object class
class SpaceObject {
    constructor(shape, colorScheme, position = [0, 0, 0]) {
        this.shape = shape;
        this.colorScheme = colorScheme;
        this.position = position;
        this.rotation = { x: Math.random() * Math.PI, y: Math.random() * Math.PI };
        this.rotationSpeed = { x: (Math.random() - 0.5) * 0.02, y: (Math.random() - 0.5) * 0.02 };
        this.scale = 0.5 + Math.random() * 0.5;
        this.loadGeometry();
    }
    
    loadGeometry() {
        const geom = geometries[this.shape]();
        const colors = generateColors(geom.positions, this.colorScheme);
        
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geom.positions), gl.STATIC_DRAW);
        
        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geom.normals), gl.STATIC_DRAW);
        
        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geom.indices), gl.STATIC_DRAW);
        
        this.geometry = geom;
    }
    
    update() {
        this.rotation.x += this.rotationSpeed.x;
        this.rotation.y += this.rotationSpeed.y;
    }
}

function loadGeometry() {
    const geom = geometries[settings.shape]();
    const colors = generateColors(geom.positions, settings.colorScheme);
    
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geom.positions), gl.STATIC_DRAW);
    
    normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geom.normals), gl.STATIC_DRAW);
    
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    
    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geom.indices), gl.STATIC_DRAW);
    
    currentGeometry = geom;
}

loadGeometry();

// Star field
let stars = [];

function createStars() {
    stars = [];
    for (let i = 0; i < settings.starCount; i++) {
        stars.push({
            x: (Math.random() - 0.5) * 50,
            y: (Math.random() - 0.5) * 50,
            z: (Math.random() - 0.5) * 50,
            size: Math.random() * 2 + 1,
            brightness: Math.random() * 0.5 + 0.5
        });
    }
}

createStars();

// Rotation
let rotation = { x: 0.4, y: 0.4 };
let cameraPosition = [0, 0, 5];
let time = 0;

// Mouse interaction
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mousemove', e => {
    if (isDragging) {
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        rotation.y += dx * 0.01;
        rotation.x += dy * 0.01;
        lastMouse = { x: e.clientX, y: e.clientY };
    }
});

canvas.addEventListener('mouseup', () => isDragging = false);
canvas.addEventListener('mouseleave', () => isDragging = false);

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    settings.zoom += e.deltaY * -0.01;
    settings.zoom = Math.max(2, Math.min(10, settings.zoom));
    document.getElementById('zoom').value = settings.zoom;
    document.getElementById('zoomVal').textContent = settings.zoom.toFixed(1);
});

// Render stars
function renderStars(projMatrix, viewMatrix) {
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    
    for (const star of stars) {
        let mvMatrix = [...viewMatrix];
        mvMatrix = mat4.translate(mvMatrix, star.x, star.y, star.z);
        
        gl.uniformMatrix4fv(uModelViewMatrix, false, mvMatrix);
        gl.uniform1i(uLighting, false);
        
        const brightness = star.brightness * (0.8 + Math.sin(time * 2 + star.x) * 0.2);
        
        const starSize = star.size * 0.05;
        const starVerts = [
            -starSize, -starSize, 0,
            starSize, -starSize, 0,
            starSize, starSize, 0,
            -starSize, starSize, 0
        ];
        
        const starBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starVerts), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
        
        const starColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, starColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            brightness, brightness, brightness,
            brightness, brightness, brightness,
            brightness, brightness, brightness,
            brightness, brightness, brightness
        ]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aColor);
        gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
        
        gl.deleteBuffer(starBuffer);
        gl.deleteBuffer(starColorBuffer);
    }
    
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
}

// Render object
function renderObject(obj, projMatrix, viewMatrix, isMain = false) {
    let mvMatrix = [...viewMatrix];
    
    if (!isMain) {
        mvMatrix = mat4.translate(mvMatrix, obj.position[0], obj.position[1], obj.position[2]);
    }
    
    if (isMain) {
        if (settings.autoRotate) {
            rotation.y += 0.01 * settings.rotationSpeed;
        }
        mvMatrix = mat4.rotateX(mvMatrix, rotation.x);
        mvMatrix = mat4.rotateY(mvMatrix, rotation.y);
    } else {
        mvMatrix = mat4.rotateX(mvMatrix, obj.rotation.x);
        mvMatrix = mat4.rotateY(mvMatrix, obj.rotation.y);
        
        const scale = obj.scale;
        mvMatrix[0] *= scale; mvMatrix[1] *= scale; mvMatrix[2] *= scale;
        mvMatrix[4] *= scale; mvMatrix[5] *= scale; mvMatrix[6] *= scale;
        mvMatrix[8] *= scale; mvMatrix[9] *= scale; mvMatrix[10] *= scale;
    }
    
    const normalMatrix = mat4.transpose(mat4.invert(mvMatrix));
    
    gl.uniformMatrix4fv(uModelViewMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);
    gl.uniform1i(uLighting, settings.lighting);
    gl.uniform1i(uWireframe, settings.wireframe);
    gl.uniform1i(uRimLight, settings.rimLight);
    gl.uniform3fv(uCameraPos, cameraPosition);
    
    const buffers = isMain ? 
        { pos: positionBuffer, norm: normalBuffer, col: colorBuffer, idx: indexBuffer, geom: currentGeometry } :
        { pos: obj.positionBuffer, norm: obj.normalBuffer, col: obj.colorBuffer, idx: obj.indexBuffer, geom: obj.geometry };
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.pos);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.norm);
    gl.enableVertexAttribArray(aNormal);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.col);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.idx);
    
    if (settings.wireframe) {
        for (let i = 0; i < buffers.geom.indices.length; i += 3) {
            gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, i * 2);
        }
    } else {
        gl.drawElements(gl.TRIANGLES, buffers.geom.indices.length, gl.UNSIGNED_SHORT, 0);
    }
}

// Render
function render() {
    time += 0.016;
    
    if (settings.trailEffect) {
        gl.clearColor(0.05, 0.06, 0.12, 0.9);
    } else {
        gl.clearColor(0.05, 0.06, 0.12, 1.0);
    }
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    const aspect = canvas.width / canvas.height;
    const projMatrix = mat4.perspective(Math.PI / 4, aspect, 0.1, 100.0);
    gl.uniformMatrix4fv(uProjectionMatrix, false, projMatrix);
    
    let viewMatrix = mat4.identity();
    
    switch(settings.cameraMode) {
        case 'orbit':
            cameraPosition = [0, 0, settings.zoom];
            viewMatrix = mat4.translate(viewMatrix, 0, 0, -settings.zoom);
            break;
        case 'follow':
            cameraPosition = [
                Math.sin(time * 0.5) * settings.zoom,
                Math.cos(time * 0.3) * 2,
                Math.cos(time * 0.5) * settings.zoom
            ];
            viewMatrix = mat4.translate(viewMatrix, -cameraPosition[0], -cameraPosition[1], -cameraPosition[2]);
            break;
        case 'fly':
            cameraPosition = [
                Math.sin(time * 0.3) * 3,
                Math.sin(time * 0.2) * 2,
                settings.zoom + Math.cos(time * 0.3) * 2
            ];
            viewMatrix = mat4.translate(viewMatrix, -cameraPosition[0], -cameraPosition[1], -cameraPosition[2]);
            break;
    }
    
    renderStars(projMatrix, viewMatrix);
    
    objects.forEach(obj => {
        obj.update();
        renderObject(obj, projMatrix, viewMatrix, false);
    });
    
    renderObject(null, projMatrix, viewMatrix, true);
    
    requestAnimationFrame(render);
}

render();

// Controls
document.getElementById('shapeSelect').addEventListener('change', e => {
    settings.shape = e.target.value;
    loadGeometry();
});

document.getElementById('rotationSpeed').addEventListener('input', e => {
    settings.rotationSpeed = parseFloat(e.target.value);
    document.getElementById('speedVal').textContent = settings.rotationSpeed.toFixed(1);
});

document.getElementById('zoom').addEventListener('input', e => {
    settings.zoom = parseFloat(e.target.value);
    document.getElementById('zoomVal').textContent = settings.zoom.toFixed(1);
});

document.getElementById('colorScheme').addEventListener('change', e => {
    settings.colorScheme = e.target.value;
    loadGeometry();
});

document.getElementById('wireframe').addEventListener('change', e => {
    settings.wireframe = e.target.checked;
});

document.getElementById('autoRotate').addEventListener('change', e => {
    settings.autoRotate = e.target.checked;
});

document.getElementById('lighting').addEventListener('change', e => {
    settings.lighting = e.target.checked;
});

document.getElementById('rimLight').addEventListener('change', e => {
    settings.rimLight = e.target.checked;
});

document.getElementById('trailEffect').addEventListener('change', e => {
    settings.trailEffect = e.target.checked;
});

document.getElementById('starCount').addEventListener('input', e => {
    settings.starCount = parseInt(e.target.value);
    document.getElementById('starVal').textContent = settings.starCount;
    document.getElementById('starCountDisplay').textContent = settings.starCount;
    createStars();
});

document.getElementById('cameraMode').addEventListener('change', e => {
    settings.cameraMode = e.target.value;
});

document.getElementById('spawnBtn').addEventListener('click', () => {
    const shapes = ['cube', 'sphere', 'torus', 'pyramid', 'cylinder'];
    const colors = ['gradient', 'solid', 'rainbow', 'texture'];
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomPos = [
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3
    ];
    
    const obj = new SpaceObject(randomShape, randomColor, randomPos);
    objects.push(obj);
    document.getElementById('objectCount').textContent = objects.length + 1;
});

document.getElementById('resetBtn').addEventListener('click', () => {
    rotation = { x: 0.4, y: 0.4 };
    settings.zoom = 5.0;
    settings.cameraMode = 'orbit';
    objects.length = 0;
    document.getElementById('zoom').value = 5.0;
    document.getElementById('zoomVal').textContent = '5.0';
    document.getElementById('cameraMode').value = 'orbit';
    document.getElementById('objectCount').textContent = '1';
});

// Keyboard
document.addEventListener('keydown', e => {
    if (e.key === ' ') {
        e.preventDefault();
        settings.autoRotate = !settings.autoRotate;
        document.getElementById('autoRotate').checked = settings.autoRotate;
    }
});
