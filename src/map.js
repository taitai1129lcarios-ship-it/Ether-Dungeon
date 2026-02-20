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
        this.floorImage = getCachedImage('assets/floor.png');
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
            // Add 4 connectors (Center of each side, index 3 expands to 3-4 for 2-tile width)
            startRoom.connectors.push({ x: centerX + 3, y: centerY, dir: { x: 0, y: -1 }, used: false });
            startRoom.connectors.push({ x: centerX + 3, y: centerY + 7, dir: { x: 0, y: 1 }, used: false });
            startRoom.connectors.push({ x: centerX, y: centerY + 3, dir: { x: -1, y: 0 }, used: false });
            startRoom.connectors.push({ x: centerX + 7, y: centerY + 3, dir: { x: 1, y: 0 }, used: false });
            this.rooms.push(startRoom);

            // 1. Critical Rooms - Staircase
            let staircasePlaced = this.placer.placeRoom({ w: 6, h: 6, type: 'staircase', entranceCount: 1 });

            // 2. Random Rooms
            const targetRooms = 20;
            const attemptLimit = 300;
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
                const entrances = Math.floor(Math.random() * 2) + 2;
                const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

                this.placer.placeRoom({
                    w: w, h: h,
                    type: 'normal',
                    entranceCount: entrances,
                    shape: shape
                });
            }

            // 3. Special Rooms
            this.placer.placeRoom({ w: 8, h: 8, type: 'treasure', entranceCount: 1 });
            // Staircase already placed
            this.placer.placeRoom({ w: 6, h: 6, type: 'statue', entranceCount: 1 });
            this.placer.placeRoom({ w: 6, h: 6, type: 'altar', entranceCount: 1 });
            this.placer.placeRoom({ w: 8, h: 8, type: 'shop', entranceCount: 1 });

            // 4. Connectivity
            this.connector.connectRooms();

            connectivityResult = this.connector.checkConnectivity();
            if (!connectivityResult.success) {
                this.connector.forceConnectivity(connectivityResult.unreachable);
                connectivityResult = this.connector.checkConnectivity();
            }

            // 5. Convert dead-end normal rooms into extra treasure rooms
            // (Removed as per user request to make dead-ends combat rooms)

            if (connectivityResult.success && staircasePlaced) success = true;

            if (attempts >= maxAttempts && !success) {
                console.error("Dungeon generation failed to ensure connectivity or staircase placement.");
                // Return or handle failure? The loop will exit anyway.
            }
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
        return this.tiles[ty][tx] === 1 || this.tiles[ty][tx] === 2;
    }

    closeRoom(room) {
        if (!room) return;
        for (let c of room.connectors) {
            if (!c.used) continue; // Only block corridors that are actually connected
            // For N/S connectors (dir.x===0): block (x,y) and (x+1,y) — horizontal pair
            // For E/W connectors (dir.x!==0): block (x,y) and (x,y+1) — vertical pair
            this.tiles[c.y][c.x] = 2; // Locked door

            if (c.dir.x === 0) {
                // Corridor flows north/south → entrance is side-by-side horizontally
                if (this.isValid(c.x + 1, c.y)) this.tiles[c.y][c.x + 1] = 2;
            } else {
                // Corridor flows east/west → entrance is stacked vertically
                if (this.isValid(c.x, c.y + 1)) this.tiles[c.y + 1][c.x] = 2;
            }
        }
    }

    openRoom(room) {
        if (!room) return;
        for (let c of room.connectors) {
            if (!c.used) continue; // Only restore tiles that were actually locked
            // Restore only the tiles that were locked by closeRoom
            if (this.isValid(c.x, c.y) && this.tiles[c.y][c.x] === 2) {
                this.tiles[c.y][c.x] = 0;
            }
            if (c.dir.x === 0) {
                if (this.isValid(c.x + 1, c.y) && this.tiles[c.y][c.x + 1] === 2) {
                    this.tiles[c.y][c.x + 1] = 0;
                }
            } else {
                if (this.isValid(c.x, c.y + 1) && this.tiles[c.y + 1][c.x] === 2) {
                    this.tiles[c.y + 1][c.x] = 0;
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
