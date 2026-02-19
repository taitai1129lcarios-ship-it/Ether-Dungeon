import { Entity } from '../utils.js';
import { getCachedImage } from '../utils.js';
import { generateSkillStock } from '../../data/shop_items.js';

export class ShopNPC extends Entity {
    constructor(game, x, y) {
        super(game, x - 20, y - 30, 40, 60, '#ffd700', 1);
        this.showPrompt = false;
        this.stock = [];
        this._stockReady = false;
        this._image = getCachedImage('assets/shop_npc.png');

        this._loadStock();
    }

    async _loadStock() {
        this.stock = await generateSkillStock(2);
        this._stockReady = true;
    }

    update(dt) { }

    draw(ctx) {
        const cx = this.x + this.width / 2;

        // NPC image
        if (this._image && this._image.complete && this._image.naturalWidth !== 0) {
            ctx.drawImage(this._image, this.x, this.y, this.width, this.height);
        }

        // Prompt
        if (this.showPrompt) {
            ctx.save();
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this._stockReady ? '[SPACE] スキル購入' : '[SPACE] 準備中...', cx, this.y - 8);
            ctx.restore();
        }
    }

    use() {
        if (this.game.gameState !== 'PLAYING') return;
        if (!this._stockReady) return;

        if (this.stock.every(s => s.sold)) {
            this._stockReady = false;
            this._loadStock();
            return;
        }

        this.game.gameState = 'SHOP';

        import('../ui.js').then(ui => {
            ui.showShopUI(this.stock, (item) => {
                this._buyItem(item, ui);
            }, () => {
                this.game.gameState = 'PLAYING';
            });
        });
    }

    _buyItem(item, ui) {
        if (item.sold) return;
        if (this.game.player.currency < item.price) return;

        this.game.player.currency -= item.price;
        item.sold = true;
        item.apply(this.game);

        ui.showShopUI(this.stock, (i) => {
            this._buyItem(i, ui);
        }, () => {
            this.game.gameState = 'PLAYING';
        });
    }
}
