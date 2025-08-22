// WS: Fichier pour les classes et fonctions utilitaires

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    multiply(s) {
        return new Vector(this.x * s, this.y * s);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        return mag > 0 ? new Vector(this.x / mag, this.y / mag) : new Vector();
    }

    static distance(v1, v2) {
        return Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2));
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameState.lastScreenWidth = canvas.width;
    gameState.lastScreenHeight = canvas.height;
    if (typeof draw === 'function') {
        draw(); // Redessine immédiatement après le redimensionnement
    }
}

function centerCameraOnPlayer() {
    if (!gameState.player) return;
    const targetZoom = 1; // On pourrait le rendre dynamique
    gameState.camera.zoom = targetZoom;
    gameState.camera.x = gameState.player.pos.x - (canvas.width / 2) / gameState.camera.zoom;
    gameState.camera.y = gameState.player.pos.y - (canvas.height / 2) / gameState.camera.zoom;
}

function worldToScreen(worldPos, camera) {
    const screenX = (worldPos.x - camera.x) * camera.zoom;
    const screenY = (worldPos.y - camera.y) * camera.zoom;
    return new Vector(screenX, screenY);
}

function screenToWorld(screenPos, camera) {
    const worldX = (screenPos.x / camera.zoom) + camera.x;
    const worldY = (screenPos.y / camera.zoom) + camera.y;
    return new Vector(worldX, worldY);
}

function drawGrid(ctx, camera) {
    const gridSize = 100 * camera.zoom;
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.1)';
    ctx.lineWidth = 1;

    const startX = -camera.x * camera.zoom % gridSize;
    const startY = -camera.y * camera.zoom % gridSize;

    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function createFloatingText(text, pos, color, size, duration) {
    const ft = new FloatingText(text, pos, color, size, duration);
    gameState.floatingTexts.push(ft);
}
