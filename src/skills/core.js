export const SkillType = {
    NORMAL: 'normal',
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    ULTIMATE: 'ultimate'
};

export class Skill {
    constructor(id, name, type, cooldown, effect, icon, maxStacks = 1) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.cooldown = cooldown;
        this.currentCooldown = 0;
        this.effect = effect;
        this.icon = icon;
        this.description = "";
        this.maxStacks = maxStacks;
        this.stacks = maxStacks; // Start fully charged
    }

    update(dt) {
        if (this.stacks < this.maxStacks) {
            this.currentCooldown -= dt;
            if (this.currentCooldown <= 0) {
                this.stacks++;
                // If still not full, reset cooldown for next stack
                if (this.stacks < this.maxStacks) {
                    this.currentCooldown = this.cooldown;
                } else {
                    this.currentCooldown = 0;
                }
            }
        }
    }

    isReady() {
        return this.stacks > 0;
    }

    activate(user, game, ...args) {
        if (this.isReady()) {
            this.effect(user, game, ...args);

            // Consume stack
            if (this.stacks === this.maxStacks) {
                // If we were full, start cooldown
                this.currentCooldown = this.cooldown;
            }
            this.stacks--;

            return true;
        }
        return false;
    }
}
