export class MapRenderer {
    constructor(map) {
        this.map = map;
    }

    draw(ctx, camera, player, debugMode = false) {
        const startX = Math.floor(camera.x / this.map.tileSize);
        const startY = Math.floor(camera.y / this.map.tileSize);
        const endX = startX + Math.ceil(camera.width / this.map.tileSize) + 1;
        const endY = startY + Math.ceil(camera.height / this.map.tileSize) + 1;

        for (let y = Math.max(0, startY); y < Math.min(this.map.height, endY); y++) {
            for (let x = Math.max(0, startX); x < Math.min(this.map.width, endX); x++) {
                if (this.map.tiles[y][x] === 1) {
                    const isFrontWall = y < this.map.height - 1 && this.map.tiles[y + 1][x] === 0;
                    if (isFrontWall) {
                        if (this.map.wallImage.complete && this.map.wallImage.naturalWidth !== 0) {
                            ctx.drawImage(this.map.wallImage, Math.floor(x * this.map.tileSize), Math.floor(y * this.map.tileSize), this.map.tileSize, this.map.tileSize);
                        } else {
                            ctx.fillStyle = '#666';
                            ctx.fillRect(Math.floor(x * this.map.tileSize), Math.floor(y * this.map.tileSize), this.map.tileSize, this.map.tileSize);
                        }
                    } else {
                        ctx.fillStyle = '#333';
                        ctx.fillRect(Math.floor(x * this.map.tileSize), Math.floor(y * this.map.tileSize), this.map.tileSize, this.map.tileSize);
                        ctx.strokeStyle = '#222';
                        ctx.strokeRect(Math.floor(x * this.map.tileSize), Math.floor(y * this.map.tileSize), this.map.tileSize, this.map.tileSize);
                    }
                } else if (this.map.tiles[y][x] === 2) {
                    const tx = Math.floor(x * this.map.tileSize);
                    const ty = Math.floor(y * this.map.tileSize);
                    ctx.fillStyle = '#330000';
                    ctx.fillRect(tx, ty, this.map.tileSize, this.map.tileSize);
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(tx, ty + this.map.tileSize);
                    ctx.lineTo(tx + this.map.tileSize, ty);
                    ctx.moveTo(tx, ty + this.map.tileSize / 2);
                    ctx.lineTo(tx + this.map.tileSize / 2, ty);
                    ctx.moveTo(tx + this.map.tileSize / 2, ty + this.map.tileSize);
                    ctx.lineTo(tx + this.map.tileSize, ty + this.map.tileSize / 2);
                    ctx.stroke();
                    ctx.strokeRect(tx, ty, this.map.tileSize, this.map.tileSize);
                } else {
                    ctx.fillStyle = '#222';
                    ctx.fillRect(Math.floor(x * this.map.tileSize), Math.floor(y * this.map.tileSize), this.map.tileSize, this.map.tileSize);
                    ctx.strokeStyle = '#2a2a2a';
                    ctx.strokeRect(Math.floor(x * this.map.tileSize), Math.floor(y * this.map.tileSize), this.map.tileSize, this.map.tileSize);
                }
            }
        }

        for (const room of this.map.rooms) {
            if (room.type === 'staircase') {
                if (room.x * this.map.tileSize > endX * this.map.tileSize || (room.x + room.w) * this.map.tileSize < startX * this.map.tileSize ||
                    room.y * this.map.tileSize > endY * this.map.tileSize || (room.y + room.h) * this.map.tileSize < startY * this.map.tileSize) {
                    continue;
                }

                const centerX = room.x + Math.floor(room.w / 2);
                const centerY = room.y + Math.floor(room.h / 2);
                const centerPixelX = (centerX) * this.map.tileSize;
                const centerPixelY = (centerY) * this.map.tileSize;

                if (room.currentPortalScale === undefined) room.currentPortalScale = 0.3;
                let targetScale = 0.3;
                if (player) {
                    const dist = Math.sqrt((player.x + player.width / 2 - centerPixelX) ** 2 + (player.y + player.height / 2 - centerPixelY) ** 2);
                    if (dist < 100) targetScale = 1.5;
                }
                room.currentPortalScale += (targetScale - room.currentPortalScale) * 0.02;

                if (this.map.stairsImage.complete && this.map.stairsImage.naturalWidth !== 0) {
                    ctx.save();
                    ctx.translate(centerPixelX, centerPixelY);
                    ctx.scale(room.currentPortalScale, room.currentPortalScale);
                    ctx.rotate(performance.now() * 0.0005);
                    ctx.drawImage(this.map.stairsImage, -this.map.tileSize, -this.map.tileSize, this.map.tileSize * 2, this.map.tileSize * 2);
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.translate(centerPixelX, centerPixelY);
                    ctx.scale(room.currentPortalScale, room.currentPortalScale);
                    ctx.fillStyle = '#4488ff';
                    ctx.fillRect(-this.map.tileSize, -this.map.tileSize, this.map.tileSize * 2, this.map.tileSize * 2);
                    ctx.restore();
                }
            }
        }

        if (debugMode) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '10px sans-serif';
            for (let y = Math.max(0, startY); y < Math.min(this.map.height, endY); y++) {
                for (let x = Math.max(0, startX); x < Math.min(this.map.width, endX); x++) {
                    if (this.map.tiles[y][x] === 0 && this.map.roomGrid[y][x] === -1) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                        ctx.fillText('Path', x * this.map.tileSize + this.map.tileSize / 2, y * this.map.tileSize + this.map.tileSize / 2);
                    }
                }
            }
            for (let room of this.map.rooms) {
                if (room.x + room.w < startX || room.x > endX || room.y + room.h < startY || room.y > endY) continue;
                ctx.fillStyle = 'white';
                ctx.font = '14px sans-serif';
                ctx.fillText(`Room ${room.id}`, (room.x + room.w / 2) * this.map.tileSize, (room.y + room.h / 2) * this.map.tileSize);
                ctx.font = '10px sans-serif';
                ctx.fillStyle = '#00ff00';
                for (let c of room.connectors) {
                    ctx.fillText('Door', c.x * this.map.tileSize + this.map.tileSize / 2, c.y * this.map.tileSize + this.map.tileSize / 2);
                }
            }
        }
    }

    drawPath(path) {
        if (!path || path.length < 2) return;
        for (let p of path) {
            this.map.tiles[p.y][p.x] = 0;
            if (p.x + 1 < this.map.width) this.map.tiles[p.y][p.x + 1] = 0;
            if (p.y + 1 < this.map.height) this.map.tiles[p.y + 1][p.x] = 0;
            if (p.x + 1 < this.map.width && p.y + 1 < this.map.height) this.map.tiles[p.y + 1][p.x + 1] = 0;
        }

        let startIndex = 0;
        let p0 = path[0], p1 = path[1];
        let currentDir = { x: Math.sign(p1.x - p0.x), y: Math.sign(p1.y - p0.y) };

        for (let i = 2; i < path.length; i++) {
            const pPrev = path[i - 1], pCurr = path[i];
            const dir = { x: Math.sign(pCurr.x - pPrev.x), y: Math.sign(pCurr.y - pPrev.y) };
            if (dir.x !== currentDir.x || dir.y !== currentDir.y) {
                this.checkAndAddCrossroad(path, startIndex, i - 1, currentDir);
                startIndex = i - 1;
                currentDir = dir;
            }
        }
        this.checkAndAddCrossroad(path, startIndex, path.length - 1, currentDir);
    }

    checkAndAddCrossroad(path, startIndex, endIndex, dir) {
        const length = endIndex - startIndex;
        if (length >= 30) {
            const idealMidIndex = startIndex + Math.floor(length / 2);
            const crossLen = 3;
            for (let offset = 0; offset <= 5; offset++) {
                const candidates = [idealMidIndex + offset];
                if (offset > 0) candidates.push(idealMidIndex - offset);
                for (let idx of candidates) {
                    if (idx <= startIndex + 2 || idx >= endIndex - 2) continue;
                    const node = path[idx];
                    let canCarve = true;
                    const tilesToCarve = [];
                    if (dir.y === 0) {
                        for (let k = -crossLen; k <= crossLen; k++) {
                            tilesToCarve.push({ x: node.x, y: node.y + k });
                            tilesToCarve.push({ x: node.x + 1, y: node.y + k });
                        }
                    } else {
                        for (let k = -crossLen; k <= crossLen; k++) {
                            tilesToCarve.push({ x: node.x + k, y: node.y });
                            tilesToCarve.push({ x: node.x + k, y: node.y + 1 });
                        }
                    }
                    for (let t of tilesToCarve) {
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (!this.map.isValid(t.x + dx, t.y + dy)) continue;
                                if (this.map.roomGrid[t.y + dy][t.x + dx] !== -1) {
                                    canCarve = false;
                                    break;
                                }
                            }
                            if (!canCarve) break;
                        }
                        if (!canCarve) break;
                    }
                    if (canCarve) {
                        for (let t of tilesToCarve) {
                            if (this.map.isValid(t.x, t.y)) this.map.tiles[t.y][t.x] = 0;
                        }
                        return;
                    }
                }
            }
        }
    }
}
