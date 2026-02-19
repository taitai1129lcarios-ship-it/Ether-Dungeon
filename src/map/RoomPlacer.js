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
                if (newRoom.x - 6 <= other.x + other.w && newRoom.x + newRoom.w + 6 >= other.x &&
                    newRoom.y - 6 <= other.y + other.h && newRoom.y + newRoom.h + 6 >= other.y) {
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
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.map.roomGrid[y][x] = room.id;
            }
        }

        if (room.type === 'start' || room.type === 'treasure' || room.type === 'staircase' ||
            room.type === 'statue' || room.type === 'altar' || room.type === 'shop') {
            room.cleared = true;
        } else {
            room.cleared = false;
        }
        room.active = false;

        for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
            for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
                this.map.tiles[y][x] = 0;
            }
        }

        if (room.shape && room.shape !== 'square') {
            this.applyRoomShape(room);
        }
    }

    applyRoomShape(room) {
        const { x, y, w, h, shape } = room;
        const intX = x + 1;
        const intY = y + 1;
        const intW = w - 2;
        const intH = h - 2;

        const setWall = (tx, ty) => {
            if (tx > x && tx < x + w - 1 && ty > y && ty < y + h - 1 && this.map.isValid(tx, ty))
                this.map.tiles[ty][tx] = 1;
        };
        const fillRect = (rx, ry, rw, rh) => {
            for (let dy = 0; dy < rh; dy++)
                for (let dx = 0; dx < rw; dx++)
                    setWall(rx + dx, ry + dy);
        };

        if (shape === 'island') {
            const isz = Math.min(4, Math.floor(Math.min(intW, intH) / 3));
            const cx = intX + Math.floor(intW / 2) - Math.floor(isz / 2);
            const cy = intY + Math.floor(intH / 2) - Math.floor(isz / 2);
            fillRect(cx, cy, isz, isz);
        } else if (shape === 'L') {
            const variant = Math.floor(Math.random() * 4);
            const hw = Math.floor(intW / 2);
            const hh = Math.floor(intH / 2);
            if (variant === 0) fillRect(intX + hw, intY + hh, intW - hw - 1, intH - hh - 1);
            else if (variant === 1) fillRect(intX + 1, intY + hh, hw - 1, intH - hh - 1);
            else if (variant === 2) fillRect(intX + hw, intY + 1, intW - hw - 1, hh - 1);
            else fillRect(intX + 1, intY + 1, hw - 1, hh - 1);
        } else if (shape === 'cross') {
            const cqW = Math.max(1, Math.floor(intW / 3) - 1);
            const cqH = Math.max(1, Math.floor(intH / 3) - 1);
            fillRect(intX + 1, intY + 1, cqW, cqH);
            fillRect(intX + intW - 1 - cqW, intY + 1, cqW, cqH);
            fillRect(intX + 1, intY + intH - 1 - cqH, cqW, cqH);
            fillRect(intX + intW - 1 - cqW, intY + intH - 1 - cqH, cqW, cqH);
        } else if (shape === 'U') {
            const variant = Math.floor(Math.random() * 4);
            const armW = Math.floor(intW / 3);
            const armH = Math.floor(intH / 3);
            if (variant === 0) fillRect(intX + armW, intY + 1, intW - armW * 2, Math.floor(intH / 2) - 1);
            else if (variant === 1) fillRect(intX + armW, intY + Math.ceil(intH / 2), intW - armW * 2, Math.floor(intH / 2) - 1);
            else if (variant === 2) fillRect(intX + 1, intY + armH, Math.floor(intW / 2) - 1, intH - armH * 2);
            else fillRect(intX + Math.ceil(intW / 2), intY + armH, Math.floor(intW / 2) - 1, intH - armH * 2);
        } else if (shape === 'T') {
            const variant = Math.floor(Math.random() * 4);
            const cqW = Math.max(1, Math.floor(intW / 3) - 1);
            const cqH = Math.max(1, Math.floor(intH / 3) - 1);
            if (variant === 0) {
                fillRect(intX + 1, intY + intH - 1 - cqH, cqW, cqH);
                fillRect(intX + intW - 1 - cqW, intY + intH - 1 - cqH, cqW, cqH);
            } else if (variant === 1) {
                fillRect(intX + 1, intY + 1, cqW, cqH);
                fillRect(intX + intW - 1 - cqW, intY + 1, cqW, cqH);
            } else if (variant === 2) {
                fillRect(intX + 1, intY + 1, cqW, cqH);
                fillRect(intX + 1, intY + intH - 1 - cqH, cqW, cqH);
            } else {
                fillRect(intX + intW - 1 - cqW, intY + 1, cqW, cqH);
                fillRect(intX + intW - 1 - cqW, intY + intH - 1 - cqH, cqW, cqH);
            }
        }
    }

    generateConnectors(room, count) {
        const possible = [];
        const isValidConnector = (x, y, dir) => {
            const innerX = x - dir.x;
            const innerY = y - dir.y;
            return this.map.isValid(innerX, innerY) && this.map.tiles[innerY][innerX] === 0;
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

        if (room.w === 4 && room.h === 4) {
            possible.length = 0;
            possible.push({ x: room.x + 1, y: room.y, dir: { x: 0, y: -1 }, used: false });
            possible.push({ x: room.x + 1, y: room.y + 3, dir: { x: 0, y: 1 }, used: false });
            possible.push({ x: room.x, y: room.y + 1, dir: { x: -1, y: 0 }, used: false });
            possible.push({ x: room.x + 3, y: room.y + 1, dir: { x: 1, y: 0 }, used: false });
            possible.sort(() => Math.random() - 0.5);
        }

        let added = 0;
        for (let i = 0; i < possible.length && added < count; i++) {
            const c = possible[i];
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
}
