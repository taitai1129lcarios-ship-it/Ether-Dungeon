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
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = 1;
            }
        }

        const roomCount = 25;
        const minSize = 6;
        const maxSize = 15;

        for (let i = 0; i < roomCount; i++) {
            const w = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
            const h = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
            const x = Math.floor(Math.random() * (this.width - w - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - h - 2)) + 1;

            const newRoom = { x, y, w, h };
            let failed = false;
            for (let other of this.rooms) {
                if (newRoom.x <= other.x + other.w && newRoom.x + newRoom.w >= other.x &&
                    newRoom.y <= other.y + other.h && newRoom.y + newRoom.h >= other.y) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                this.createRoom(newRoom);
                if (this.rooms.length > 0) {
                    const prev = this.rooms[this.rooms.length - 1];
                    this.createTunnel(prev.x + Math.floor(prev.w / 2), prev.y + Math.floor(prev.h / 2),
                        newRoom.x + Math.floor(newRoom.w / 2), newRoom.y + Math.floor(newRoom.h / 2));
                }
                this.rooms.push(newRoom);
            }
        }
    }

    createRoom(room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.tiles[y][x] = 0;
            }
        }
    }

    createTunnel(x1, y1, x2, y2) {
        if (Math.random() < 0.5) {
            this.createH_Tunnel(x1, x2, y1);
            this.createV_Tunnel(y1, y2, x2);
        } else {
            this.createV_Tunnel(y1, y2, x1);
            this.createH_Tunnel(x1, x2, y2);
        }
    }

    createH_Tunnel(x1, x2, y) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            this.tiles[y][x] = 0;
            this.tiles[y + 1][x] = 0;
        }
    }

    createV_Tunnel(y1, y2, x) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            this.tiles[y][x] = 0;
            this.tiles[y][x + 1] = 0;
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
            color: '#fff',
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
