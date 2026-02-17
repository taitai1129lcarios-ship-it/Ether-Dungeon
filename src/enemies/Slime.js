import { Enemy } from './BaseEnemy.js';

export class Slime extends Enemy {
    constructor(game, x, y) {
        super(game, x, y, 32, 32, '#ff4444', 50, 90, 'slime');
    }
}
