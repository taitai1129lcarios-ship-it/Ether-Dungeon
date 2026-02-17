import { Entity, getCachedImage } from '../utils.js';
import { skillsDB } from '../../data/skills_db.js';

export class Chest extends Entity {
    constructor(game, x, y) {
        super(game, x, y, 30, 30, '#ffd700', 1); // Gold color
        this.opened = false;

        this.imageClosed = getCachedImage('assets/chest_closed.png');
        this.imageOpen = getCachedImage('assets/chest_open.png');
    }

    update(dt) {
        // Static entity, no movement
    }

    draw(ctx) {
        const img = this.opened ? this.imageOpen : this.imageClosed;

        if (img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, Math.floor(this.x), Math.floor(this.y), this.width, this.height);
        } else {
            // Fallback rendering
            ctx.fillStyle = this.opened ? '#8B4513' : this.color; // Brown if opened
            ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(Math.floor(this.x), Math.floor(this.y), this.width, this.height);

            // Lock detail
            if (!this.opened) {
                ctx.fillStyle = '#000';
                ctx.fillRect(Math.floor(this.x + 12), Math.floor(this.y + 12), 6, 6);
            }
        }
    }

    open() {
        if (this.opened) return;
        this.opened = true;

        // Pick 3 random unique skills
        const shuffled = [...skillsDB].sort(() => 0.5 - Math.random());
        const selectedOptions = shuffled.slice(0, 3);

        this.game.triggerSkillSelection(selectedOptions);
    }
}
