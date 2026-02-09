import { Entity } from './utils.js';
import { SkillType } from './skills.js';

export class Player extends Entity {
    constructor(game, x, y) {
        super(game, x, y, 20, 20, '#4488ff', 100);
        this.speed = 250;
        this.facing = 'right';
        this.isDashing = false;
        this.isCasting = false; // Added flag
        this.dashVx = 0;
        this.dashVy = 0;

        this.inventory = [];
        this.equippedSkills = {
            [SkillType.NORMAL]: null,
            'primary1': null,
            'primary2': null,
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
        this.frameInterval = 0.1; // Faster animation speed
        this.rawSpriteWidth = 32; // Default fallback
        this.rawSpriteHeight = 32; // Default fallback

        // Tuning properties to handle gaps in AI sprite sheets
        this.spritePaddingX = 40; // Pixels to trim from left/right
        this.spritePaddingY = 20; // Pixels to trim from top/bottom

        this.width = 30; // Reduce collision box slightly
        this.height = 30;

        this.damageColor = '#ff3333'; // Player takes red damage text

        // Load Sprite JSON
        this.spriteData = null;
        fetch('assets/player_sprites.json')
            .then(response => response.json())
            .then(data => {
                this.spriteData = data;
                console.log('Player sprite data loaded:', this.spriteData);
            })
            .catch(err => console.error('Failed to load sprite JSON:', err));
    }

    equipSkill(skill, slot) {
        if (skill.type === SkillType.PRIMARY) {
            // For primary, we need a specific slot (primary1 or primary2)
            if (slot === 'primary1' || slot === 'primary2') {
                this.equippedSkills[slot] = skill;
                console.log(`Equipped ${skill.name} to ${slot}`);
            } else {
                // Default to primary1 if undefined? Or find empty?
                if (!this.equippedSkills['primary1']) this.equippedSkills['primary1'] = skill;
                else if (!this.equippedSkills['primary2']) this.equippedSkills['primary2'] = skill;
                else this.equippedSkills['primary1'] = skill; // Overwrite 1
                console.log(`Auto-equipped ${skill.name} to Primary slot`);
            }
        } else if (Object.values(SkillType).includes(skill.type)) {
            this.equippedSkills[skill.type] = skill;
            console.log(`Equipped ${skill.name} to ${skill.type}`);
        }
    }

    update(dt) {
        this.vx = 0;
        this.vy = 0;
        let moving = false;

        if (this.isDashing) {
            this.vx = this.dashVx;
            this.vy = this.dashVy;
            moving = true; // Still animate walking/dashing
        } else if (this.isCasting) {
            // Block movement input
            moving = false;
        } else {
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
        // JSON Order: 0-3 Down, 4-7 Left, 8-11 Right, 12-15 Up
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
            this.useSkill('primary1');
        }
        if (this.game.input.isDown('KeyQ')) {
            this.useSkill('primary2');
        }
        if (this.game.input.isDown('ShiftLeft') || this.game.input.isDown('ShiftRight')) {
            this.useSkill(SkillType.SECONDARY);
        }
        if (this.game.input.isDown('KeyX')) {
            this.useSkill(SkillType.ULTIMATE);
        }
    }

    useSkill(slot) {
        const skill = this.equippedSkills[slot];
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
        if (this.image.complete && this.image.naturalWidth !== 0 && this.spriteData) {
            // Calculate frame index
            const frameIndex = this.frameY * 4 + this.frameX;

            // Safety check
            if (this.spriteData.frames && this.spriteData.frames[frameIndex]) {
                const frameData = this.spriteData.frames[frameIndex].frame;

                // Calculate Aspect Ratio
                const ratio = frameData.w / frameData.h;

                // Determine drawing size based on collision width
                // Scaled by 0.7 as requested (1.5 * 0.7 = 1.05)
                const drawWidth = this.width * 1.05;
                const drawHeight = drawWidth / ratio;

                // Anchor to Bottom Center of collision box
                const drawX = this.x + (this.width - drawWidth) / 2;
                const drawY = this.y + this.height - drawHeight;

                /*
                if (Math.random() < 0.01) {
                    console.log('Drawing Player:', { 
                        idx: frameIndex, 
                        fx: frameData.x, fy: frameData.y, fw: frameData.w, fh: frameData.h,
                        dx: drawX, dy: drawY, dw: drawWidth, dh: drawHeight
                    });
                }
                */

                ctx.drawImage(
                    this.image,
                    frameData.x, frameData.y, frameData.w, frameData.h, // Source from JSON
                    Math.floor(drawX), Math.floor(drawY), Math.floor(drawWidth), Math.floor(drawHeight) // Destination
                );
            } else {
                console.warn('Missing frame data for index:', frameIndex);
                super.draw(ctx); // Fallback
            }
        } else {
            // Fallback (or loading state)
            if (Math.random() < 0.01) console.log('Player Draw Fallback - ImgComplete:', this.image.complete, 'HasSpriteData:', !!this.spriteData);
            super.draw(ctx);
        }
    }
}
