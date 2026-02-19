export class MapPathfinder {
    constructor(map) {
        this.map = map;
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
                if (!this.map.isValid(next.x, next.y) || visited.has(id(next))) continue;

                let blocked = false;
                let penalty = 0;

                // 1. STRICT ROOM BUFFER CHECK (2-tile radius)
                for (let by = next.y - 2; by <= next.y + 3; by++) {
                    for (let bx = next.x - 2; bx <= next.x + 3; bx++) {
                        if (!this.map.isValid(bx, by)) continue;
                        const rId = this.map.roomGrid[by][bx];
                        if (rId !== -1 && rId !== roomId) {
                            blocked = true; break;
                        }
                    }
                    if (blocked) break;
                }
                if (blocked) continue;

                // 2. PARALLEL PATH CHECK
                if (this.map.tiles[next.y][next.x] !== 0) {
                    const checkNeighbors = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
                    let adjacentToFloor = false;
                    for (let o of checkNeighbors) {
                        const nx = next.x + o.dx;
                        const ny = next.y + o.dy;
                        if (this.map.isValid(nx, ny) && this.map.tiles[ny][nx] === 0) {
                            adjacentToFloor = true; break;
                        }
                    }
                    const distToEnd = Math.abs(next.x - end.x) + Math.abs(next.y - end.y);
                    if (adjacentToFloor && distToEnd > 3) {
                        penalty += 1000;
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
        return null;
    }

    findPath(start, end, startRoom, endRoom) {
        const leadDist = 3;
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

        if (!this.map.isValid(realStart.x, realStart.y)) realStart.x = start.x;
        if (!this.map.isValid(realEnd.x, realEnd.y)) realEnd.x = end.x;

        const open = [realStart];
        const cameFrom = {};
        const gScore = {};
        gScore[`${realStart.x},${realStart.y}`] = 0;

        const fScore = {};
        fScore[`${realStart.x},${realStart.y}`] = this.map.heuristic(realStart, realEnd);

        const id = (n) => `${n.x},${n.y}`;

        while (open.length > 0) {
            open.sort((a, b) => (fScore[id(a)] || Infinity) - (fScore[id(b)] || Infinity));
            const current = open.shift();

            if (current.x === realEnd.x && current.y === realEnd.y) {
                let path = this.reconstructPath(cameFrom, current, realStart, realEnd);
                path.reverse();

                const fullPath = [start, ...startLead];
                for (let i = 1; i < path.length; i++) fullPath.push(path[i]);
                for (let i = endLead.length - 2; i >= 0; i--) fullPath.push(endLead[i]);
                fullPath.push(end);

                return fullPath;
            }

            const neighbors = [
                { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 }
            ];

            for (let next of neighbors) {
                if (!this.map.isValid(next.x, next.y)) continue;

                let blocked = false;
                for (let dy = -1; dy <= 2; dy++) {
                    for (let dx = -1; dx <= 2; dx++) {
                        const ckX = next.x + dx;
                        const ckY = next.y + dy;
                        if (ckX < 0 || ckX >= this.map.width || ckY < 0 || ckY >= this.map.height) continue;

                        const rId = this.map.roomGrid[ckY][ckX];
                        if (rId !== -1) {
                            let allowed = false;
                            if (startRoom && rId === startRoom.id) {
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

                let thicknessViolation = false;
                const nx = next.x;
                const ny = next.y;

                const getTile = (tx, ty) => {
                    if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) return 1;
                    return this.map.tiles[ty][tx];
                };

                if (getTile(nx, ny - 1) === 1 && getTile(nx, ny - 2) === 0) thicknessViolation = true;
                if (getTile(nx + 1, ny - 1) === 1 && getTile(nx + 1, ny - 2) === 0) thicknessViolation = true;
                if (getTile(nx, ny + 2) === 1 && getTile(nx, ny + 3) === 0) thicknessViolation = true;
                if (getTile(nx + 1, ny + 2) === 1 && getTile(nx + 1, ny + 3) === 0) thicknessViolation = true;
                if (getTile(nx - 1, ny) === 1 && getTile(nx - 2, ny) === 0) thicknessViolation = true;
                if (getTile(nx - 1, ny + 1) === 1 && getTile(nx - 2, ny + 1) === 0) thicknessViolation = true;
                if (getTile(nx + 2, ny) === 1 && getTile(nx + 3, ny) === 0) thicknessViolation = true;
                if (getTile(nx + 2, ny + 1) === 1 && getTile(nx + 3, ny + 1) === 0) thicknessViolation = true;

                let moveCost = 1;
                if (thicknessViolation) {
                    moveCost += 50;
                }

                if (this.map.tiles[ny][nx] === 1) {
                    let tooClose = false;
                    const boundaryOffsets = [
                        { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
                        { dx: 0, dy: 2 }, { dx: 1, dy: 2 },
                        { dx: -1, dy: 0 }, { dx: -1, dy: 1 },
                        { dx: 2, dy: 0 }, { dx: 2, dy: 1 },
                        { dx: -1, dy: -1 }, { dx: 2, dy: -1 },
                        { dx: -1, dy: 2 }, { dx: 2, dy: 2 }
                    ];

                    for (let o of boundaryOffsets) {
                        const bx = nx + o.dx;
                        const by = ny + o.dy;
                        if (bx < 0 || bx >= this.map.width || by < 0 || by >= this.map.height) continue;
                        if (this.map.tiles[by][bx] === 0) {
                            const isCurrent = (bx >= current.x && bx <= current.x + 1 &&
                                by >= current.y && by <= current.y + 1);
                            if (!isCurrent) {
                                tooClose = true;
                                break;
                            }
                        }
                    }
                    if (tooClose) continue;
                }

                const parent = cameFrom[id(current)];
                let prevDx = 0, prevDy = 0;
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
                    moveCost += 10;
                }

                if (turning && parent) {
                    const grandparent = cameFrom[id(parent)];
                    if (grandparent) {
                        const gpDx = parent.x - grandparent.x;
                        const gpDy = parent.y - grandparent.y;
                        if (gpDx !== prevDx || gpDy !== prevDy) {
                            moveCost += 100;
                        }
                    }
                }

                const tentativeG = gScore[id(current)] + moveCost;
                if (tentativeG < (gScore[id(next)] || Infinity)) {
                    cameFrom[id(next)] = current;
                    gScore[id(next)] = tentativeG;
                    fScore[id(next)] = tentativeG + this.map.heuristic(next, realEnd);
                    if (!open.some(n => n.x === next.x && n.y === next.y)) {
                        open.push(next);
                    }
                }
            }
        }
        return null;
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
}
