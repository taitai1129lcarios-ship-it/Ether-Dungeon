export class InputHandler {
    constructor() {
        this.keys = {};
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') e.preventDefault();
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.keys['Click'] = true;
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.keys['Click'] = false;
        });
    }
    isDown(key) { return this.keys[key]; }
}

export class Camera {
    constructor(width, height, mapWidth, mapHeight) {
        this.width = width;
        this.height = height;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.x = 0;
        this.y = 0;
    }

    follow(target) {
        this.x = target.x + target.width / 2 - this.width / 2;
        this.y = target.y + target.height / 2 - this.height / 2;
        this.x = Math.max(0, Math.min(this.x, this.mapWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, this.mapHeight - this.height));
    }
}

export class Map {
    constructor(width, height, tileSize) {
        this.width = width;
        this.height = height;
        this.pixelWidth = width * tileSize;
        this.pixelHeight = height * tileSize;
        this.tileSize = tileSize;
        this.tiles = [];
        this.rooms = [];
        this.wallImage = new Image();
        this.wallImage.src = 'assets/wall.png';
    }

    generate() {
        // Initialize with Walls
        this.tiles = [];
        this.roomGrid = []; // Stores room index or -1
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            this.roomGrid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = 1; // 1 = Wall
                this.roomGrid[y][x] = -1; // -1 = No Room
            }
        }
        this.rooms = [];

        // 1. Place Preset Rooms
        this.placeRoom({
            w: 7, h: 7,
            type: 'treasure',
            entranceCount: 1
        });

        // 2. Place Random Rooms
        const attemptLimit = 100;
        const targetRooms = 15;

        for (let i = 0; i < attemptLimit && this.rooms.length < targetRooms; i++) {
            const w = Math.floor(Math.random() * 8) + 6; // 6 to 13
            const h = Math.floor(Math.random() * 8) + 6;

            const sizeFactor = (w * h) / 100;
            const entrances = Math.max(1, Math.min(4, Math.ceil(sizeFactor * 2)));

            this.placeRoom({
                w: w, h: h,
                type: 'normal',
                entranceCount: entrances
            });
        }

        // 3. Connect Rooms via Connectors with A*
        this.connectRooms();
    }

    placeRoom(config) {
        // Try random positions
        for (let i = 0; i < 50; i++) {
            const x = Math.floor(Math.random() * (this.width - config.w - 4)) + 2; // +2 padding for connectors
            const y = Math.floor(Math.random() * (this.height - config.h - 4)) + 2;

            const newRoom = {
                x, y, w: config.w, h: config.h,
                type: config.type,
                connectors: [],
                id: this.rooms.length
            };

            // Check overlap with existing rooms (buffer of 2 for paths)
            let failed = false;
            for (let other of this.rooms) {
                if (newRoom.x - 2 <= other.x + other.w && newRoom.x + newRoom.w + 2 >= other.x &&
                    newRoom.y - 2 <= other.y + other.h && newRoom.y + newRoom.h + 2 >= other.y) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                this.carveRoom(newRoom);
                this.generateConnectors(newRoom, config.entranceCount);
                this.rooms.push(newRoom);
                return true;
            }
        }
        return false;
    }

    carveRoom(room) {
        // Mark room grid
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.roomGrid[y][x] = room.id;
            }
        }
        // Hollow out
        for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
            for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
                this.tiles[y][x] = 0;
            }
        }
    }

    generateConnectors(room, count) {
        const possible = [];
        // Top Wall (x, room.y) - Dir Up
        for (let x = room.x + 2; x < room.x + room.w - 2; x++) possible.push({ x: x, y: room.y, dir: { x: 0, y: -1 } });
        // Bottom Wall (x, room.y + h -1) - Dir Down
        for (let x = room.x + 2; x < room.x + room.w - 2; x++) possible.push({ x: x, y: room.y + room.h - 1, dir: { x: 0, y: 1 } });
        // Left Wall (room.x, y) - Dir Left
        for (let y = room.y + 2; y < room.y + room.h - 2; y++) possible.push({ x: room.x, y: y, dir: { x: -1, y: 0 } });
        // Right Wall (room.x + w -1, y) - Dir Right
        for (let y = room.y + 2; y < room.y + room.h - 2; y++) possible.push({ x: room.x + room.w - 1, y: y, dir: { x: 1, y: 0 } });

        possible.sort(() => Math.random() - 0.5);

        for (let i = 0; i < count && i < possible.length; i++) {
            const c = possible[i];
            room.connectors.push(c);
            this.tiles[c.y][c.x] = 0; // Open door
            this.roomGrid[c.y][c.x] = -1; // Treat door as 'not room' for pathing check allows entry?
        }
    }

    connectRooms() {
        // Connect Room I to Room I+1
        for (let i = 0; i < this.rooms.length - 1; i++) {
            const r1 = this.rooms[i];
            const r2 = this.rooms[i + 1];
            this.connectTwoRooms(r1, r2);
        }

        // Random loops
        for (let i = 0; i < this.rooms.length; i++) {
            if (Math.random() < 0.3) {
                const rA = this.rooms[i];
                const rB = this.rooms[Math.floor(Math.random() * this.rooms.length)];
                if (rA !== rB) this.connectTwoRooms(rA, rB);
            }
        }
    }

    connectTwoRooms(r1, r2) {
        let bestPath = null;
        let minCost = Infinity;

        // Try all connector pairs, find shortest A*
        // Optimization: Just try closest Euclidean pair first?
        // Or limiting check count.

        let c1 = r1.connectors[Math.floor(Math.random() * r1.connectors.length)];
        let c2 = r2.connectors[Math.floor(Math.random() * r2.connectors.length)];

        // Find path
        const path = this.findPath(c1, c2);
        if (path) {
            this.drawPath(path);
        } else {
            // Brute force retry?
            // Maybe fallback to L-shape if A* fails (tunneling mode)
        }
    }

    findPath(start, end) {
        // A* Algorithm
        const startNode = { x: start.x + start.dir.x, y: start.y + start.dir.y }; // Step out
        const endNode = { x: end.x + end.dir.x, y: end.y + end.dir.y }; // Step out target

        // Check bounds
        if (!this.isValid(startNode.x, startNode.y)) startNode.x = start.x; // Fallback
        if (!this.isValid(endNode.x, endNode.y)) endNode.x = end.x;

        const open = [startNode];
        const cameFrom = {};
        const gScore = {};
        gScore[`${startNode.x},${startNode.y}`] = 0;

        const fScore = {};
        fScore[`${startNode.x},${startNode.y}`] = this.heuristic(startNode, endNode);

        const id = (n) => `${n.x},${n.y}`;

        while (open.length > 0) {
            // Get lowest fScore
            open.sort((a, b) => (fScore[id(a)] || Infinity) - (fScore[id(b)] || Infinity));
            const current = open.shift();

            if (current.x === endNode.x && current.y === endNode.y) {
                return this.reconstructPath(cameFrom, current, start, end);
            }

            const neighbors = [
                { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 }
            ];

            for (let next of neighbors) {
                if (!this.isValid(next.x, next.y)) continue;

                // Obstacle check: Can't walk through OTHER rooms
                // roomGrid[y][x] != -1 means it is a room.
                // Allow if it is -1.
                if (this.roomGrid[next.y][next.x] !== -1) continue;

                const tentativeG = gScore[id(current)] + 1;
                if (tentativeG < (gScore[id(next)] || Infinity)) {
                    cameFrom[id(next)] = current;
                    gScore[id(next)] = tentativeG;
                    fScore[id(next)] = tentativeG + this.heuristic(next, endNode);
                    if (!open.some(n => n.x === next.x && n.y === next.y)) {
                        open.push(next);
                    }
                }
            }
        }
        return null; // No path
    }

    isValid(x, y) {
        return x >= 1 && x < this.width - 1 && y >= 1 && y < this.height - 1;
    }

    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    reconstructPath(cameFrom, current, start, end) {
        const path = [end, current];
        let temp = current;
        while (cameFrom[`${temp.x},${temp.y}`]) {
            temp = cameFrom[`${temp.x},${temp.y}`];
            path.push(temp);
        }
        path.push(start);
        return path;
    }

    drawPath(path) {
        for (let p of path) {
            this.tiles[p.y][p.x] = 0;
        }
    }

    draw(ctx, camera) {
        const startX = Math.floor(camera.x / this.tileSize);
        const startY = Math.floor(camera.y / this.tileSize);
        const endX = startX + Math.ceil(camera.width / this.tileSize) + 1;
        const endY = startY + Math.ceil(camera.height / this.tileSize) + 1;

        for (let y = Math.max(0, startY); y < Math.min(this.height, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(this.width, endX); x++) {
                if (this.tiles[y][x] === 1) {
                    // Check if tile below is floor (to determine front face)
                    const isFrontWall = y < this.height - 1 && this.tiles[y + 1][x] === 0;

                    if (isFrontWall) {
                        // Draw Wall Face (Image Texture)
                        if (this.wallImage.complete && this.wallImage.naturalWidth !== 0) {
                            ctx.drawImage(this.wallImage, Math.floor(x * this.tileSize), Math.floor(y * this.tileSize), this.tileSize, this.tileSize);
                        } else {
                            // Fallback if image not loaded
                            ctx.fillStyle = '#666';
                            ctx.fillRect(Math.floor(x * this.tileSize), Math.floor(y * this.tileSize), this.tileSize, this.tileSize);
                        }
                    } else {
                        // Draw Wall Top (Roof)
                        ctx.fillStyle = '#333';
                        ctx.fillRect(Math.floor(x * this.tileSize), Math.floor(y * this.tileSize), this.tileSize, this.tileSize);
                        ctx.strokeStyle = '#222';
                        ctx.strokeRect(Math.floor(x * this.tileSize), Math.floor(y * this.tileSize), this.tileSize, this.tileSize);
                    }
                } else {
                    ctx.fillStyle = '#222';
                    ctx.fillRect(Math.floor(x * this.tileSize), Math.floor(y * this.tileSize), this.tileSize, this.tileSize);
                    ctx.strokeStyle = '#2a2a2a';
                    ctx.strokeRect(Math.floor(x * this.tileSize), Math.floor(y * this.tileSize), this.tileSize, this.tileSize);
                }
            }
        }
    }

    isWall(x, y) {
        const tx = Math.floor(x / this.tileSize);
        const ty = Math.floor(y / this.tileSize);
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true;
        return this.tiles[ty][tx] === 1;
    }
}

export class Entity {
    constructor(game, x, y, width, height, color, hp) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.hp = hp;
        this.maxHp = hp;
        this.speed = 0;
        this.vx = 0;
        this.vy = 0;
        this.markedForDeletion = false;
        this.invulnerable = 0;
        this.damageColor = '#fff'; // Default damage text color
    }

    update(dt) {
        if (this.invulnerable > 0) this.invulnerable -= dt;

        let nextX = this.x + this.vx * dt;
        if (!this.checkCollision(nextX, this.y)) {
            this.x = nextX;
        }

        let nextY = this.y + this.vy * dt;
        if (!this.checkCollision(this.x, nextY)) {
            this.y = nextY;
        }
    }

    checkCollision(x, y) {
        return this.game.map.isWall(x, y) ||
            this.game.map.isWall(x + this.width, y) ||
            this.game.map.isWall(x, y + this.height) ||
            this.game.map.isWall(x + this.width, y + this.height);
    }

    takeDamage(amount) {
        if (this.invulnerable > 0) return;
        this.hp -= amount;

        // Spawn Damage Text
        this.game.animations.push({
            type: 'text',
            text: amount,
            x: this.x + this.width / 2,
            y: this.y,
            vx: (Math.random() - 0.5) * 50,
            vy: -100,
            life: 0.8,
            maxLife: 0.8,
            color: this.damageColor,
            font: '20px sans-serif'
        });

        if (this.hp <= 0) {
            this.hp = 0;
            this.markedForDeletion = true;
        }
        this.invulnerable = 0.5;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        if (this.invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.fillStyle = 'white';
        }
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(Math.floor(this.x), Math.floor(this.y - 10), this.width, 5);
            ctx.fillStyle = 'green';
            ctx.fillRect(Math.floor(this.x), Math.floor(this.y - 10), this.width * (this.hp / this.maxHp), 5);
        }
    }
}
