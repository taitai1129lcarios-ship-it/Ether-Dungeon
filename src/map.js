import { getCachedImage } from './utils.js';
import { RoomPlacer } from './map/RoomPlacer.js';
import { RoomConnector } from './map/RoomConnector.js';
import { MapPathfinder } from './map/MapPathfinder.js';
import { MapRenderer } from './map/MapRenderer.js';

export class Map {
    constructor(width, height, tileSize) {
        this.width = width;
        this.height = height;
        this.pixelWidth = width * tileSize;
        this.pixelHeight = height * tileSize;
        this.tileSize = tileSize;
        this.tiles = [];
        this.rooms = [];
        this.roomGrid = [];
        this.wallImage = getCachedImage('assets/wall.png');
        this.stairsImage = getCachedImage('assets/portal_stairs.png');

        // Initialize modules
        this.pathfinder = new MapPathfinder(this);
        this.placer = new RoomPlacer(this);
        this.renderer = new MapRenderer(this);
        this.connector = new RoomConnector(this);
    }

    generate() {
        let attempts = 0;
        const maxAttempts = 50;
        let success = false;
        let connectivityResult = { success: false, unreachable: [] };

        do {
            attempts++;
            if (attempts > 1) console.log(`Regenerating dungeon (Attempt ${attempts})...`);

            this.tiles = [];
            this.roomGrid = [];
            for (let y = 0; y < this.height; y++) {
                this.tiles[y] = [];
                this.roomGrid[y] = [];
                for (let x = 0; x < this.width; x++) {
                    this.tiles[y][x] = 1; // 1 = Wall
                    this.roomGrid[y][x] = -1; // -1 = No Room
                }
            }
            this.rooms = [];

            // 0. Place Central Startup Room (8x8, Center of Map)
            const centerX = Math.floor(this.width / 2) - 4;
            const centerY = Math.floor(this.height / 2) - 4;
            const startRoom = {
                x: centerX, y: centerY, w: 8, h: 8,
                type: 'start',
                connectors: [],
                id: 0,
                shape: 'square'
            };
            this.placer.carveRoom(startRoom);
            // Add 4 connectors (Middle of each side)
            startRoom.connectors.push({ x: centerX + 3, y: centerY, dir: { x: 0, y: -1 }, used: false });
            startRoom.connectors.push({ x: centerX + 4, y: centerY, dir: { x: 0, y: -1 }, used: false });
            startRoom.connectors.push({ x: centerX + 3, y: centerY + 7, dir: { x: 0, y: 1 }, used: false });
            startRoom.connectors.push({ x: centerX + 4, y: centerY + 7, dir: { x: 0, y: 1 }, used: false });
            startRoom.connectors.push({ x: centerX, y: centerY + 3, dir: { x: -1, y: 0 }, used: false });
            startRoom.connectors.push({ x: centerX, y: centerY + 4, dir: { x: -1, y: 0 }, used: false });
            startRoom.connectors.push({ x: centerX + 7, y: centerY + 3, dir: { x: 1, y: 0 }, used: false });
            startRoom.connectors.push({ x: centerX + 7, y: centerY + 4, dir: { x: 1, y: 0 }, used: false });
            this.rooms.push(startRoom);

            // 1. Random Rooms
            const targetRooms = 15;
            const attemptLimit = 200;
            const SHAPES = [
                'square', 'square', 'square',
                'island', 'island', 'island',
                'L', 'L',
                'cross',
                'U',
                'T',
            ];

            for (let i = 0; i < attemptLimit && this.rooms.length < targetRooms; i++) {
                const w = Math.floor(Math.random() * 8) + 10;
                const h = Math.floor(Math.random() * 8) + 10;
                const entrances = Math.floor(Math.random() * 2) + 1;
                const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

                this.placer.placeRoom({
                    w: w, h: h,
                    type: 'normal',
                    entranceCount: entrances,
                    shape: shape
                });
            }

            // 2. Special Rooms
            this.placer.placeRoom({ w: 8, h: 8, type: 'treasure', entranceCount: 1 });
            this.placer.placeRoom({ w: 10, h: 10, type: 'staircase', entranceCount: 1 });
            this.placer.placeRoom({ w: 6, h: 6, type: 'statue', entranceCount: 1 });
            this.placer.placeRoom({ w: 6, h: 6, type: 'altar', entranceCount: 1 });
            this.placer.placeRoom({ w: 8, h: 8, type: 'shop', entranceCount: 1 });

            // 3. Connectivity
            this.connector.connectRooms();

            connectivityResult = this.connector.checkConnectivity();
            if (!connectivityResult.success) {
                this.connector.forceConnectivity(connectivityResult.unreachable);
                connectivityResult = this.connector.checkConnectivity();
            }

            if (connectivityResult.success) success = true;

        } while (!success && attempts < maxAttempts);

        if (!success) {
            console.error("Dungeon generation failed to ensure connectivity after max attempts.");
        }
    }

    generateTraining() {
        this.width = 40;
        this.height = 40;
        this.tiles = [];
        this.roomGrid = [];
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            this.roomGrid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = 1;
                this.roomGrid[y][x] = -1;
            }
        }
        this.rooms = [];
        const centerX = 15;
        const centerY = 15;
        const w = 10;
        const h = 10;
        const room = {
            x: centerX, y: centerY, w: w, h: h,
            type: 'training',
            id: 0,
            cleared: true,
            active: true,
            connectors: [],
            shape: 'square'
        };

        // Use the placer logic to ensure consistency
        this.placer.carveRoom(room);
        this.rooms.push(room);
    }

    isValid(x, y) {
        return x >= 1 && x < this.width - 1 && y >= 1 && y < this.height - 1;
    }

    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    isWall(x, y) {
        const tx = Math.floor(x / this.tileSize);
        const ty = Math.floor(y / this.tileSize);
        return this.isWallAtTile(tx, ty);
    }

    isWallAtTile(tx, ty) {
        if (!this.isValid(tx, ty)) return true;
        return this.tiles[ty][tx] === 1;
    }

    closeRoom(room) {
        if (!room) return;
        for (let c of room.connectors) {
            this.tiles[c.y][c.x] = 2; // Locked door
            const neighbors = [
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
                { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 }
            ];
            for (let n of neighbors) {
                const nx = c.x + n.dx;
                const ny = c.y + n.dy;
                if (this.isValid(nx, ny) && this.roomGrid[ny][nx] === -1 && this.tiles[ny][nx] === 0) {
                    this.tiles[ny][nx] = 2; // Lockdown
                }
            }
        }
    }

    openRoom(room) {
        if (!room) return;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.tiles[y][x] === 2) {
                    this.tiles[y][x] = 0;
                }
            }
        }
    }

    isTileNearConnector(x, y, room) {
        for (let c of room.connectors) {
            if (Math.abs(x - c.x) <= 2 && Math.abs(y - c.y) <= 2) return true;
        }
        return false;
    }

    draw(ctx, camera, player, debugMode = false) {
        this.renderer.draw(ctx, camera, player, debugMode);
    }
}
