// Initialize scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera with infinite far plane
const camera = new THREE.PerspectiveCamera(
    75, 
    window.innerWidth/window.innerHeight,
    0.1, 
    Number.MAX_SAFE_INTEGER
);
camera.position.set(15, 15, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// State for 2D/3D mode
let is2DMode = false;
const toggleButton = document.getElementById('toggleButton');

// BOLD COLORED AXES ==============================================
function createBoldAxes() {
    const axesGroup = new THREE.Group();
    const axisLength = 10; // Virtually infinite length
    const lineWidth = 2; // Thicker lines
    
    // X Axis (Red)
    const xGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(axisLength, 0, 0)
    ]);
    const xMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff0000, 
        linewidth: lineWidth 
    });
    const xAxis = new THREE.Line(xGeometry, xMaterial);
    axesGroup.add(xAxis);
    
    // Y Axis (Green)
    const yGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, axisLength, 0)
    ]);
    const yMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ff00, 
        linewidth: lineWidth 
    });
    const yAxis = new THREE.Line(yGeometry, yMaterial);
    axesGroup.add(yAxis);
    
    // Z Axis (Blue)
    const zGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, axisLength)
    ]);
    const zMaterial = new THREE.LineBasicMaterial({ 
        color: 0x0000ff, 
        linewidth: lineWidth 
    });
    const zAxis = new THREE.Line(zGeometry, zMaterial);
    axesGroup.add(zAxis);
    
    // Add arrowheads
    const arrowSize = 0.1;
    const xArrow = new THREE.Mesh(
        new THREE.ConeGeometry(arrowSize, arrowSize*2, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    xArrow.position.set(axisLength, 0, 0);
    xArrow.rotation.z = -Math.PI/2;
    axesGroup.add(xArrow);
    
    const yArrow = new THREE.Mesh(
        new THREE.ConeGeometry(arrowSize, arrowSize*2, 16),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    yArrow.position.set(0, axisLength, 0);
    axesGroup.add(yArrow);
    
    const zArrow = new THREE.Mesh(
        new THREE.ConeGeometry(arrowSize, arrowSize*2, 16),
        new THREE.MeshBasicMaterial({ color: 0x0000ff })
    );
    zArrow.position.set(0, 0, axisLength);
    zArrow.rotation.x = Math.PI/2;
    axesGroup.add(zArrow);
    
    // Store references for toggling
    axesGroup.userData.zAxis = zAxis;
    axesGroup.userData.zArrow = zArrow;
    
    return axesGroup;
}
const axesGroup = createBoldAxes();
scene.add(axesGroup);

// Grid system
const gridGroup = new THREE.Group();
scene.add(gridGroup);

// Number labels container
const labelGroup = new THREE.Group();
scene.add(labelGroup);

// Current scale tracking
let currentScale = 1;
const scales = [1, 10, 100, 1000];
const gridColors = [0x555555, 0x444444, 0x333333, 0x222222];

// Create grid planes at different scales
function createGrids() {
    while(gridGroup.children.length > 0) {
        gridGroup.remove(gridGroup.children[0]);
    }
    
    scales.forEach((scale, i) => {
        // XY plane
        const gridXY = new THREE.GridHelper(100 * scale, 100, gridColors[i], gridColors[i]);
        gridXY.rotation.x = Math.PI / 2;
        gridXY.position.z = -0.0001;
        gridGroup.add(gridXY);
        
        // XZ plane (only in 3D mode)
        if (!is2DMode) {
            const gridXZ = new THREE.GridHelper(100 * scale, 100, gridColors[i], gridColors[i]);
            gridGroup.add(gridXZ);
        }
        
        // YZ plane (only in 3D mode)
        if (!is2DMode) {
            const gridYZ = new THREE.GridHelper(100 * scale, 100, gridColors[i], gridColors[i]);
            gridYZ.rotation.z = Math.PI / 2;
            gridYZ.position.x = -0.0001;
            gridGroup.add(gridYZ);
        }
    });
}

// Create number labels with dynamic sizing
function createLabels() {
    while(labelGroup.children.length > 0) {
        labelGroup.remove(labelGroup.children[0]);
    }
    
    const visibleRange = currentScale * 15;
    const step = currentScale;
    
    function makeLabel(text, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Dynamic canvas size based on scale
        const canvasSize = Math.min(256, 64 * Math.log10(currentScale + 1));
        canvas.width = canvasSize;
        canvas.height = canvasSize/2;
        
        // Dynamic font size
        const fontSize = Math.min(32, 16 * Math.log10(currentScale + 1));
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width/2, canvas.height/2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        
        // Base size with logarithmic scaling
        const baseSize = 1.5;
        const sizeMultiplier = Math.log10(currentScale + 1);
        const finalSize = baseSize * sizeMultiplier;
        
        sprite.scale.set(finalSize, finalSize/2, 1);
        sprite.position.copy(position);
        sprite.userData.worldPosition = position.clone();
        
        return sprite;
    }
    
    // Create labels at logarithmic intervals
    const start = -visibleRange;
    const end = visibleRange;
    const steps = Math.min(20, Math.floor(visibleRange/currentScale));
    
    for (let i = 0; i <= steps; i++) {
        const val = start + (end - start) * (i/steps);
        if (Math.abs(val) >= currentScale) {
            // X axis
            labelGroup.add(makeLabel(Math.round(val).toString(), new THREE.Vector3(val, -0.5, 0)));
            // Y axis
            labelGroup.add(makeLabel(Math.round(val).toString(), new THREE.Vector3(-0.5, val, 0)));
            // Z axis (only in 3D mode)
            if (!is2DMode) {
                labelGroup.add(makeLabel(Math.round(val).toString(), new THREE.Vector3(0, -0.5, val)));
            }
        }
    }
}

// Toggle between 2D and 3D mode
function toggle2D3D() {
    is2DMode = !is2DMode;
    axesGroup.userData.zAxis.visible = !is2DMode;
    axesGroup.userData.zArrow.visible = !is2DMode;
    toggleButton.textContent = is2DMode ? 'Switch to 3D' : 'Switch to 2D';
    
    // Reset camera position in 2D mode to face XY plane directly
    if (is2DMode) {
        camera.position.set(0, 0, 15);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
    }
    createGrids();
    createLabels();
}

// Update label sizes based on distance
function updateLabels() {
    const cameraDistance = camera.position.length();
    const scaleFactor = Math.max(1, Math.log10(cameraDistance));
    labelGroup.children.forEach(label => {
        const baseSize = 1.5;
        const sizeMultiplier = Math.log10(currentScale + 1);
        const finalSize = baseSize * sizeMultiplier * scaleFactor;
        label.scale.set(finalSize, finalSize/2, 1);
        label.quaternion.copy(camera.quaternion);
    });
}

// Update scale based on camera distance
function updateScale() {
    const distance = camera.position.length();
    const newScale = Math.pow(10, Math.floor(Math.log10(distance)));
    
    if (newScale !== currentScale) {
        currentScale = Math.max(1, newScale);
        createGrids();
        createLabels();
        gridGroup.scale.set(currentScale, currentScale, currentScale);
    }
}

// Orbit controls with infinite zoom
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.1;
controls.maxDistance = Infinity;

// Initial creation
createGrids();
createLabels();

// Set up toggle button
toggleButton.addEventListener('click', toggle2D3D);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    updateScale();
    updateLabels();
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// DOM elements
const functionInput = document.getElementById('functionInput');
const plotButton = document.getElementById('plotButton');

// Store the function to plot
let currentFunction = null;

// Create a line to plot the function
let functionLine = null;

// Function to parse and plot the function
function plotFunction() {
    const functionString = functionInput.value.trim();

    if (!functionString) {
        if (functionLine) {
            scene.remove(functionLine);
            functionLine = null;
        }
        return;
    }

    try {
        currentFunction = math.parse(functionString);
        if (functionLine) {
            scene.remove(functionLine); // Remove previous plot if exists
        }
        plotGraph();
    } catch (error) {
        alert('Invalid function!');
    }
}

// Function to plot the graph based on the user input
function plotGraph() {
    const points = [];
    const step = 0.1; // Step size for plotting
    const range = 5000; // Max range for plotting

    for (let x = -range; x <= range; x += step) {
        try {
            const y = currentFunction.evaluate({ x: x });
            const z = 0; // In 2D, we keep z = 0
            points.push(new THREE.Vector3(x, y, z));
        } catch (e) {
            console.error('Error evaluating function at x =', x);
        }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });

    functionLine = new THREE.Line(geometry, material);
    scene.add(functionLine);
}

plotButton.addEventListener('click', plotFunction);
plotFunction();


