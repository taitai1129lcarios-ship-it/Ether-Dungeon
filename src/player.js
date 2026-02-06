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

        this.image = new Image();
        this.image.src = 'assets/player_sprites.png';
        this.image.onload = () => {
            console.log('Player sprite loaded:', this.image.width, 'x', this.image.height);
            // Dynamic frame size calculation assuming 4x4 grid
            this.rawSpriteWidth = this.image.width / 4;
            this.rawSpriteHeight = this.image.height / 4;
            console.log('raw sprite size:', this.rawSpriteWidth, 'x', this.rawSpriteHeight);
        };
        this.image.onerror = (e) => {
            console.error('Failed to load player sprite:', e);
        };

        // Sprite animation properties
        this.frameX = 0;
        this.frameY = 0; // Row: 0=Down, 1=Left, 2=Right, 3=Up
        this.maxFrames = 4; // Columns
        this.frameTimer = 0;
        this.frameInterval = 0.15; // Animation speed
        this.rawSpriteWidth = 32; // Default fallback
        this.rawSpriteHeight = 32; // Default fallback

        // Tuning properties to handle gaps in AI sprite sheets
        this.spritePaddingX = 40; // Pixels to trim from left/right
        this.spritePaddingY = 20; // Pixels to trim from top/bottom

        this.width = 30; // Reduce collision box slightly
        this.height = 30;

        this.damageColor = '#ff3333'; // Player takes red damage text
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
        let moving = false;

        if (this.game.input.isDown('ArrowUp') || this.game.input.isDown('KeyW')) {
            this.vy = -this.speed;
            this.facing = 'up';
            moving = true;
        }
        if (this.game.input.isDown('ArrowDown') || this.game.input.isDown('KeyS')) {
            this.vy = this.speed;
            this.facing = 'down';
            moving = true;
        }
        if (this.game.input.isDown('ArrowLeft') || this.game.input.isDown('KeyA')) {
            this.vx = -this.speed;
            this.facing = 'left';
            moving = true;
        }
        if (this.game.input.isDown('ArrowRight') || this.game.input.isDown('KeyD')) {
            this.vx = this.speed;
            this.facing = 'right';
            moving = true;
        }

        // Animation Logic
        if (moving) {
            this.frameTimer += dt;
            if (this.frameTimer > this.frameInterval) {
                this.frameX++;
                if (this.frameX >= this.maxFrames) this.frameX = 0;
                this.frameTimer = 0;
            }
        } else {
            this.frameX = 0; // Reset to standing frame
            this.frameTimer = 0;
        }

        // Map facing to sprite row
        switch (this.facing) {
            case 'down': this.frameY = 0; break;
            case 'left': this.frameY = 1; break;
            case 'right': this.frameY = 2; break;
            case 'up': this.frameY = 3; break;
        }

        super.update(dt);

        // Update cooldowns for equipped skills
        for (let key in this.equippedSkills) {
            if (this.equippedSkills[key]) {
                this.equippedSkills[key].update(dt);
            }
        }

        // Input handling for skills
        if (this.game.input.isDown('Space')) {
            this.useSkill(SkillType.NORMAL);
        }
        if (this.game.input.isDown('KeyE')) {
            this.useSkill(SkillType.PRIMARY);
        }
        if (this.game.input.isDown('ShiftLeft') || this.game.input.isDown('ShiftRight')) {
            this.useSkill(SkillType.SECONDARY);
        }
        if (this.game.input.isDown('KeyQ')) {
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

    draw(ctx) {
        if (this.image.complete && this.image.naturalWidth !== 0) {
            // Calculate specific X position based on margins and gaps
            // sx = margin + col * (width + gap)
            const sx = this.layoutMarginX + this.frameX * (this.spriteRealWidth + this.layoutGapX);

            // Assuming Y is still uniform rows
            const sy = this.frameY * this.spriteRealHeight;

            // Trim logic can be added here if needed, but the calculated width is the "content" width
            // So we use spriteRealWidth directly
            const sw = this.spriteRealWidth;
            const sh = this.spriteRealHeight;

            ctx.drawImage(
                this.image,
                sx, sy, sw, sh, // Source
                Math.floor(this.x), Math.floor(this.y), this.width, this.height // Destination
            );
        } else {
            super.draw(ctx);
        }

        // Draw Player HP Bar if not full (optional, or always?)
        // Let's always look good or maybe top left UI handles it?
        // Actually UI handles player HP. Entity.draw draws a bar above head.
        // We can override to NOT draw bar above head because we have UI.
    }
}
