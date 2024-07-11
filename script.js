// Torus mesh settings
const TORUS_RADIUS = 2;
const RING_RADIUS = 1;
const TORUS_SEGMENTS = 36;
const RING_SEGMENTS = 36;

// Dimensions of the game canvas (will be applied to torus as texture)
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 512;

// Dimensions of the game grid
const GRID_WIDTH = 48;
const GRID_HEIGHT = 24;

// Dimensions and padding of grid cells in game canvas space
const CELL_WIDTH = CANVAS_WIDTH / GRID_WIDTH;
const CELL_HEIGHT = CANVAS_HEIGHT / GRID_HEIGHT;
const CELL_PADDING = 4;

// Snake starting coordinates
const SNAKE_START_X = 23;
const SNAKE_START_Y = 5;

// Number of segments the snake grows each time it eats food
const SNAKE_GROWTH_RATE = 1;

// Milliseconds between updates of the snake position
const SNAKE_MOVE_DELAY = 110;

// Position and dimensions of HUD text relative to height
const SCORE_TEXT_OFFSET_X = 0.046875;
const SCORE_TEXT_OFFSET_Y = 0.078125;
const SCORE_TEXT_SIZE = 0.046875;
const SCORE_TEXT_LINE_SPACING = 0.0625;

// Camera settings
const CAMERA_POS = 15.0;
const CAMERA_FOV = Math.PI / 3;
const CAMERA_NEAR = 0.01;
const CAMERA_FAR = 100.0;
const CAMERA_FLIP_TIME = 250;

// Modulo that also works for negative numbers
function modulo(a, b) {
    var result = Math.abs(a) % b;
    return a < 0 ? b - result : result;
}

// Returns a random integer between a and b (inclusive)
function randInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
}

// Quaternion utilities
function copyQuaternion(q) {
    return {w: q.w, x: q.x, y: q.y, z: q.z};
}

function axisAngleQuaternion(angle, x, y, z) {
    var halfAngle = angle / 2;
    var co = Math.cos(halfAngle);
    var si = Math.sin(halfAngle);
    return {w: co, x: x * si, y: y * si, z: z * si};
}

function quatmul(a, b) {
    return {
        w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
        x: a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y,
        y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
        z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w
    };
}

// q0 and q1 must be normalized
function quatslerp(q0, q1, t) {
    // Not sure if this is correct
    // The Wikipedia quaternion article says slerp(q0, q1, t) = (q1*q0^-1)^t*q0
    // That would seem to make sense but causes weird distortions
    // Just doing regular slerp seems to work alright
    var q0q1 = q0.w * q1.w + q0.x * q1.x + q0.y * q1.y + q0.z * q1.z;
    var theta = Math.acos(q0q1);
    var sith = Math.sqrt(1 - q0q1 * q0q1);
    var w0 = Math.sin((1 - t) * theta) / sith;
    var w1 = Math.sin(t * theta) / sith;
    return {
        w: w0 * q0.w + w1 * q1.w,
        x: w0 * q0.x + w1 * q1.x,
        y: w0 * q0.y + w1 * q1.y,
        z: w0 * q0.z + w1 * q1.z
    };
}

function quat2mat(q) {
    var xx = q.x * q.x;
    var xy = q.x * q.y;
    var xz = q.x * q.z;
    var xw = q.x * q.w;
    var yy = q.y * q.y;
    var yz = q.y * q.z;
    var yw = q.y * q.w;
    var zz = q.z * q.z;
    var zw = q.z * q.w;
    return new Float32Array([
        1 - 2 * (yy + zz), 2 * (xy + zw), 2 * (xz - yw), 0.0,
        2 * (xy - zw), 1 - 2 * (xx + zz), 2 * (yz + xw), 0.0,
        2 * (xz + yw), 2 * (yz - xw), 1 - 2 * (xx + yy), 0.0,
        0.0, 0.0, 0.0, 1.0
    ]);
}

// Utilities for creating 4x4 transformation matrices
// Matrices are Float32Arrays with 16 elements
function identityMatrix() {
    var matrix = new Float32Array(16);
    matrix[ 0] = 1.0;
    matrix[ 5] = 1.0;
    matrix[10] = 1.0;
    matrix[15] = 1.0;
    return matrix;
}

function translationMatrix(x, y, z) {
    var matrix = identityMatrix();
    matrix[12] = x;
    matrix[13] = y;
    matrix[14] = z;
    return matrix;
}

function rotationMatrix(angle, i, j) {
    var co = Math.cos(angle), si = Math.sin(angle);
    var matrix = identityMatrix();
    matrix[4 * i + i] = co;
    matrix[4 * j + i] = si;
    matrix[4 * i + j] = -si;
    matrix[4 * j + j] = co;
    return matrix;
}

function projectionMatrix(fov, aspect, zNear, zFar) {
    var matrix = new Float32Array(16);
    var focalLength = 1 / Math.tan(fov / 2);
    var clipGap = zNear - zFar;
    matrix[ 0] = focalLength;
    matrix[ 5] = focalLength * aspect;
    matrix[10] = (zNear + zFar) / clipGap;
    matrix[14] = 2 * zNear * zFar / clipGap;
    matrix[11] = -1.0;
    return matrix;
}

// Multiplies two matrices together
// New transformation is equivalent to applying b, then a
function multiplyMatrices(a, b) {
    var matrix = new Float32Array(16);
    matrix[ 0] = a[ 0] * b[ 0] + a[ 1] * b[ 4] + a[ 2] * b[ 8] + a[ 3] * b[12];
    matrix[ 1] = a[ 0] * b[ 1] + a[ 1] * b[ 5] + a[ 2] * b[ 9] + a[ 3] * b[13];
    matrix[ 2] = a[ 0] * b[ 2] + a[ 1] * b[ 6] + a[ 2] * b[10] + a[ 3] * b[14];
    matrix[ 3] = a[ 0] * b[ 3] + a[ 1] * b[ 7] + a[ 2] * b[11] + a[ 3] * b[15];
    matrix[ 4] = a[ 4] * b[ 0] + a[ 5] * b[ 4] + a[ 6] * b[ 8] + a[ 7] * b[12];
    matrix[ 5] = a[ 4] * b[ 1] + a[ 5] * b[ 5] + a[ 6] * b[ 9] + a[ 7] * b[13];
    matrix[ 6] = a[ 4] * b[ 2] + a[ 5] * b[ 6] + a[ 6] * b[10] + a[ 7] * b[14];
    matrix[ 7] = a[ 4] * b[ 3] + a[ 5] * b[ 7] + a[ 6] * b[11] + a[ 7] * b[15];
    matrix[ 8] = a[ 8] * b[ 0] + a[ 9] * b[ 4] + a[10] * b[ 8] + a[11] * b[12];
    matrix[ 9] = a[ 8] * b[ 1] + a[ 9] * b[ 5] + a[10] * b[ 9] + a[11] * b[13];
    matrix[10] = a[ 8] * b[ 2] + a[ 9] * b[ 6] + a[10] * b[10] + a[11] * b[14];
    matrix[11] = a[ 8] * b[ 3] + a[ 9] * b[ 7] + a[10] * b[11] + a[11] * b[15];
    matrix[12] = a[12] * b[ 0] + a[13] * b[ 4] + a[14] * b[ 8] + a[15] * b[12];
    matrix[13] = a[12] * b[ 1] + a[13] * b[ 5] + a[14] * b[ 9] + a[15] * b[13];
    matrix[14] = a[12] * b[ 2] + a[13] * b[ 6] + a[14] * b[10] + a[15] * b[14];
    matrix[15] = a[12] * b[ 3] + a[13] * b[ 7] + a[14] * b[11] + a[15] * b[15];
    return matrix;
}

// torus(u, v) = ((R + r*cos(v))cos(u), r*sin(v), (R + r*cos(v))sin(u))
function getTorusPoint(u, v, R, r) {
    var cu = Math.cos(u), su = Math.sin(u);
    var cv = Math.cos(v), sv = Math.sin(v);
    var Rc = R + r * cv;
    var point = [Rc * cu, r * sv, Rc * su];
    var normal = [cu * cv, sv, su * cv];
    return [point, normal];
}

function genTorusMesh(R, r, torusSegments, ringSegments) {
    var numVertices = torusSegments * ringSegments * 6;
    var torusMesh = new Float32Array(numVertices * 8);
    var offset = 0;
    for (var ti = 0; ti < torusSegments; ti++) {
        var u0 = ti / torusSegments, u1 = (ti + 1) / torusSegments;
        var theta0 = 2 * Math.PI * u0, theta1 = 2 * Math.PI * u1;
        for (var ri = 0; ri < ringSegments; ri++) {
            var v0 = ri / ringSegments, v1 = (ri + 1) / ringSegments;
            var phi0 = (2 * v0 - 1) * Math.PI, phi1 = (2 * v1 - 1) * Math.PI;

            var [p0, n0] = getTorusPoint(theta0, phi0, R, r);
            var [p1, n1] = getTorusPoint(theta1, phi0, R, r);
            var [p2, n2] = getTorusPoint(theta1, phi1, R, r);
            var [p3, n3] = getTorusPoint(theta0, phi1, R, r);

            var vert0 = new Float32Array([...p0, ...n0, u0, v0]);
            var vert1 = new Float32Array([...p1, ...n1, u1, v0]);
            var vert2 = new Float32Array([...p2, ...n2, u1, v1]);
            var vert3 = new Float32Array([...p3, ...n3, u0, v1]);

            torusMesh.set(vert2, offset);
            torusMesh.set(vert1, offset + 8);
            torusMesh.set(vert0, offset + 16);
            torusMesh.set(vert0, offset + 24);
            torusMesh.set(vert3, offset + 32);
            torusMesh.set(vert2, offset + 40);
            offset += 48;
        }
    }

    return [numVertices, torusMesh];
}

function createBuffer(gl, target, initial, usage) {
    var buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, initial, usage);
    return buffer;
}

function createProgram(gl, vs, fs, attribs, uniforms) {
    // Compiler vertex and fragment shader
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vs);
    gl.compileShader(vertexShader);

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fs);
    gl.compileShader(fragmentShader);

    // Link shaders into a program and configure it
    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    gl.linkProgram(shaderProgram);

    gl.detachShader(shaderProgram, vertexShader);
    gl.detachShader(shaderProgram, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // Check if anything went wrong
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        var message = gl.getProgramInfoLog(shaderProgram);
        gl.deleteProgram(shaderProgram);
        throw Error(message);
    }

    var attribLocs = {};
    for (var attrib of attribs) {
        attribLocs[attrib] = gl.getAttribLocation(shaderProgram, attrib);
    }

    var uniformLocs = {};
    for (var uniform of uniforms) {
        uniformLocs[uniform] = gl.getUniformLocation(shaderProgram, uniform);
    }

    return [shaderProgram, attribLocs, uniformLocs];
}

window.addEventListener("load", function() {
    var canvas = document.querySelector("#viewport");
    var hud = document.querySelector("#hud");
    var gl = canvas.getContext("webgl", {antialias: true});
    var hudGraphics = hud.getContext("2d");
    if (!gl) return;

    // Ensure rendering settings and canvas dimensions are correct
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    hud.width = window.innerWidth;
    hud.height = window.innerHeight;

    // Array of snake segments {x: ..., y: ...}
    var snakeBody = [{x: SNAKE_START_X, y: SNAKE_START_Y}];

    // Direction the snake is moving
    var snakeMoveX = 0;
    var snakeMoveY = 0;

    // Counter to track snake growth spurts
    var snakeGrowCounter = 0;

    // Food coordinates
    var snakeFood = {x: 0, y: 0};

    // Snake score (food eaten) and high score
    var snakeScore = 0;
    var snakeHighScore = 0;

    // Set up camera and other transformations
    var cameraQuaternion = axisAngleQuaternion(0.0, 0.0, 1.0, 0.0);
    var modelMatrix = rotationMatrix(Math.PI / 2, 1, 2);
    var viewMatrix = multiplyMatrices(quat2mat(cameraQuaternion), translationMatrix(0.0, 0.0, -CAMERA_POS));
    var projMatrix = projectionMatrix(CAMERA_FOV, canvas.width / canvas.height, CAMERA_NEAR, CAMERA_FAR);

    // Canvas for drawing the game on (will be applied to torus)
    var snakeCanvas = document.createElement("canvas");
    var snakeGraphics = snakeCanvas.getContext("2d");
    snakeCanvas.width = CANVAS_WIDTH;
    snakeCanvas.height = CANVAS_HEIGHT;

    // Cube mesh (36 vertices, 12 triangles)
    const skyboxVertices = new Float32Array([
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
        -1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0, -1.0,
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
        -1.0,  1.0, -1.0,
        -1.0, -1.0, -1.0
    ]);

    // Create a vertex buffer for the skybox
    var skyboxBuffer = createBuffer(gl, gl.ARRAY_BUFFER, skyboxVertices, gl.STATIC_DRAW);

    // Create a shader program for the skybox
    var [skyboxProgram, skyboxAttribs, skyboxUniforms] = createProgram(
        gl,
        document.querySelector(".sky.vertex-shader").innerHTML,
        document.querySelector(".sky.fragment-shader").innerHTML,
        ["direction"],
        ["viewMatrix", "projMatrix", "envMap"]
    );

    // Create skybox texture
    var skyboxTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);

    var face = document.querySelector(".sky.texture");
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, face);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, face);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, face);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, face);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, face);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, face);

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    // Create vertex buffer for the torus
    var [torusVertices, torusMesh] = genTorusMesh(TORUS_RADIUS, RING_RADIUS, TORUS_SEGMENTS, RING_SEGMENTS);
    var torusBuffer = createBuffer(gl, gl.ARRAY_BUFFER, torusMesh, gl.STATIC_DRAW);

    // Create a shader program for the torus
    var [torusProgram, torusAttribs, torusUniforms] = createProgram(
        gl,
        document.querySelector(".torus.vertex-shader").innerHTML,
        document.querySelector(".torus.fragment-shader").innerHTML,
        ["vertexPosition", "vertexNormal", "vertexUv"],
        ["modelMatrix", "viewMatrix", "projMatrix", "torusTexture"]
    );

    // Create texture for the torus
    var torusTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, torusTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Draws a square on the grid at position {x: ..., y: ...}
    function drawCell(position) {
        var offsetX = position.x * CELL_WIDTH;
        var offsetY = position.y * CELL_HEIGHT;
        snakeGraphics.fillRect(offsetX + CELL_PADDING, offsetY + CELL_PADDING, CELL_WIDTH - CELL_PADDING, CELL_HEIGHT - CELL_PADDING);
    }

    // Randomly places a piece of food in a cell not occupied by the snake
    function spawnFood() {
        var keepTrying = true;
        while (keepTrying) {
            snakeFood.x = randInt(0, GRID_WIDTH - 1);
            snakeFood.y = randInt(0, GRID_HEIGHT - 1);
            keepTrying = false;
            for (var segment of snakeBody) {
                if (segment.x == snakeFood.x && segment.y == snakeFood.y) {
                    keepTrying = true;
                    break;
                }
            }
        }
    }

    function updateCamera() {
        viewMatrix = multiplyMatrices(quat2mat(cameraQuaternion), translationMatrix(0.0, 0.0, -CAMERA_POS));
    }

    // Flips the camera from one side of the torus to the other
    // If not aligned, flips to side farthest away
    function flipCamera() {
        var startOrientation = copyQuaternion(cameraQuaternion);
        var targetOrientation = axisAngleQuaternion(Math.PI, 0.0, 1.0, 0.0);
        if (viewMatrix[10] < 0) targetOrientation = axisAngleQuaternion(0.0, 0.0, 1.0, 0.0);

        var startTime;
        function animateCameraFlip(time) {
            // Make sure start time is recorded first
            if (startTime < 0) startTime = time;

            // Calculate interpolation factor
            var t = (time - startTime) / CAMERA_FLIP_TIME;

            // Interpolate along the geodesic between the start and target orientations
            // The timing won't always be perfect so we need to cap t at 1
            cameraQuaternion = quatslerp(startOrientation, targetOrientation, Math.min(1, t));
            updateCamera();

            // Proceed to next frame if slerp is not complete
            if (t < 1) requestAnimationFrame(animateCameraFlip);
        }

        startTime = -1;
        requestAnimationFrame(animateCameraFlip);
    }

    function updateSnake() {
        // Remove tail (unless growing) and add to the front of the snake
        var snakeHead = snakeBody[snakeBody.length - 1];
        if (snakeGrowCounter == 0) snakeBody.shift();
        else snakeGrowCounter--;
        snakeBody.push({
            x: modulo(snakeHead.x + snakeMoveX, GRID_WIDTH), // Modulo because we are on a torus
            y: modulo(snakeHead.y + snakeMoveY, GRID_HEIGHT) // Modulo because we are on a torus
        });

        snakeHead = snakeBody[snakeBody.length - 1];
        if (snakeHead.x == snakeFood.x && snakeHead.y == snakeFood.y) {
            // Increment score, respawn food, and start growing the snake
            snakeScore++;
            spawnFood();
            snakeGrowCounter = SNAKE_GROWTH_RATE;
        } else {
            for (var i = 0; i < snakeBody.length - 1; i++) {
                // Restart on self collision
                if (snakeHead.x == snakeBody[i].x && snakeHead.y == snakeBody[i].y) {
                    // Check if current score beats high score
                    if (snakeScore > snakeHighScore) {
                        // Update high score and alert player
                        snakeHighScore = snakeScore;
                        alert("New high score!\nCurrent high score: " + snakeHighScore);
                    } else {
                        // High score remains
                        alert("You crashed!\nGame over.");
                    }

                    // Reset and start over
                    resetGame();
                    break;
                }
            }
        }
    }

    // Resets snake and spawns it in a random location
    // Resets counters
    // Spawns food for the snake
    function resetGame() {
        // Restart snake at length 1
        snakeBody = [{x: SNAKE_START_X, y: SNAKE_START_Y}];

        // Zero out movement
        snakeMoveX = 0;
        snakeMoveY = 0;

        // Reset the growth counter
        snakeGrowCounter = 0;

        // Reset the score and replace the food
        snakeScore = 0;
        spawnFood();

        // Return camera to its starting position
        cameraQuaternion = axisAngleQuaternion(0.0, 0.0, 1.0, 0.0);
        updateCamera();
    }

    // Make sure projection matrix is updated to match new canvas aspect ratio
    window.addEventListener("resize", function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        hud.width = window.innerWidth;
        hud.height = window.innerHeight;
        projMatrix = projectionMatrix(CAMERA_FOV, canvas.width / canvas.height, CAMERA_NEAR, CAMERA_FAR);
    });

    // Update camera when the mouse is dragged
    var mouseDown = false;
    hud.addEventListener("mousedown", function(event) { mouseDown = true; });
    hud.addEventListener("mouseup", function(event) { mouseDown = false; });
    hud.addEventListener("mousemove", function(event) {
        if (mouseDown) {
            cameraQuaternion = quatmul(axisAngleQuaternion(event.movementY / canvas.height * 2 * Math.PI, 1.0, 0.0, 0.0), cameraQuaternion);
            cameraQuaternion = quatmul(axisAngleQuaternion(event.movementX / canvas.height * 2 * Math.PI, 0.0, 1.0, 0.0), cameraQuaternion);
            updateCamera();
        }
    });

    // Set up keyboard listener to control snake
    window.addEventListener("keydown", function(event) {
        var oldSnakeMoveX = snakeMoveX;
        var oldSnakeMoveY = snakeMoveY;
        if (event.code == "ArrowRight") {
            snakeMoveX = 1;
            snakeMoveY = 0;
        } else if (event.code == "ArrowLeft") {
            snakeMoveX = -1;
            snakeMoveY = 0;
        } else if (event.code == "ArrowUp") {
            snakeMoveX = 0;
            snakeMoveY = -1;
        } else if (event.code == "ArrowDown") {
            snakeMoveX = 0;
            snakeMoveY = 1;
        } else if (event.code == "Space") {
            flipCamera();
        }

        if (snakeBody.length > 1) {
            var snakeHead = snakeBody[snakeBody.length - 1];
            var snakeNeck = snakeBody[snakeBody.length - 2];
            if ((snakeHead.x + snakeMoveX) == snakeNeck.x && (snakeHead.y + snakeMoveY) == snakeNeck.y) {
                // Prevent reversing
                snakeMoveX = oldSnakeMoveX;
                snakeMoveY = oldSnakeMoveY;
            }
        }
    });

    function render() {
        // Clear canvas with blue
        snakeGraphics.fillStyle = "#0000FF";
        snakeGraphics.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

        // Draw food
        snakeGraphics.fillStyle = "#FF0000";
        drawCell(snakeFood);

        // Draw snake
        snakeGraphics.fillStyle = "#FFFF00";
        for (var segment of snakeBody) {
            drawCell(segment);
        }

        // Clear HUD
        hudGraphics.clearRect(0, 0, hud.width, hud.height);

        // Display score on HUD
        var scoreTextOffsetX = SCORE_TEXT_OFFSET_X * hud.height;
        var scoreTextOffsetY = SCORE_TEXT_OFFSET_Y * hud.height;
        var scoreTextLineSpacing = SCORE_TEXT_LINE_SPACING * hud.height;
        var scoreTextSize = Math.floor(SCORE_TEXT_SIZE * hud.height);
        hudGraphics.font = scoreTextSize + "px Courier";
        hudGraphics.fillStyle = "#FFFFFF";
        hudGraphics.fillText("Score: " + snakeScore, scoreTextOffsetX, scoreTextOffsetY);
        hudGraphics.fillText("High Score: " + snakeHighScore, scoreTextOffsetX, scoreTextOffsetY + scoreTextLineSpacing);

        // Update the torus texture with the current canvas
        gl.bindTexture(gl.TEXTURE_2D, torusTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snakeCanvas);

        // Clear screen and make sure the viewport is the right size
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);

        // Activate the torus shader program
        gl.useProgram(torusProgram);

        // Set the torus uniforms
        gl.uniform1i(torusUniforms.torusTexture, 0);
        gl.uniformMatrix4fv(torusUniforms.modelMatrix, false, modelMatrix);
        gl.uniformMatrix4fv(torusUniforms.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(torusUniforms.projMatrix, false, projMatrix);

        // Set up torus buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, torusBuffer);
        gl.enableVertexAttribArray(torusAttribs.vertexPosition);
        gl.enableVertexAttribArray(torusAttribs.vertexNormal);
        gl.enableVertexAttribArray(torusAttribs.vertexUv);
        gl.vertexAttribPointer(torusAttribs.vertexPosition, 3, gl.FLOAT, false, 32, 0);
        gl.vertexAttribPointer(torusAttribs.vertexNormal, 3, gl.FLOAT, false, 32, 12);
        gl.vertexAttribPointer(torusAttribs.vertexUv, 2, gl.FLOAT, false, 32, 24);

        // Draw the torus
        gl.drawArrays(gl.TRIANGLES, 0, torusVertices);

        // Hack to ensure skybox is behind everything
        gl.depthFunc(gl.LEQUAL);

        // Activate the skybox shader program
        gl.useProgram(skyboxProgram);

        // Set the skybox uniforms
        gl.uniform1i(skyboxUniforms.envMap, 0);
        gl.uniformMatrix4fv(skyboxUniforms.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(skyboxUniforms.projMatrix, false, projMatrix);

        // Set up skybox buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        // Draw the skybox
        gl.drawArrays(gl.TRIANGLES, 0, 36);

        // Reset depth testing
        gl.depthFunc(gl.LESS);

        // Proceed to the next frame
        requestAnimationFrame(render);
    }

    // Initialize the food and run the game
    spawnFood();
    setInterval(updateSnake, SNAKE_MOVE_DELAY);
    requestAnimationFrame(render);
}, false);