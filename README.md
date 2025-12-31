# 🌌 3D Space Explorer

An interactive WebGL-powered 3D space visualization with dynamic camera modes, particle effects, and real-time object spawning. Built using pure WebGL without any external libraries.

![3D Space Explorer](https://img.shields.io/badge/WebGL-Powered-blue) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎮 Interactive 3D Rendering
- **5 3D Shapes**: Cube, Sphere, Torus, Pyramid, Cylinder
- **Real-time Rotation**: Smooth 60 FPS animation with adjustable speed
- **Mouse Controls**: Drag to rotate, scroll to zoom
- **Keyboard Shortcuts**: Space to pause/resume

### 🎥 Dynamic Camera Modes
- **Orbit Mode**: Classic stationary camera with manual rotation
- **Follow Mode**: Camera circles around the object dynamically
- **Fly Through Mode**: Immersive flying camera creating depth sensation

### ⭐ Advanced Visual Effects
- **Animated Star Field**: 0-500 twinkling stars with pulsing brightness
- **Rim Lighting Shader**: Custom fragment shader with glowing edges
- **Motion Trail Effect**: Psychedelic ghosting/afterimage effect
- **Wireframe Mode**: Toggle between solid and wireframe rendering
- **Dynamic Lighting**: Real-time lighting with normal mapping

### 🎨 Customization Options
- **4 Color Schemes**: Gradient, Solid, Rainbow, Texture
- **Adjustable Rotation Speed**: 0x to 5x speed multiplier
- **Zoom Control**: 2x to 10x zoom range
- **Toggle Effects**: Lighting, rim glow, motion trails

### 🚀 Object Spawning
- **Unlimited Objects**: Spawn random 3D objects in space
- **Random Properties**: Each object has unique shape, color, position, rotation, and scale
- **Independent Motion**: Spawned objects rotate at different speeds
- **Object Counter**: Track total objects in scene

## 🎯 How to Use

1. **Open the Project**
   ```bash
   # Simply open 3d-viewer.html in any modern browser
   open 3d-viewer.html
   ```

2. **Controls**
   - 🖱️ **Drag** - Rotate the main object
   - 🔍 **Scroll** - Zoom in/out
   - ⌨️ **Space** - Pause/resume auto-rotation
   - 🎛️ **Panel Controls** - Adjust all settings in real-time

3. **Experiment**
   - Try different **camera modes** for unique perspectives
   - **Spawn objects** to create a crowded space scene
   - Enable **motion trail** for a trippy effect
   - Switch to **wireframe mode** to see the geometry
   - Adjust **star count** from 0 to 500 for different atmospheres

## 🛠️ Technical Details

### Technology Stack
- **WebGL**: Low-level 3D graphics API (OpenGL ES for the web)
- **Vanilla JavaScript**: No frameworks or external dependencies
- **GLSL Shaders**: Custom vertex and fragment shaders
- **HTML5 Canvas**: Full-screen rendering surface

### Key Components

#### Shader System
```glsl
- Vertex Shader: Position transformation, normal calculation
- Fragment Shader: Phong lighting, rim lighting effect, color mixing
```

#### Geometry Generation
- Procedural mesh generation for all shapes
- Proper normal calculation for lighting
- Efficient indexed vertex buffers

#### Matrix Math
- Custom 4x4 matrix operations
- Perspective projection
- Model-view transformations
- Normal matrix calculation

#### Particle System
- Star field with 3D positioning
- Per-particle brightness animation
- Efficient batch rendering

## 📁 Project Structure

```
3D-Space-Explorer/
├── 3d-viewer.html       # Main HTML with embedded CSS
├── webgl-viewer.js      # WebGL rendering engine and logic
└── README.md           # This file
```

## 🎨 Color Schemes

| Scheme | Description |
|--------|-------------|
| **Gradient** | Position-based RGB gradients |
| **Solid** | Single warm orange color |
| **Rainbow** | HSL-based rainbow spectrum |
| **Texture** | Procedural sine/cosine patterns |

## 🎭 Camera Modes

| Mode | Behavior |
|------|----------|
| **Orbit** | Static camera, manual rotation control |
| **Follow** | Camera orbits around object in circular path |
| **Fly Through** | Camera flies through space with sinusoidal motion |

## 🚀 Performance

- **60 FPS** rendering on modern hardware
- **Efficient rendering** with WebGL buffers
- **Optimized star system** with billboard quads
- **Dynamic LOD** through adjustable star count

## 🌟 Future Enhancements

- [ ] Add more 3D shapes (octahedron, icosahedron, custom models)
- [ ] Texture mapping support
- [ ] Collision detection between objects
- [ ] Gravity simulation
- [ ] Sound effects and music
- [ ] Export/import scene configurations
- [ ] Screenshot capture
- [ ] VR support

## 📝 License

MIT License - Feel free to use this project for learning or personal projects!

## 👨‍💻 Author

Created with ❤️ using WebGL and vanilla JavaScript

## 🙏 Acknowledgments

- WebGL specifications and documentation
- Computer graphics fundamentals
- GLSL shader programming

---

**⭐ If you like this project, give it a star on GitHub!**
