
export const STATUS_TYPES = {
    BLEED: 'bleed',
    SLOW: 'slow'
};

export class StatusManager {
    constructor(owner) {
        this.owner = owner;
        this.effects = new Map(); // Map<type, { stacks, timer, duration }>
    }

    applyStatus(type, duration, magnitude = null, maxStacks = 10) {
        if (!this.effects.has(type)) {
            this.effects.set(type, {
                stacks: 1,
                timer: duration,
                duration: duration,
                magnitude: magnitude // Added custom magnitude
            });
            this.showStatusText(type, 1);
        } else {
            const effect = this.effects.get(type);
            effect.timer = duration; // Reset timer
            if (magnitude !== null) effect.magnitude = magnitude; // Update magnitude if provided
            if (effect.stacks < maxStacks) {
                effect.stacks++;
                this.showStatusText(type, effect.stacks);
            }
        }
    }

    update(dt) {
        for (const [type, effect] of this.effects) {
            effect.timer -= dt;
            if (effect.timer <= 0) {
                this.effects.delete(type);
            }
        }
    }

    getDamageMultiplier(baseDamage) {
        let multiplier = 1.0;

        // BLEED: +3% damage taken per stack
        if (this.effects.has(STATUS_TYPES.BLEED)) {
            const stacks = this.effects.get(STATUS_TYPES.BLEED).stacks;
            multiplier += stacks * 0.03;
        }

        return multiplier;
    }

    getSpeedMultiplier() {
        let multiplier = 1.0;

        // SLOW: 50% slow or custom magnitude
        if (this.effects.has(STATUS_TYPES.SLOW)) {
            const effect = this.effects.get(STATUS_TYPES.SLOW);
            // Default to 0.5 if no magnitude (50% speed)
            const m = effect.magnitude !== null ? effect.magnitude : 0.5;
            multiplier *= m;
        }

        return multiplier;
    }

    // Helper for visual feedback
    showStatusText(type, stacks) {
        let text = '';
        let color = '#fff';

        if (type === STATUS_TYPES.BLEED) {
            text = `Bleed ${stacks}`;
            color = '#ff0000';
        }

        if (this.owner.game) {
            this.owner.game.animations.push({
                type: 'text',
                text: text,
                x: this.owner.x + this.owner.width / 2,
                y: this.owner.y - 10,
                vx: 0,
                vy: -50,
                life: 0.5,
                maxLife: 0.5,
                color: color,
                font: '12px sans-serif'
            });
        }
    }
}
