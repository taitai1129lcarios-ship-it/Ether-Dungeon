export class InputHandler {
    constructor() {
        this.keys = {};
        this.pressed = {}; // For single frame press
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') e.preventDefault();
            if (!this.keys[e.code]) {
                this.pressed[e.code] = true;
            }
            this.keys[e.code] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                if (!this.keys['Click']) this.pressed['Click'] = true;
                this.keys['Click'] = true;
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.keys['Click'] = false;
        });
    }
    isDown(key) { return this.keys[key]; }
    isPressed(key) { return this.pressed[key]; }
    update() { this.pressed = {}; }
}

export class Camera {
    constructor(width, height, mapWidth, mapHeight) {
        this.width = width;
        this.height = height;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.x = 0;
        this.y = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
    }

    shake(duration, intensity) {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
    }

    follow(target, dt) {
        let targetX = target.x + target.width / 2 - this.width / 2;
        let targetY = target.y + target.height / 2 - this.height / 2;

        if (dt) {
            const factor = 5 * dt; // Smoothing factor
            this.x += (targetX - this.x) * factor;
            this.y += (targetY - this.y) * factor;
        } else {
            this.x = targetX;
            this.y = targetY;
        }

        // Apply Shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            const offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.x += offsetX;
            this.y += offsetY;
        }

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
        let attempts = 0;
        const maxAttempts = 50; // Increased from 10 to 50 for robustness
        let success = false;
        let connectivityResult = { success: false, unreachable: [] };

        do {
            attempts++;
            if (attempts > 1) console.log(`Regenerating dungeon (Attempt ${attempts})...`);

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

            // 0. Place Central Startup Room (8x8, Center of Map)
            const centerX = Math.floor(this.width / 2) - 4;
            const centerY = Math.floor(this.height / 2) - 4;
            const startRoom = {
                x: centerX, y: centerY, w: 8, h: 8,
                type: 'start',
                connectors: [],
                id: 0
            };
            this.carveRoom(startRoom);
            // Add 4 connectors (Middle of each side)
            // Top
            startRoom.connectors.push({ x: centerX + 3, y: centerY, dir: { x: 0, y: -1 }, used: false });
            // Bottom
            startRoom.connectors.push({ x: centerX + 3, y: centerY + 7, dir: { x: 0, y: 1 }, used: false });
            // Left
            startRoom.connectors.push({ x: centerX, y: centerY + 3, dir: { x: -1, y: 0 }, used: false });
            // Right
            startRoom.connectors.push({ x: centerX + 7, y: centerY + 3, dir: { x: 1, y: 0 }, used: false });

            this.rooms.push(startRoom);


            // 1. Place Preset Rooms
            this.placeRoom({
                w: 7, h: 7,
                type: 'treasure',
                entranceCount: 1
            });

            // 2. Place Staircase Room (6x6, 1 Entrance)
            this.placeRoom({
                w: 6, h: 6,
                type: 'staircase',
                entranceCount: 1
            });

            // 3. Place Random Rooms
            const attemptLimit = 100;
            const targetRooms = 15;

            for (let i = 0; i < attemptLimit && this.rooms.length < targetRooms; i++) {
                const w = Math.floor(Math.random() * 8) + 8; // 8 to 15
                const h = Math.floor(Math.random() * 8) + 8; // 8 to 15

                const sizeFactor = (w * h) / 100;
                const entrances = Math.max(1, Math.min(4, Math.ceil(sizeFactor * 2)));

                this.placeRoom({
                    w: w, h: h,
                    type: 'normal',
                    entranceCount: entrances
                });
            }

            // 4. Connect Connectors using Robust Pathfinding
            this.connectRooms();

            // 4b. Cleanup Unused Connectors (Fixes "Buried Entrances")
            for (let room of this.rooms) {
                room.connectors = room.connectors.filter(c => c.used);
            }

            // 5. Finalize Typesrify Connectivity
            connectivityResult = this.checkConnectivity();
            success = connectivityResult.success;

        } while (!success && attempts < maxAttempts);

        if (!success) {
            console.error("Failed to generate connected dungeon after " + maxAttempts + " attempts. Forcing connectivity...");
            // FORCE CONNECTIVITY
            this.forceConnectivity(connectivityResult.unreachable);
            // Final verify check?
            if (this.checkConnectivity().success) {
                console.log("Forced connectivity successful.");
            } else {
                console.error("Critical Failure: Even forced connectivity failed.");
            }
        } else {
            console.log("Dungeon generated successfully on attempt " + attempts);
        }

    }

    checkConnectivity() {
        if (this.rooms.length === 0) return { success: false, unreachable: [] };

        const startRoom = this.rooms[0]; // Start room is always index 0
        const startX = startRoom.x + Math.floor(startRoom.w / 2);
        const startY = startRoom.y + Math.floor(startRoom.h / 2);

        // BFS Flood Fill
        const queue = [{ x: startX, y: startY }];
        const visited = new Set();
        visited.add(`${startX},${startY}`);

        let visitedCount = 0;

        while (queue.length > 0) {
            const current = queue.shift();
            visitedCount++;

            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];

            for (let n of neighbors) {
                if (n.x < 0 || n.x >= this.width || n.y < 0 || n.y >= this.height) continue;

                // Allow walking on Floor (0) and Doors (2)
                const tile = this.tiles[n.y][n.x];
                if (tile !== 0 && tile !== 2) continue;

                const key = `${n.x},${n.y}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(n);
                }
            }
        }

        // Verify all rooms are reached
        const unreachable = [];
        for (let room of this.rooms) {
            const cx = room.x + Math.floor(room.w / 2);
            const cy = room.y + Math.floor(room.h / 2);
            if (!visited.has(`${cx},${cy}`)) {
                // console.log(`Room ${room.id} is unreachable.`);
                unreachable.push(room);
            }
        }

        if (unreachable.length > 0) {
            return { success: false, unreachable: unreachable };
        }

        return { success: true, unreachable: [] };
    }

    forceConnectivity(unreachableRooms) {
        if (!unreachableRooms || unreachableRooms.length === 0) return;

        console.log(`Forcing connections for ${unreachableRooms.length} rooms to nearest paths...`);

        // 1. Map all currently accessible tiles (The "Main Chunk")
        const startRoom = this.rooms[0];
        const startX = startRoom.x + Math.floor(startRoom.w / 2);
        const startY = startRoom.y + Math.floor(startRoom.h / 2);

        const queue = [{ x: startX, y: startY }];
        const visited = new Set();
        visited.add(`${startX},${startY}`);

        // We store accessible tiles as objects for easy distance calc
        const accessibleTiles = [{ x: startX, y: startY }];

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];

            for (let n of neighbors) {
                if (n.x < 0 || n.x >= this.width || n.y < 0 || n.y >= this.height) continue;
                // Walkable?
                const tile = this.tiles[n.y][n.x];
                if (tile !== 0 && tile !== 2) continue;

                const key = `${n.x},${n.y}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(n);
                    accessibleTiles.push(n);
                }
            }
        }

        // 2. Connect each unreachable room to the NEAREST accessible tile
        for (let room of unreachableRooms) {
            const cx = room.x + Math.floor(room.w / 2);
            const cy = room.y + Math.floor(room.h / 2);

            let bestTile = null;
            let minDst = Infinity;

            for (let tile of accessibleTiles) {
                const dst = Math.abs(cx - tile.x) + Math.abs(cy - tile.y);
                if (dst < minDst) {
                    minDst = dst;
                    bestTile = tile;
                }
            }

            if (bestTile) {
                // Dig L-shaped tunnel from (cx, cy) to bestTile
                const tx = bestTile.x;
                const ty = bestTile.y;

                // Horizontal match first or Vertical? Randomize for variety or stick to simple?
                // Simple L-shape

                // Horizontal Part
                const xDir = tx > cx ? 1 : -1;
                for (let x = cx; x !== tx; x += xDir) {
                    this.tiles[cy][x] = 0;
                    this.tiles[cy + 1][x] = 0; // Widen
                }
                // Vertical Part
                const yDir = ty > cy ? 1 : -1;
                for (let y = cy; y !== ty; y += yDir) {
                    this.tiles[y][tx] = 0;
                    this.tiles[y][tx + 1] = 0; // Widen
                }

                // Ensure intersection/corners are clear
                this.tiles[cy][tx] = 0;
                this.tiles[cy + 1][tx] = 0;
                this.tiles[cy][tx + 1] = 0;
                this.tiles[cy + 1][tx + 1] = 0;

                // Note: We don't update accessibleTiles here. 
                // Connecting to the ORIGINAL main chunk ensures we don't accidentally link to another isolated island 
                // (though logic implies we only link to Main Chunk, so it should be fine).
                // Main Chunk is valid.
            }
        }
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

            // Check overlap with existing rooms (buffer of 6 for wider spacing)
            let failed = false;
            for (let other of this.rooms) {
                if (newRoom.x - 6 <= other.x + other.w && newRoom.x + newRoom.w + 6 >= other.x &&
                    newRoom.y - 6 <= other.y + other.h && newRoom.y + newRoom.h + 6 >= other.y) {
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

        // Initialize State
        // Start room is safe
        if (room.type === 'start') {
            room.cleared = true;
        } else if (room.type === 'treasure') {
            // Treasure room usually safe
            room.cleared = true;
        } else if (room.type === 'staircase') {
            // Stairs room safe
            room.cleared = true;
        } else {
            // Normal rooms have enemies
            room.cleared = false;
        }
        room.active = false;

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
        for (let x = room.x + 2; x < room.x + room.w - 3; x++) possible.push({ x: x, y: room.y, dir: { x: 0, y: -1 }, used: false });
        // Bottom Wall (x, room.y + h -1) - Dir Down
        for (let x = room.x + 2; x < room.x + room.w - 3; x++) possible.push({ x: x, y: room.y + room.h - 1, dir: { x: 0, y: 1 }, used: false });
        // Left Wall (room.x, y) - Dir Left
        for (let y = room.y + 2; y < room.y + room.h - 3; y++) possible.push({ x: room.x, y: y, dir: { x: -1, y: 0 }, used: false });
        // Right Wall (room.x + w -1, y) - Dir Right
        for (let y = room.y + 2; y < room.y + room.h - 3; y++) possible.push({ x: room.x + room.w - 1, y: y, dir: { x: 1, y: 0 }, used: false });

        possible.sort(() => Math.random() - 0.5);

        let added = 0;
        for (let i = 0; i < possible.length && added < count; i++) {
            const c = possible[i];

            // PROXIMITY CHECK: Ensure at least 4 tiles away from existing connectors
            let tooClose = false;
            for (let existing of room.connectors) {
                const dist = Math.abs(c.x - existing.x) + Math.abs(c.y - existing.y);
                if (dist < 4) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            room.connectors.push(c);
            added++;
        }
    }

    connectRooms() {
        const connectedPairs = new Set();
        const getPairId = (r1, r2) => {
            const id1 = Math.min(r1.id, r2.id);
            const id2 = Math.max(r1.id, r2.id);
            return `${id1}-${id2}`;
        };

        // 0. (Removed) Connect Central Room (Start Room) separately
        // The "Last Pass" below ensures all unused connectors, including Start Room's, are connected.


        // Connect Room I to Room I+1 (Standard Chain to ensure overall connectivity)
        for (let i = 0; i < this.rooms.length - 1; i++) {
            const r1 = this.rooms[i];
            const r2 = this.rooms[i + 1];

            const pairId = getPairId(r1, r2);
            if (!connectedPairs.has(pairId)) {
                this.connectTwoRooms(r1, r2);
                connectedPairs.add(pairId);
            }
        }

        // Random loops (Reduced chance 0.3 -> 0.1)
        for (let i = 0; i < this.rooms.length; i++) {
            if (Math.random() < 0.1) {
                const rA = this.rooms[i];
                const rB = this.rooms[Math.floor(Math.random() * this.rooms.length)];
                if (rA !== rB) {
                    const pairId = getPairId(rA, rB);
                    if (!connectedPairs.has(pairId)) {
                        this.connectTwoRooms(rA, rB);
                        connectedPairs.add(pairId);
                    }
                }
            }
        }

        // Last Pass: Ensure ALL unused connectors have a path
        for (let room of this.rooms) {
            for (let c of room.connectors) {
                if (!c.used) {
                    // Try to connect to the nearest room first (Standard attempt)
                    let bestRoom = null;
                    let minDistance = Infinity;

                    for (let other of this.rooms) {
                        if (room === other) continue;

                        const dist = Math.abs(room.x - other.x) + Math.abs(room.y - other.y);
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestRoom = other;
                        }
                    }

                    if (bestRoom) {
                        this.connectTwoRooms(room, bestRoom, c);
                    }

                    // If STILL unused (Standard failed), FORCE IT
                    if (!c.used) {
                        this.forceConnectConnector(room, c);
                    }
                }
            }
        }
    }

    forceConnectConnector(room, connector) {
        // --- 1. RAYCAST STRATEGY (Prioritize Straight Lines) ---
        // INCREASED Distance to 20
        const rayDist = 20;
        let targetDist = -1;
        let hitType = null; // 'room' or 'path'

        // Scan ahead
        for (let d = 1; d <= rayDist; d++) {
            const tx = connector.x + connector.dir.x * d;
            const ty = connector.y + connector.dir.y * d;

            if (tx <= 0 || tx >= this.width - 1 || ty <= 0 || ty >= this.height - 1) break;

            const rId = this.roomGrid[ty][tx];
            const tile = this.tiles[ty][tx];

            // Check for Room Hit
            if (rId !== -1 && rId !== room.id) {
                // Ignore Room Hits for straight connections
                break;
            }

            // Check for Path Hit
            if (tile === 0 || tile === 2) {
                // DENSITY CHECK: Is this a "whisker" or a real path?
                // Count floor/room tiles in 3x3 area
                let density = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (this.isValid(tx + dx, ty + dy)) {
                            const t = this.tiles[ty + dy][tx + dx];
                            const r = this.roomGrid[ty + dy][tx + dx];
                            if (t === 0 || t === 2 || r !== -1) {
                                density++;
                            }
                        }
                    }
                }

                if (density >= 5) {
                    targetDist = d;
                    hitType = 'path';
                    break;
                } else {
                    // Hit a whisker? Stop raycast, but don't set target.
                    // Actually, if we hit a whisker, we are blocked. 
                    // We can't go THROUGH it. So we must stop.
                    // But we won't use it as a target.
                    break;
                }
            }
        }

        if (targetDist !== -1) {
            // Validate Safety of Straight Path (Buffer Check)
            let safe = true;
            for (let d = 1; d <= targetDist; d++) {
                const tx = connector.x + connector.dir.x * d;
                const ty = connector.y + connector.dir.y * d;

                // Check neighborhood for OTHER rooms
                // RELAXED: 1-tile buffer for 2-wide path.
                // Path occupies (x,y) and (x+1, y) OR (x, y+1)
                // So checking [x-1, x+2] and [y-1, y+2] covers all immediate adjacencies.
                for (let by = ty - 1; by <= ty + 2; by++) {
                    for (let bx = tx - 1; bx <= tx + 2; bx++) {
                        if (!this.isValid(bx, by)) continue;
                        const rId = this.roomGrid[by][bx];

                        // Ignore the room we started from
                        if (rId === room.id) continue;

                        if (rId !== -1) {
                            // If we hit a room, and it's NOT the start room.
                            // We allow hitting the TARGET room at the end.
                            // But we shouldn't graze a THIRD room in the middle.

                            // Heuristic: If d is close to targetDist, we assume it's the target room.
                            // margin of 2 tiles.
                            if (d < targetDist - 2) {
                                safe = false;
                                break;
                            }
                        }
                    }
                    if (!safe) break;
                }
                if (!safe) break;
            }

            if (safe) {
                // DIG STRAIGHT and RETURN
                connector.used = true;

                // Dig Connector
                this.tiles[connector.y][connector.x] = 0;
                // Widen Connector
                if (connector.dir.x === 0) {
                    if (this.isValid(connector.x + 1, connector.y)) {
                        const rId = this.roomGrid[connector.y][connector.x + 1];
                        if (rId === -1 || rId === room.id) this.tiles[connector.y][connector.x + 1] = 0;
                    }
                } else {
                    if (this.isValid(connector.x, connector.y + 1)) {
                        const rId = this.roomGrid[connector.y + 1][connector.x];
                        if (rId === -1 || rId === room.id) this.tiles[connector.y + 1][connector.x] = 0;
                    }
                }

                // Dig Tunnel
                let cx = connector.x;
                let cy = connector.y;
                for (let d = 0; d < targetDist; d++) {
                    cx += connector.dir.x;
                    cy += connector.dir.y;
                    this.tiles[cy][cx] = 0;

                    // Widen (Right/Bottom)
                    if (connector.dir.x === 0) {
                        if (this.isValid(cx + 1, cy)) {
                            const rId = this.roomGrid[cy][cx + 1];
                            if (rId === -1 || rId === room.id || (d >= targetDist - 1)) this.tiles[cy][cx + 1] = 0;
                        }
                    } else {
                        if (this.isValid(cx, cy + 1)) {
                            const rId = this.roomGrid[cy + 1][cx];
                            if (rId === -1 || rId === room.id || (d >= targetDist - 1)) this.tiles[cy + 1][cx] = 0;
                        }
                    }
                }
                return; // DONE
            }
        }

        // --- 2. FALLBACK: ORIGINAL ROBUST PATH STRATEGY ---
        // Find nearest floor tile that is NOT part of this room
        let bestTile = null;
        let minDst = Infinity;


        if (bestTile) {
            // 1. Calculate Geometry (Don't dig yet)
            const leadDist = 3;
            let currentX = connector.x;
            let currentY = connector.y;

            // Simulate lead end position
            let validLead = true;
            for (let i = 0; i < leadDist; i++) {
                const nextX = currentX + connector.dir.x;
                const nextY = currentY + connector.dir.y;
                if (nextX > 0 && nextX < this.width - 1 && nextY > 0 && nextY < this.height - 1) {
                    currentX = nextX;
                    currentY = nextY;
                } else {
                    validLead = false;
                    break;
                }
            }

            if (!validLead) return; // Cannot even extend lead? Abort.

            // 2. Find Robust Path from Lead End to Target
            const startNode = { x: currentX, y: currentY };
            const path = this.findRobustPath(startNode, bestTile, room.id);

            // 3. IF PATH FOUND, DIG EVERYTHING
            if (path) {
                connector.used = true;

                // 3a. Dig Connector
                this.tiles[connector.y][connector.x] = 0;
                // Widen Connector
                if (connector.dir.x === 0) {
                    if (this.isValid(connector.x + 1, connector.y)) {
                        const rId = this.roomGrid[connector.y][connector.x + 1];
                        if (rId === -1 || rId === room.id) this.tiles[connector.y][connector.x + 1] = 0;
                    }
                } else {
                    if (this.isValid(connector.x, connector.y + 1)) {
                        const rId = this.roomGrid[connector.y + 1][connector.x];
                        if (rId === -1 || rId === room.id) this.tiles[connector.y + 1][connector.x] = 0;
                    }
                }

                // 3b. Dig Lead
                let lx = connector.x;
                let ly = connector.y;
                for (let i = 0; i < leadDist; i++) {
                    lx += connector.dir.x;
                    ly += connector.dir.y;
                    this.tiles[ly][lx] = 0;
                    // Widen Lead
                    if (connector.dir.x === 0) {
                        if (this.isValid(lx + 1, ly)) {
                            const rId = this.roomGrid[ly][lx + 1];
                            if (rId === -1 || rId === room.id) this.tiles[ly][lx + 1] = 0;
                        }
                    } else {
                        if (this.isValid(lx, ly + 1)) {
                            const rId = this.roomGrid[ly + 1][lx];
                            if (rId === -1 || rId === room.id) this.tiles[ly + 1][lx] = 0;
                        }
                    }
                }

                // 3c. Dig Path
                for (let node of path) {
                    this.tiles[node.y][node.x] = 0;
                    // Widen 2-wide (Right/Bottom)
                    if (this.isValid(node.x + 1, node.y)) {
                        const rId = this.roomGrid[node.y][node.x + 1];
                        if (rId === -1 || rId === room.id) this.tiles[node.y][node.x + 1] = 0;
                    }
                    if (this.isValid(node.x, node.y + 1)) {
                        const rId = this.roomGrid[node.y + 1][node.x];
                        if (rId === -1 || rId === room.id) this.tiles[node.y + 1][node.x] = 0;
                    }
                    if (this.isValid(node.x + 1, node.y + 1)) {
                        const rId = this.roomGrid[node.y + 1][node.x + 1];
                        if (rId === -1 || rId === room.id) this.tiles[node.y + 1][node.x + 1] = 0;
                    }
                }
            }
            // ELSE: Path not found -> Do NOT dig. Connector remains closed.
        }
    }

    findRobustPath(start, end, roomId) {
        const open = [start];
        const cameFrom = {};
        const gScore = {};
        gScore[`${start.x},${start.y}`] = 0;
        const fScore = {};
        fScore[`${start.x},${start.y}`] = Math.abs(start.x - end.x) + Math.abs(start.y - end.y);

        const id = (n) => `${n.x},${n.y}`;
        const visited = new Set();
        let iterations = 0;

        while (open.length > 0) {
            iterations++;
            if (iterations > 5000) return null; // Safety

            open.sort((a, b) => (fScore[id(a)] || Infinity) - (fScore[id(b)] || Infinity));
            const current = open.shift();
            visited.add(id(current));

            if (Math.abs(current.x - end.x) <= 1 && Math.abs(current.y - end.y) <= 1) {
                const path = [current];
                let curr = current;
                while (cameFrom[id(curr)]) {
                    curr = cameFrom[id(curr)];
                    path.unshift(curr);
                }
                return path;
            }

            const neighbors = [
                { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 }
            ];

            for (let next of neighbors) {
                if (!this.isValid(next.x, next.y) || visited.has(id(next))) continue;

                let blocked = false;
                let penalty = 0;

                // 1. STRICT ROOM BUFFER CHECK (2-tile radius)
                // We verify that the 2x2 path generated by 'next' is far from any room.
                // Scan [x-2, x+3] x [y-2, y+3]
                for (let by = next.y - 2; by <= next.y + 3; by++) {
                    for (let bx = next.x - 2; bx <= next.x + 3; bx++) {
                        if (!this.isValid(bx, by)) continue;
                        const rId = this.roomGrid[by][bx];
                        // If it's a room (and not OUR room), block it.
                        if (rId !== -1 && rId !== roomId) {
                            blocked = true; break;
                        }
                    }
                    if (blocked) break;
                }
                if (blocked) continue;

                // 2. PARALLEL PATH CHECK (Prevent 3-wide)
                // If moving into WALL...
                if (this.tiles[next.y][next.x] !== 0) {
                    const checkNeighbors = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
                    let adjacentToFloor = false;
                    for (let o of checkNeighbors) {
                        const nx = next.x + o.dx;
                        const ny = next.y + o.dy;
                        if (this.isValid(nx, ny) && this.tiles[ny][nx] === 0) {
                            adjacentToFloor = true; break;
                        }
                    }
                    // Relax near target
                    const distToEnd = Math.abs(next.x - end.x) + Math.abs(next.y - end.y);
                    if (adjacentToFloor && distToEnd > 3) {
                        penalty += 1000; // Strong penalty
                    }
                }

                const tentativeG = (gScore[id(current)] || Infinity) + 1 + penalty;
                if (tentativeG < (gScore[id(next)] || Infinity)) {
                    cameFrom[id(next)] = current;
                    gScore[id(next)] = tentativeG;
                    fScore[id(next)] = tentativeG + Math.abs(next.x - end.x) + Math.abs(next.y - end.y);
                    if (!open.some(n => n.x === next.x && n.y === next.y)) open.push(next);
                }
            }
        }
        return null; // Failed to find path
    }

    connectTwoRooms(r1, r2, forceStartConnector = null) {
        let bestPair = null;
        let minScore = Infinity; // Lower is better

        const startConnectors = forceStartConnector ? [forceStartConnector] : r1.connectors;

        // Find best connector pair: Prioritize ALIGNMENT first, then distance
        for (let c1 of startConnectors) {
            for (let c2 of r2.connectors) {
                const dist = Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y);

                let score = dist;

                // Alignment Bonus (actually penalty reduction)
                // If aligned on X or Y, significantly reduce score to prefer it
                const aligned = (c1.x === c2.x || c1.y === c2.y);
                if (aligned) {
                    score -= 50; // Huge preference for straight lines
                }

                if (score < minScore) {
                    minScore = score;
                    bestPair = { start: c1, end: c2 };
                }
            }
        }

        if (bestPair) {
            // Find path - Attempt 1: Strict (No Hugging)
            let path = this.findPath(bestPair.start, bestPair.end, r1, r2, false);

            // Find path - Attempt 2: Relaxed (Allow Hugging) if failed
            if (!path) {
                // Only log if it's a primary attempt, not cleanup
                // console.log(`Retrying connection ${r1.id}<->${r2.id} with relaxed constraints`);
                path = this.findPath(bestPair.start, bestPair.end, r1, r2, true);
            }

            if (path) {
                this.drawPath(path);
                bestPair.start.used = true;
                bestPair.end.used = true;
            } else {
                // console.warn(`Failed to connect Room ${r1.id} and Room ${r2.id}`);
            }
        }
    }

    findPath(start, end, startRoom, endRoom) {
        // Enforce straight entry/exit by offsetting start/end nodes
        const leadDist = 3; // Distance to move straight out

        // Helper to generate straight segment
        const getLead = (node, dist) => {
            const path = [];
            for (let i = 1; i <= dist; i++) {
                path.push({ x: node.x + node.dir.x * i, y: node.y + node.dir.y * i });
            }
            return path;
        };

        const startLead = getLead(start, leadDist);
        const endLead = getLead(end, leadDist);

        const realStart = startLead[startLead.length - 1];
        const realEnd = endLead[endLead.length - 1];

        // Bounds check for real start/end
        if (!this.isValid(realStart.x, realStart.y)) realStart.x = start.x;
        if (!this.isValid(realEnd.x, realEnd.y)) realEnd.x = end.x;

        // A* Algorithm from realStart to realEnd
        const open = [realStart];
        const cameFrom = {};
        const gScore = {};
        gScore[`${realStart.x},${realStart.y}`] = 0;

        const fScore = {};
        fScore[`${realStart.x},${realStart.y}`] = this.heuristic(realStart, realEnd);

        const id = (n) => `${n.x},${n.y}`;

        while (open.length > 0) {
            // Get lowest fScore
            open.sort((a, b) => (fScore[id(a)] || Infinity) - (fScore[id(b)] || Infinity));
            const current = open.shift();

            if (current.x === realEnd.x && current.y === realEnd.y) {
                // Reconstruct path and add leads
                let path = this.reconstructPath(cameFrom, current, realStart, realEnd);

                // Add start and end leads
                // Path is [start, ..., end]
                // We want [start(connector), startLead..., path..., endLead(reversed)..., end(connector)]

                // reconstructPath returns [realStart, ..., realEnd] (wait, check implementation)
                // My reconstructPath adds 'start' at the end and reverses? 
                // Currently: path.push(start); return path; (It builds backwards from end).
                // So result is [end, ..., start].

                // Let's adjust based on current reconstructPath:
                // It returns [end, ..., current, ..., start].
                // So it returns path from End to Start? 

                // Let's check reconstructPath implementation below..
                // It pushes current, then parent.. then pushes start.
                // It returns [end, ..., start] (reversed path).

                // So:
                // 1. Reverse the A* path to get [realStart -> realEnd]
                path.reverse();

                // 2. Prepend Start -> startLead
                const fullPath = [start, ...startLead];

                // 3. Add A* path (excluding realStart since it's in startLead?)
                // realStart is startLead[last]. 
                // path[0] is realStart.
                // Avoid duplicate?
                for (let i = 1; i < path.length; i++) fullPath.push(path[i]);

                // 4. Add EndLead (reversed) -> End
                // endLead is [end+1, end+2]. realEnd is end+2.
                // path[last] is realEnd.
                // We need road back to end.
                // endLead backwards: [end+1].
                for (let i = endLead.length - 2; i >= 0; i--) fullPath.push(endLead[i]);
                fullPath.push(end);

                return fullPath;
            }

            const neighbors = [
                { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 }
            ];

            for (let next of neighbors) {
                if (!this.isValid(next.x, next.y)) continue;

                // ---------------------------------------------------------
                // ENHANCED COLLISION CHECK: Room Buffer (4x4 check)
                // ---------------------------------------------------------
                // Check a 4x4 area covering the 2x2 path path AND a 1-tile border.
                // relative to next.x, next.y: dx from -1 to 2, dy from -1 to 2.
                let blocked = false;
                for (let dy = -1; dy <= 2; dy++) {
                    for (let dx = -1; dx <= 2; dx++) {
                        const ckX = next.x + dx;
                        const ckY = next.y + dy;

                        // If out of bounds, treat as wall (blocking? no, just ignore for room check)
                        if (ckX < 0 || ckX >= this.width || ckY < 0 || ckY >= this.height) continue;

                        const rId = this.roomGrid[ckY][ckX];
                        if (rId !== -1) {
                            let allowed = false;
                            // Allow overlapping room ONLY if it's start/end room AND we are close to connector
                            if (startRoom && rId === startRoom.id) {
                                // Increased tolerance because strict buffer hits room earlier
                                if (Math.abs(next.x - start.x) + Math.abs(next.y - start.y) <= 5) allowed = true;
                            } else if (endRoom && rId === endRoom.id) {
                                if (Math.abs(next.x - end.x) + Math.abs(next.y - end.y) <= 5) allowed = true;
                            }

                            if (!allowed) {
                                blocked = true;
                                break;
                            }
                        }
                    }
                    if (blocked) break;
                }
                if (blocked) continue;

                // Enforce 2-tile wall thickness (PREVENT THIN WALLS)
                let thicknessViolation = false;
                const nx = next.x;
                const ny = next.y;

                const getTile = (tx, ty) => {
                    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return 1;
                    return this.tiles[ty][tx];
                };

                // CHECK TOP (ny-1)
                if (getTile(nx, ny - 1) === 1 && getTile(nx, ny - 2) === 0) thicknessViolation = true;
                if (getTile(nx + 1, ny - 1) === 1 && getTile(nx + 1, ny - 2) === 0) thicknessViolation = true;

                // CHECK BOTTOM (ny+2)
                if (getTile(nx, ny + 2) === 1 && getTile(nx, ny + 3) === 0) thicknessViolation = true;
                if (getTile(nx + 1, ny + 2) === 1 && getTile(nx + 1, ny + 3) === 0) thicknessViolation = true;

                // CHECK LEFT (nx-1)
                if (getTile(nx - 1, ny) === 1 && getTile(nx - 2, ny) === 0) thicknessViolation = true;
                if (getTile(nx - 1, ny + 1) === 1 && getTile(nx - 2, ny + 1) === 0) thicknessViolation = true;

                // CHECK RIGHT (nx+2)
                if (getTile(nx + 2, ny) === 1 && getTile(nx + 3, ny) === 0) thicknessViolation = true;
                if (getTile(nx + 2, ny + 1) === 1 && getTile(nx + 3, ny + 1) === 0) thicknessViolation = true;

                // Calculate Cost
                let moveCost = 1;

                if (thicknessViolation) {
                    moveCost += 50;
                }

                // PARALLEL PATH PENALTY (Prevent merging with existing paths)
                // We are carving a 2x2 block at (nx, ny) -> (nx+1, ny+1).
                // Check the 8-tile boundary. If any are floor (and not our previous step), penalize.
                if (this.tiles[ny][nx] === 1) { // Only checks if we are digging new ground
                    let tooClose = false;
                    const boundaryOffsets = [
                        { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, // Top
                        { dx: 0, dy: 2 }, { dx: 1, dy: 2 },   // Bottom
                        { dx: -1, dy: 0 }, { dx: -1, dy: 1 }, // Left
                        { dx: 2, dy: 0 }, { dx: 2, dy: 1 },   // Right
                        // Diagonals (Corner Safety)
                        { dx: -1, dy: -1 }, // Top-Left
                        { dx: 2, dy: -1 },  // Top-Right
                        { dx: -1, dy: 2 },  // Bottom-Left
                        { dx: 2, dy: 2 }    // Bottom-Right
                    ];

                    for (let o of boundaryOffsets) {
                        const bx = nx + o.dx;
                        const by = ny + o.dy;

                        // Bounds check
                        if (bx < 0 || bx >= this.width || by < 0 || by >= this.height) continue;

                        // If it's a floor...
                        if (this.tiles[by][bx] === 0) {
                            // Check if it belongs to 'current' (where we came from)
                            // current occupies [current.x, current.x+1] x [current.y, current.y+1]
                            const isCurrent = (bx >= current.x && bx <= current.x + 1 &&
                                by >= current.y && by <= current.y + 1);

                            if (!isCurrent) {
                                tooClose = true;
                                break;
                            }
                        }
                    }

                    if (tooClose) {
                        // Hard Block to prevent clumping/blobs
                        // If we are too close to an existing path (that isn't ours), we cannot dig here.
                        // Exception: crossing (perpendicular)?
                        // If we block, we prevent crossing.
                        // To allow crossing, we could check if we are *entering* floor?
                        // But here we are at 'ny, nx' (Wall) checking neighbors.
                        // If we are strictly adjacent to floor, we are hugging.
                        // Let's try High Penalty first. If blobs persist, we Hard Block.
                        // Given the user report "Mari makutteru", let's use a dynamic penalty.
                        // Or just Hard Block.
                        // A Hard Block might make connectivity impossible if paths MUST cross.
                        // Let's stick to valid crossings:
                        // A crossing happens when we step ONTO floor.
                        // Here we are digging WALL.
                        // If we dig wall NEXT to floor, we are widening the existing floor to 3+.
                        // So blocking this prevents 3-wide paths.
                        // DOES IT PREVENT CROSSING?
                        // To cross, we must move from Wall -> Floor (or Floor -> Wall).
                        // If we move Wall -> Wall (digging) and are next to Floor, we create parallel.
                        // So yes, strictly blocking Digging Next To Floor IS correct to prevent clumps.
                        // It forces crossings to be direct entry (Wall -> Floor), not Wall(next to Floor) -> Floor.

                        continue; // Block this node
                    }
                }

                // Turn Logic
                const parent = cameFrom[id(current)];
                let prevDx = 0;
                let prevDy = 0;
                let turning = false;

                if (parent) {
                    prevDx = current.x - parent.x;
                    prevDy = current.y - parent.y;
                } else {
                    prevDx = start.dir.x;
                    prevDy = start.dir.y;
                }

                const nextDx = next.x - current.x;
                const nextDy = next.y - current.y;

                if (prevDx !== nextDx || prevDy !== nextDy) {
                    turning = true;
                    moveCost += 10; // Increased base turn penalty
                }

                // ZIGZAG PENALTY (Prevent 1-tile steps)
                // If we are turning NOW, check if we ALSO turned at 'parent'.
                if (turning && parent) {
                    const grandparent = cameFrom[id(parent)];
                    if (grandparent) {
                        const gpDx = parent.x - grandparent.x;
                        const gpDy = parent.y - grandparent.y;

                        // If previous move (grandparent -> parent) direction != current move (parent -> current) direction
                        // Then we turned at parent.
                        if (gpDx !== prevDx || gpDy !== prevDy) {
                            // We turned at parent, and we are turning at current.
                            // This implies the segment parent->current was length 1.
                            moveCost += 100; // MASSIVE penalty for staircasing
                        }
                    }
                }

                const tentativeG = gScore[id(current)] + moveCost;
                if (tentativeG < (gScore[id(next)] || Infinity)) {
                    cameFrom[id(next)] = current;
                    gScore[id(next)] = tentativeG;
                    fScore[id(next)] = tentativeG + this.heuristic(next, realEnd);
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
        let safety = 0;
        while (cameFrom[`${temp.x},${temp.y}`]) {
            temp = cameFrom[`${temp.x},${temp.y}`];
            path.push(temp);
            safety++;
            if (safety > 10000) {
                console.error("Pathfinding infinite loop detected!", start, end);
                break;
            }
        }
        path.push(start);
        return path;
    }

    drawPath(path) {
        if (!path || path.length < 2) return;

        // 1. Draw the basic path
        for (let p of path) {
            this.tiles[p.y][p.x] = 0;
            // Widen path: always clear right and bottom neighbors to ensure 2-width/height
            // This is a simple brush approach
            if (p.x + 1 < this.width) this.tiles[p.y][p.x + 1] = 0;
            if (p.y + 1 < this.height) this.tiles[p.y + 1][p.x] = 0;
            if (p.x + 1 < this.width && p.y + 1 < this.height) this.tiles[p.y + 1][p.x + 1] = 0;
        }

        // 2. Identify and Process Long Straight Segments
        let startIndex = 0;
        let p0 = path[0];
        let p1 = path[1];
        let currentDir = { x: Math.sign(p1.x - p0.x), y: Math.sign(p1.y - p0.y) };

        for (let i = 2; i < path.length; i++) {
            const pPrev = path[i - 1];
            const pCurr = path[i];
            const dir = { x: Math.sign(pCurr.x - pPrev.x), y: Math.sign(pCurr.y - pPrev.y) };

            if (dir.x !== currentDir.x || dir.y !== currentDir.y) {
                // Segment Change
                this.checkAndAddCrossroad(path, startIndex, i - 1, currentDir);
                startIndex = i - 1;
                currentDir = dir;
            }
        }
        // Check last segment
        this.checkAndAddCrossroad(path, startIndex, path.length - 1, currentDir);
    }

    checkAndAddCrossroad(path, startIndex, endIndex, dir) {
        const length = endIndex - startIndex;
        if (length >= 30) {
            const idealMidIndex = startIndex + Math.floor(length / 2);
            const crossLen = 3; // 3 tiles each side

            // Search for a valid spot +/- 5 steps from center
            for (let offset = 0; offset <= 5; offset++) {
                const candidates = [idealMidIndex + offset];
                if (offset > 0) candidates.push(idealMidIndex - offset);

                for (let idx of candidates) {
                    if (idx <= startIndex + 2 || idx >= endIndex - 2) continue; // Keep padding from ends

                    const node = path[idx];
                    let canCarve = true;
                    const tilesToCarve = [];

                    // Identify tiles to carve based on direction
                    if (dir.y === 0) { // Horizontal path -> Vertical Crossroad
                        for (let k = -crossLen; k <= crossLen; k++) {
                            tilesToCarve.push({ x: node.x, y: node.y + k });
                            tilesToCarve.push({ x: node.x + 1, y: node.y + k }); // Width
                        }
                    } else { // Vertical path -> Horizontal Crossroad
                        for (let k = -crossLen; k <= crossLen; k++) {
                            tilesToCarve.push({ x: node.x + k, y: node.y });
                            tilesToCarve.push({ x: node.x + k, y: node.y + 1 }); // Width
                        }
                    }

                    // Check for Room Collision (including immediate neighbors for buffer)
                    for (let t of tilesToCarve) {
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                const cx = t.x + dx;
                                const cy = t.y + dy;
                                if (!this.isValid(cx, cy)) continue;
                                if (this.roomGrid[cy][cx] !== -1) {
                                    canCarve = false;
                                    break;
                                }
                            }
                            if (!canCarve) break;
                        }
                        if (!canCarve) break;
                    }

                    if (canCarve) {
                        // Safe to carve!
                        for (let t of tilesToCarve) {
                            if (this.isValid(t.x, t.y)) this.tiles[t.y][t.x] = 0;
                        }
                        return; // Done
                    }
                }
            }
            // If we get here, no valid spot was found. Skip.
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
                } else if (this.tiles[y][x] === 2) {
                    // LOCKED DOOR (Red Diagonal Stripes)
                    const tx = Math.floor(x * this.tileSize);
                    const ty = Math.floor(y * this.tileSize);

                    // Background
                    ctx.fillStyle = '#330000'; // Dark Red
                    ctx.fillRect(tx, ty, this.tileSize, this.tileSize);

                    // Stripes
                    ctx.strokeStyle = '#ff0000'; // Bright Red
                    ctx.lineWidth = 2;
                    ctx.beginPath();

                    // Stripe 1
                    ctx.moveTo(tx, ty + this.tileSize);
                    ctx.lineTo(tx + this.tileSize, ty);

                    // Stripe 2 (Top Left corner)
                    ctx.moveTo(tx, ty + this.tileSize / 2);
                    ctx.lineTo(tx + this.tileSize / 2, ty);

                    // Stripe 3 (Bottom Right corner)
                    ctx.moveTo(tx + this.tileSize / 2, ty + this.tileSize);
                    ctx.lineTo(tx + this.tileSize, ty + this.tileSize / 2);

                    ctx.stroke();

                    // Border
                    ctx.strokeRect(tx, ty, this.tileSize, this.tileSize);
                } else {
                    ctx.fillStyle = '#222';
                    ctx.fillRect(Math.floor(x * this.tileSize), Math.floor(y * this.tileSize), this.tileSize, this.tileSize);
                    ctx.strokeStyle = '#2a2a2a';
                    ctx.strokeRect(Math.floor(x * this.tileSize), Math.floor(y * this.tileSize), this.tileSize, this.tileSize);

                    // Staircase Rendering
                    if (this.roomGrid[y][x] !== -1) {
                        const roomId = this.roomGrid[y][x];
                        const room = this.rooms[roomId];
                        // Fix: rooms array might not be indexed by ID if IDs are not sequential, but logic assigns index as ID.
                        // Assuming roomGrid ID corresponds to rooms index.
                        if (room && room.type === 'staircase') {
                            const centerX = room.x + Math.floor(room.w / 2);
                            const centerY = room.y + Math.floor(room.h / 2);
                            // Draw 2x2 stairs in center
                            if ((x === centerX || x === centerX - 1) && (y === centerY || y === centerY - 1)) {
                                ctx.fillStyle = '#4488ff';
                                ctx.fillRect(Math.floor(x * this.tileSize), Math.floor(y * this.tileSize), this.tileSize, this.tileSize);
                            }
                        }
                    }
                }
            }
        }

        // --- Debug Visualization ---
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '10px sans-serif';

        // 1. Draw "Path" on path tiles
        for (let y = Math.max(0, startY); y < Math.min(this.height, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(this.width, endX); x++) {
                if (this.tiles[y][x] === 0 && this.roomGrid[y][x] === -1) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillText('Path', x * this.tileSize + this.tileSize / 2, y * this.tileSize + this.tileSize / 2);
                }
            }
        }

        // 2. Draw Room Labels and Entrances
        for (let room of this.rooms) {
            // Check visibility (loose check)
            if (room.x + room.w < startX || room.x > endX || room.y + room.h < startY || room.y > endY) continue;

            // Room Label
            ctx.fillStyle = 'white';
            ctx.font = '14px sans-serif';
            ctx.fillText(`Room ${room.id}`, (room.x + room.w / 2) * this.tileSize, (room.y + room.h / 2) * this.tileSize);

            // Connectors (Entrances)
            ctx.font = '10px sans-serif';
            ctx.fillStyle = '#00ff00';
            for (let c of room.connectors) {
                // Determine screen position
                const cx = c.x * this.tileSize + this.tileSize / 2;
                const cy = c.y * this.tileSize + this.tileSize / 2;
                ctx.fillText('Door', cx, cy);
            }
        }
    }

    isWall(x, y) {
        const tx = Math.floor(x / this.tileSize);
        const ty = Math.floor(y / this.tileSize);
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true;
        return this.tiles[ty][tx] === 1 || this.tiles[ty][tx] === 2;
    }



    closeRoom(room) {
        if (!room) return;

        for (let c of room.connectors) {
            if (!this.isValid(c.x, c.y)) continue;

            const isDoor = (this.tiles[c.y][c.x] === 0 || this.tiles[c.y][c.x] === 2);
            if (!isDoor) continue; // Only set door if it's a path

            this.tiles[c.y][c.x] = 2; // Locked Door

            // Widen if possible (check neighbor)
            if (c.dir.y !== 0) { // Horizontal: Check Right (x+1)
                if (this.isValid(c.x + 1, c.y) && this.tiles[c.y][c.x + 1] === 0)
                    this.tiles[c.y][c.x + 1] = 2;
            } else if (c.dir.x !== 0) { // Vertical: Check Down (y+1)
                if (this.isValid(c.x, c.y + 1) && this.tiles[c.y + 1][c.x] === 0)
                    this.tiles[c.y + 1][c.x] = 2;
            }
        }
    }

    isTileNearConnector(x, y, range = 4, excludeConnector = null) {
        for (let r of this.rooms) {
            if (!r.connectors) continue;
            for (let c of r.connectors) {
                if (c === excludeConnector) continue;
                if (Math.abs(x - c.x) + Math.abs(y - c.y) <= range) return true;
            }
        }
        return false;
    }

    openRoom(room) {
        if (!room) return;

        for (let c of room.connectors) {
            if (!this.isValid(c.x, c.y)) continue;

            // Horizontal Wall (Top/Bottom) -> Door is Horizontal (x, x+1)
            if (c.dir.y !== 0) {
                if (this.tiles[c.y][c.x] === 2) this.tiles[c.y][c.x] = 0; // Only if door
                if (this.isValid(c.x + 1, c.y) && this.tiles[c.y][c.x + 1] === 2) this.tiles[c.y][c.x + 1] = 0;
            }
            // Vertical Wall (Left/Right) -> Door is Vertical (y, y+1)
            else if (c.dir.x !== 0) {
                if (this.tiles[c.y][c.x] === 2) this.tiles[c.y][c.x] = 0;
                if (this.isValid(c.x, c.y + 1) && this.tiles[c.y + 1][c.x] === 2) this.tiles[c.y + 1][c.x] = 0;
            }
        }
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
