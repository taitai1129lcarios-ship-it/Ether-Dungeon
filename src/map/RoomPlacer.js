export class RoomPlacer {
    constructor(map) {
        this.map = map;
    }

    placeRoom(config) {
        const maxAttempts = (config.x !== undefined && config.y !== undefined) ? 1 : 50;

        for (let i = 0; i < maxAttempts; i++) {
            let x, y;
            if (config.x !== undefined && config.y !== undefined) {
                x = config.x;
                y = config.y;
            } else {
                x = Math.floor(Math.random() * (this.map.width - config.w - 4)) + 2;
                y = Math.floor(Math.random() * (this.map.height - config.h - 4)) + 2;
            }

            const newRoom = {
                x, y, w: config.w, h: config.h,
                type: config.type,
                shape: config.shape || 'square',
                connectors: [],
                id: this.map.rooms.length
            };

            let failed = false;
            for (let other of this.map.rooms) {
                if (newRoom.x - 4 <= other.x + other.w && newRoom.x + newRoom.w + 4 >= other.x &&
                    newRoom.y - 4 <= other.y + other.h && newRoom.y + newRoom.h + 4 >= other.y) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                this.carveRoom(newRoom);
                this.generateConnectors(newRoom, config.entranceCount);
                this.map.rooms.push(newRoom);
                return true;
            }
        }
        return false;
    }

    carveRoom(room) {
        // Set room grid for the entire bounding box
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.map.roomGrid[y][x] = room.id;
            }
        }

        room.cleared = (room.type === 'start' || room.type === 'treasure' ||
            room.type === 'staircase' || room.type === 'statue' || room.type === 'altar' || room.type === 'shop');
        room.active = false;

        if (room.type === 'start') {
            room.shape = 'square';
        }

        if (room.shape === 'square' || !room.shape) {
            // Standard square room: carve entire interior
            for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
                for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
                    this.map.tiles[y][x] = 0;
                }
            }
        } else {
            // Specialized shapes: carve specific floor areas
            this.applyRoomShape(room);
        }
    }

    applyRoomShape(room) {
        const { x, y, w, h, shape } = room;
        const intX = x + 1;
        const intY = y + 1;
        const intW = w - 2;
        const intH = h - 2;

        const carveFloor = (tx, ty) => {
            if (tx >= intX && tx < intX + intW && ty >= intY && ty < intY + intH && this.map.isValid(tx, ty))
                this.map.tiles[ty][tx] = 0;
        };
        const carveRect = (rx, ry, rw, rh) => {
            for (let dy = 0; dy < rh; dy++)
                for (let dx = 0; dx < rw; dx++)
                    carveFloor(rx + dx, ry + dy);
        };

        if (shape === 'island') {
            // Carve everything except the center island
            const isz = Math.min(4, Math.floor(Math.min(intW, intH) / 3));
            const cx = intX + Math.floor(intW / 2) - Math.floor(isz / 2);
            const cy = intY + Math.floor(intH / 2) - Math.floor(isz / 2);

            for (let dy = 0; dy < intH; dy++) {
                for (let dx = 0; dx < intW; dx++) {
                    const tx = intX + dx;
                    const ty = intY + dy;
                    if (tx < cx || tx >= cx + isz || ty < cy || ty >= cy + isz) {
                        carveFloor(tx, ty);
                    }
                }
            }
        } else if (shape === 'L') {
            const variant = Math.floor(Math.random() * 4);
            const thick = 5;

            if (variant === 0) { // Top-Left L
                carveRect(intX, intY, intW, thick);
                carveRect(intX, intY, thick, intH);
            } else if (variant === 1) { // Top-Right L
                carveRect(intX, intY, intW, thick);
                carveRect(intX + intW - thick, intY, thick, intH);
            } else if (variant === 2) { // Bottom-Left L
                carveRect(intX, intY + intH - thick, intW, thick);
                carveRect(intX, intY, thick, intH);
            } else { // Bottom-Right L
                carveRect(intX, intY + intH - thick, intW, thick);
                carveRect(intX + intW - thick, intY, thick, intH);
            }
        } else if (shape === 'cross') {
            const thick = 5;
            const cx = intX + Math.floor((intW - thick) / 2);
            const cy = intY + Math.floor((intH - thick) / 2);

            carveRect(intX, cy, intW, thick); // Horizontal
            carveRect(cx, intY, thick, intH); // Vertical
        } else if (shape === 'U') {
            const variant = Math.floor(Math.random() * 4);
            const thick = 5;
            if (variant === 0) { // Opening Up
                carveRect(intX, intY + intH - thick, intW, thick);
                carveRect(intX, intY, thick, intH);
                carveRect(intX + intW - thick, intY, thick, intH);
            } else if (variant === 1) { // Opening Down
                carveRect(intX, intY, intW, thick);
                carveRect(intX, intY, thick, intH);
                carveRect(intX + intW - thick, intY, thick, intH);
            } else if (variant === 2) { // Opening Left
                carveRect(intX + intW - thick, intY, thick, intH);
                carveRect(intX, intY, intW, thick);
                carveRect(intX, intY + intH - thick, intW, thick);
            } else { // Opening Right
                carveRect(intX, intY, thick, intH);
                carveRect(intX, intY, intW, thick);
                carveRect(intX, intY + intH - thick, intW, thick);
            }
        } else if (shape === 'T') {
            const variant = Math.floor(Math.random() * 4);
            const thick = 5;

            if (variant === 0) { // Top Bar
                carveRect(intX, intY, intW, thick);
                carveRect(intX + Math.floor((intW - thick) / 2), intY, thick, intH);
            } else if (variant === 1) { // Bottom Bar
                carveRect(intX, intY + intH - thick, intW, thick);
                carveRect(intX + Math.floor((intW - thick) / 2), intY, thick, intH);
            } else if (variant === 2) { // Left Bar
                carveRect(intX, intY, thick, intH);
                carveRect(intX, intY + Math.floor((intH - thick) / 2), intW, thick);
            } else { // Right Bar
                carveRect(intX + intW - thick, intY, thick, intH);
                carveRect(intX, intY + Math.floor((intH - thick) / 2), intW, thick);
            }
        }
    }

    generateConnectors(room, count) {
        const possible = [];
        const isValidConnector = (x, y, dir) => {
            const innerX = x - dir.x;
            const innerY = y - dir.y;
            const outerX = x + dir.x;
            const outerY = y + dir.y;

            // Inner must be part of this room's interior (already carved)
            const innerValid = this.map.isValid(innerX, innerY) && this.map.tiles[innerY][innerX] === 0;
            // Outer must be within map bounds and not inside any room's bounding box
            const outerValid = this.map.isValid(outerX, outerY) && this.map.roomGrid[outerY][outerX] === -1;

            return innerValid && outerValid;
        };

        for (let x = room.x + 2; x < room.x + room.w - 3; x++) {
            if (isValidConnector(x, room.y, { x: 0, y: -1 }))
                possible.push({ x: x, y: room.y, dir: { x: 0, y: -1 }, used: false });
        }
        for (let x = room.x + 2; x < room.x + room.w - 3; x++) {
            if (isValidConnector(x, room.y + room.h - 1, { x: 0, y: 1 }))
                possible.push({ x: x, y: room.y + room.h - 1, dir: { x: 0, y: 1 }, used: false });
        }
        for (let y = room.y + 2; y < room.y + room.h - 3; y++) {
            if (isValidConnector(room.x, y, { x: -1, y: 0 }))
                possible.push({ x: room.x, y: y, dir: { x: -1, y: 0 }, used: false });
        }
        for (let y = room.y + 2; y < room.y + room.h - 3; y++) {
            if (isValidConnector(room.x + room.w - 1, y, { x: 1, y: 0 }))
                possible.push({ x: room.x + room.w - 1, y: y, dir: { x: 1, y: 0 }, used: false });
        }

        possible.sort(() => Math.random() - 0.5);


        let added = 0;
        const usedSides = new Set();
        const getSide = (dir) => {
            if (dir.x === 0 && dir.y === -1) return 'top';
            if (dir.x === 0 && dir.y === 1) return 'bottom';
            if (dir.x === -1 && dir.y === 0) return 'left';
            if (dir.x === 1 && dir.y === 0) return 'right';
            return 'unknown';
        };

        for (let i = 0; i < possible.length && added < count; i++) {
            const c = possible[i];
            const side = getSide(c.dir);

            if (usedSides.has(side)) continue;

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
            usedSides.add(side);
            added++;
        }
    }
}
