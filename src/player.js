import { Entity } from './utils.js';
import { SkillType } from './skills.js';

export class Player extends Entity {
    constructor(game, x, y) {
        super(game, x, y, 20, 20, '#4488ff', 100);
        this.speed = 250;
        this.facing = 'right';

        this.inventory = [];
        this.equippedSkills = {
            [SkillType.NORMAL]: null,
            [SkillType.PRIMARY]: null,
            [SkillType.SECONDARY]: null,
            [SkillType.ULTIMATE]: null
        };
    }

    equipSkill(skill) {
        if (Object.values(SkillType).includes(skill.type)) {
            this.equippedSkills[skill.type] = skill;
            console.log(`Equipped ${skill.name} to ${skill.type}`);
        }
    }

    update(dt) {
        this.vx = 0;
        this.vy = 0;

        if (this.game.input.isDown('ArrowUp') || this.game.input.isDown('w')) { this.vy = -this.speed; this.facing = 'up'; }
        if (this.game.input.isDown('ArrowDown') || this.game.input.isDown('s')) { this.vy = this.speed; this.facing = 'down'; }
        if (this.game.input.isDown('ArrowLeft') || this.game.input.isDown('a')) { this.vx = -this.speed; this.facing = 'left'; }
        if (this.game.input.isDown('ArrowRight') || this.game.input.isDown('d')) { this.vx = this.speed; this.facing = 'right'; }

        super.update(dt);

        // Update cooldowns for equipped skills
        for (let key in this.equippedSkills) {
            if (this.equippedSkills[key]) {
                this.equippedSkills[key].update(dt);
            }
        }

        // Input handling for skills
        if (this.game.input.isDown(' ')) {
            this.useSkill(SkillType.NORMAL);
        }
        if (this.game.input.isDown('e') || this.game.input.isDown('E')) {
            this.useSkill(SkillType.PRIMARY);
        }
        if (this.game.input.isDown('Shift')) {
            this.useSkill(SkillType.SECONDARY);
        }
        if (this.game.input.isDown('q') || this.game.input.isDown('Q')) {
            this.useSkill(SkillType.ULTIMATE);
        }
    }

    useSkill(type) {
        const skill = this.equippedSkills[type];
        if (skill) {
            skill.activate(this, this.game);
        }
    }

    // Helper to get hit box based on facing direction
    getHitBox(range, width, height) {
        let hitX = this.x;
        let hitY = this.y;
        let hitW = this.width;
        let hitH = this.height;

        if (this.facing === 'left') { hitX -= range; hitW = range; if (width) hitW = width; hitX = this.x - hitW; }
        if (this.facing === 'right') { hitX += this.width; hitW = range; if (width) hitW = width; }
        if (this.facing === 'up') { hitY -= range; hitH = range; if (height) hitH = height; hitY = this.y - hitH; }
        if (this.facing === 'down') { hitY += this.height; hitH = range; if (height) hitH = height; }

        // Center alignment for perpendicular axis
        if (this.facing === 'left' || this.facing === 'right') {
            if (height) {
                hitY = this.y + (this.height - height) / 2;
                hitH = height;
            }
        } else {
            if (width) {
                hitX = this.x + (this.width - width) / 2;
                hitW = width;
            }
        }

        return { x: hitX, y: hitY, w: hitW, h: hitH };
    }
}
