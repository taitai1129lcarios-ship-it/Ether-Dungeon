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
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = 1;
            }
        }
        this.rooms = [];

        // 1. Place Preset Rooms
        // Treasure Room: 5x5, 1 Entrance
        this.placeRoom({
            w: 7, h: 7, // 5x5 floor + walls
            type: 'treasure',
            entranceCount: 1
        });

        // 2. Place Random Rooms
        const attemptLimit = 100;
        const targetRooms = 15;

        for (let i = 0; i < attemptLimit && this.rooms.length < targetRooms; i++) {
            const w = Math.floor(Math.random() * 8) + 6; // 6 to 13
            const h = Math.floor(Math.random() * 8) + 6;

            // Entrance count proportional to size (max 4)
            const sizeFactor = (w * h) / 100;
            const entrances = Math.max(1, Math.min(4, Math.ceil(sizeFactor * 2)));

            this.placeRoom({
                w: w, h: h,
                type: 'normal',
                entranceCount: entrances
            });
        }

        // 3. Connect Rooms via Connectors
        this.connectRooms();
    }

    placeRoom(config) {
        // Try random positions
        for (let i = 0; i < 50; i++) {
            const x = Math.floor(Math.random() * (this.width - config.w - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - config.h - 2)) + 1;

            const newRoom = {
                x, y, w: config.w, h: config.h,
                type: config.type,
                connectors: []
            };

            // Check overlap
            let failed = false;
            for (let other of this.rooms) {
                // Add padding to prevent rooms sticking too close without paths
                if (newRoom.x - 1 <= other.x + other.w && newRoom.x + newRoom.w + 1 >= other.x &&
                    newRoom.y - 1 <= other.y + other.h && newRoom.y + newRoom.h + 1 >= other.y) {
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
        // Fill room area with floors, keeping 1 tile outer border as wall (managed by room.w/h include walls? No, let's say rooms are floor area + 1 wall... 
        // Let's stick to: room.x/y/w/h defines the WALL boundaries. Inner is floor.
        for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
            for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
                this.tiles[y][x] = 0;
            }
        }
    }

    generateConnectors(room, count) {
        // Possible connection points: center of walls
        // Or random points along walls?
        // Let's pick random points on the 4 walls (excluding corners)

        const possible = [];
        // Top Wall
        for (let x = room.x + 2; x < room.x + room.w - 2; x++) possible.push({ x: x, y: room.y, dir: 'up' });
        // Bottom Wall
        for (let x = room.x + 2; x < room.x + room.w - 2; x++) possible.push({ x: x, y: room.y + room.h - 1, dir: 'down' });
        // Left Wall
        for (let y = room.y + 2; y < room.y + room.h - 2; y++) possible.push({ x: room.x, y: y, dir: 'left' });
        // Right Wall
        for (let y = room.y + 2; y < room.y + room.h - 2; y++) possible.push({ x: room.x + room.w - 1, y: y, dir: 'right' });

        // Shuffle
        possible.sort(() => Math.random() - 0.5);

        // Pick count
        for (let i = 0; i < count && i < possible.length; i++) {
            const c = possible[i];
            room.connectors.push(c);
            // Mark connector as floor (doorway)
            this.tiles[c.y][c.x] = 0;
        }
    }

    connectRooms() {
        // Simple MST-like or Chain approach
        // Connect Room 0 -> 1, 1 -> 2, etc. to ensure connectivity
        // Then add random connections for loops?

        // Actually, user wants "Connect connectors". 
        // Let's store all unconnected connectors.
        const allConnectors = [];
        this.rooms.forEach((r, idx) => {
            r.connectors.forEach(c => allConnectors.push({ ...c, roomId: idx }));
        });

        // Ensure graph connectivity:
        // Connect Room I to Room I+1 via closest connectors
        for (let i = 0; i < this.rooms.length - 1; i++) {
            const roomA = this.rooms[i];
            const roomB = this.rooms[i + 1];

            // Find closest pair of connectors between A and B
            let minDist = Infinity;
            let bestC1 = null;
            let bestC2 = null;

            roomA.connectors.forEach(c1 => {
                roomB.connectors.forEach(c2 => {
                    const d = Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y);
                    if (d < minDist) {
                        minDist = d;
                        bestC1 = c1;
                        bestC2 = c2;
                    }
                });
            });

            if (bestC1 && bestC2) {
                this.digPath(bestC1.x, bestC1.y, bestC2.x, bestC2.y);
            }
        }

        // Randomly connect a few other connectors to create loops
        for (let i = 0; i < this.rooms.length; i++) {
            if (Math.random() > 0.5) {
                const r1 = this.rooms[Math.floor(Math.random() * this.rooms.length)];
                const r2 = this.rooms[Math.floor(Math.random() * this.rooms.length)];
                if (r1 !== r2 && r1.connectors.length > 0 && r2.connectors.length > 0) {
                    const c1 = r1.connectors[0];
                    const c2 = r2.connectors[0];
                    this.digPath(c1.x, c1.y, c2.x, c2.y);
                }
            }
        }
    }

    digPath(x1, y1, x2, y2) {
        // Simple L-shape corridor
        let cx = x1;
        let cy = y1;

        // Randomly choose horizontal or vertical first
        if (Math.random() < 0.5) {
            // Horizontal then Vertical
            while (cx !== x2) {
                this.tiles[cy][cx] = 0;
                cx += (x2 > cx ? 1 : -1);
            }
            while (cy !== y2) {
                this.tiles[cy][cx] = 0;
                cy += (y2 > cy ? 1 : -1);
            }
        } else {
            // Vertical then Horizontal
            while (cy !== y2) {
                this.tiles[cy][cx] = 0;
                cy += (y2 > cy ? 1 : -1);
            }
            while (cx !== x2) {
                this.tiles[cy][cx] = 0;
                cx += (x2 > cx ? 1 : -1);
            }
        }
        this.tiles[y2][x2] = 0; // Ensure end is open
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
