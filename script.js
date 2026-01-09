class UnitCircleGame {
    // =========================================================================
    // 1. CORE & INITIALIZATION
    // =========================================================================
    constructor() {
        this.canvas = document.getElementById('circleCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Settings & State
        this.level = 1;
        this.padding = 50;
        this.size = this.canvas.width;
        this.radius = (this.size - 2 * this.padding) / 2;
        this.centerX = this.size / 2;
        this.centerY = this.size / 2;
        
        // Game Logic State
        this.currentTarget = null;
        this.lastAngle = null;
        this.points = this.generatePoints();
        this.streak = 0;
        this.maxStreak = 20;
        this.hitRadius = 22;
        
        // UI State
        this.showTempTriangle = true;
        this.hoveredPoint = null;

        this.init();
    }

    init() {
        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredPoint = null;
            this.render();
        });

        this.updateProgressUI();
        this.startNewTurn();
    }

    // =========================================================================
    // 2. MATH & LOGIC
    // =========================================================================
    formatLaTeX(n, d) {
            if (n === 0) return "0";
            const sign = n < 0 ? "-" : "";
            const absN = Math.abs(n);
            const numerator = absN === 1 ? "\\pi" : `${absN}\\pi`;
            return d === 1 ? `${sign}${numerator}` : `${sign}\\frac{${numerator}}{${d}}`;
        }


    generatePoints() {
        const baseAngles = [
            { n: 0, d: 1 }, { n: 1, d: 6 }, { n: 1, d: 4 }, { n: 1, d: 3 },
            { n: 1, d: 2 }, { n: 2, d: 3 }, { n: 3, d: 4 }, { n: 5, d: 6 },
            { n: 1, d: 1 }, { n: 7, d: 6 }, { n: 5, d: 4 }, { n: 4, d: 3 },
            { n: 3, d: 2 }, { n: 5, d: 3 }, { n: 7, d: 4 }, { n: 11, d: 6 }
        ];

        return baseAngles.map(a => {
            const val = (a.n * Math.PI) / a.d;
            return {
                x: Math.cos(val),
                y: Math.sin(val),
                baseVal: val,
                n: a.n,
                d: a.d
            };
        });
    }


    getVisualAngle(hoveredBaseVal, targetVal) {
        let visualAngle = hoveredBaseVal;

        if (targetVal < 0) {
            if (hoveredBaseVal > 0) {
                visualAngle = hoveredBaseVal - 2 * Math.PI;
            } else if (hoveredBaseVal === 0 && targetVal <= -Math.PI) {
                visualAngle = -2 * Math.PI;
            }
        } else if (targetVal >= 2 * Math.PI) {
            visualAngle = hoveredBaseVal + 2 * Math.PI;
        }
        return visualAngle;
    }

    toCanvasX(logicX) { return this.centerX + logicX * this.radius; }
    toCanvasY(logicY) { return this.centerY - logicY * this.radius; }

    // =========================================================================
    // 3. GAMEPLAY & INPUT
    // =========================================================================
    startNewTurn() {
        let randomPoint;
        do {
            randomPoint = this.points[Math.floor(Math.random() * this.points.length)];
        } while (this.lastAngle !== null && randomPoint.baseVal === this.lastAngle);

        this.lastAngle = randomPoint.baseVal;

        let n = randomPoint.n;
        let d = randomPoint.d;

        // L1: tylko [0, 2pi), L2: losujemy przesunięcie o -2pi, 0 lub +2pi
        if (this.level === 2) {
            const shift = Math.floor(Math.random() * 3) - 1; 
            n += shift * 2 * d;
        }

        this.currentTarget = {
            label: this.formatLaTeX(n, d),
            baseVal: randomPoint.baseVal,
            val: (n * Math.PI) / d
        };

        const qSpan = document.getElementById('target-question');
        qSpan.innerHTML = `\\( ${this.currentTarget.label} \\)`;
        if (window.MathJax) MathJax.typesetPromise([qSpan]);
        this.render();
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const hit = this.points.find(p => {
            const dist = Math.sqrt((mouseX - this.toCanvasX(p.x))**2 + (mouseY - this.toCanvasY(p.y))**2);
            return dist < this.hitRadius;
        });

        if (hit) {
            this.showFeedback(hit.baseVal === this.currentTarget.baseVal);
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const found = this.points.find(p => {
            const dist = Math.sqrt((mouseX - this.toCanvasX(p.x))**2 + (mouseY - this.toCanvasY(p.y))**2);
            return dist < this.hitRadius;
        });

        if (this.hoveredPoint !== found) {
            this.hoveredPoint = found;
            this.canvas.style.cursor = found ? 'pointer' : 'default';
            this.render();
        }
    }

    // =========================================================================
    // 4. UI & FEEDBACK
    // =========================================================================
    setLevel(lvl) {
        this.level = lvl;
        this.streak = 0;
        document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-l${lvl}`).classList.add('active');
        
        const names = ["", "Angle Recognition", "Extended Range", "Equations (sin/cos)", "Tan / Cotan", "Complex Numbers"];
        document.getElementById('level-name').innerText = `Level ${lvl}: ${names[lvl]}`;
        
        this.updateProgressUI();
        this.startNewTurn();
    }

    toggleTriangle() {
        this.showTempTriangle = !this.showTempTriangle;
        const bg = document.getElementById('toggle-bg');
        const circle = document.getElementById('toggle-circle');
        
        bg.style.backgroundColor = this.showTempTriangle ? 'var(--colF)' : 'var(--colC)';
        circle.style.transform = this.showTempTriangle ? 'translateX(24px)' : 'translateX(0)';
        
        this.render();
    }

    updateProgressUI() {
        const container = document.getElementById('progress-dots');
        if (!container) return;
        
        container.innerHTML = '';
        for (let i = 0; i < this.maxStreak; i++) {
            const dot = document.createElement('div');
            dot.className = `w-3 h-3 rounded-full border border-colC transition-all duration-300`;
            if (i < this.streak) {
                dot.style.backgroundColor = 'var(--colG)';
                dot.style.borderColor = 'var(--colG)';
                dot.style.boxShadow = '0 0 6px rgba(40, 80, 46, 0.4)';
            }
            container.appendChild(dot);
        }
    }

    showFeedback(isCorrect) {
        const fb = document.getElementById('feedback');
        const imgName = isCorrect ? 'tick2.svg' : 'cross2.svg';
        fb.innerHTML = `<img src="images/${imgName}" class="w-64 h-64 animate-pop" alt="feedback">`;
        fb.classList.remove('hidden');
        this.canvas.style.pointerEvents = 'none';

        if (isCorrect) {
            this.streak = Math.min(this.streak + 1, this.maxStreak);
        } else {
            this.streak = 0;
        }
        
        this.updateProgressUI();
        setTimeout(() => {
            fb.classList.add('hidden');
            this.canvas.style.pointerEvents = 'auto';
            if (isCorrect) this.startNewTurn();
        }, isCorrect ? 300 : 200);
    }

    // =========================================================================
    // 5. RENDERING ENGINE
    // =========================================================================
    render() {
        this.ctx.clearRect(0, 0, this.size, this.size);
        
        this.drawAxes();
        this.drawTicks();
        this.drawLabels();
        this.drawMainCircle();
        
        if (this.showTempTriangle && this.hoveredPoint) {
            this.drawHelperTriangle();
        }
        
        this.drawPoints();
    }
    // -------------------------------------------------------------------------

    drawAxes() {
        this.ctx.strokeStyle = '#94a3b8';
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.centerY); this.ctx.lineTo(this.size, this.centerY);
        this.ctx.moveTo(this.centerX, 0); this.ctx.lineTo(this.centerX, this.size);
        this.ctx.stroke();

        // Strzałki: oś X (0 rad), oś Y (-PI/2 rad)
        this.drawArrow(this.size, this.centerY, 0);
        this.drawArrow(this.centerX, 0, -Math.PI / 2);
    }

    drawArrow(x, y, angle) {
        const arrowSize = 10;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-arrowSize, -arrowSize / 2);
        this.ctx.lineTo(-arrowSize, arrowSize / 2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }

    drawTicks() {
        const tickValues = [0.5, Math.sqrt(2)/2, Math.sqrt(3)/2];
        const tickSize = 5; 
        this.ctx.strokeStyle = '#94a3b8'; 
        this.ctx.lineWidth = 1.2; 
        this.ctx.beginPath();
        tickValues.forEach(v => {
            [v, -v].forEach(pos => {
                const x = this.toCanvasX(pos);
                this.ctx.moveTo(x, this.centerY - tickSize);
                this.ctx.lineTo(x, this.centerY + tickSize);
                const y = this.toCanvasY(pos);
                this.ctx.moveTo(this.centerX - tickSize, y);
                this.ctx.lineTo(this.centerX + tickSize, y);
            });
        });
        this.ctx.stroke();
    }

    drawLabels() {
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = '14px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('1', this.toCanvasX(1) + 10, this.centerY + 20);
        this.ctx.fillText('-1', this.toCanvasX(-1) - 15, this.centerY + 20);
        this.ctx.fillText('1', this.centerX + 15, this.toCanvasY(1) - 5 );
        this.ctx.fillText('-1', this.centerX + 15, this.toCanvasY(-1) + 15);
        this.ctx.font = 'bold 16px Inter, sans-serif';
        this.ctx.fillText('x', this.size - 15, this.centerY - 10);
        this.ctx.fillText('y', this.centerX + 15, 15);
    }

    drawMainCircle() {
        this.ctx.strokeStyle = 'var(--colA)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawHelperTriangle() {
        if (!this.hoveredPoint || !this.currentTarget) return;

        const hX = this.toCanvasX(this.hoveredPoint.x);
        const hY = this.toCanvasY(this.hoveredPoint.y);
        const visualAngle = this.getVisualAngle(this.hoveredPoint.baseVal, this.currentTarget.val);

        this.ctx.save();
        this.drawTriangleComponents(hX, hY);

        if (Math.abs(this.currentTarget.val) < 2 * Math.PI) {
            this.drawSimpleArc(visualAngle);
        } else {
            this.drawSpiral(visualAngle);
        }

        this.ctx.restore();
    }

    drawTriangleComponents(hX, hY) {
        this.ctx.strokeStyle = 'var(--colF)';
        this.ctx.lineWidth = 2.5;

        // Linia promienia (przerywana)
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX, this.centerY);
        this.ctx.lineTo(hX, hY);
        this.ctx.stroke();

        // Rzut na oś X (przerywana, inny kolor dla czytelności)
        this.ctx.strokeStyle = '#94a3b8';
        this.ctx.setLineDash([2, 3]); 
        this.ctx.beginPath();
        this.ctx.moveTo(hX, hY);
        this.ctx.lineTo(hX, this.centerY);
        this.ctx.stroke();

        // Obwódka wokół najechanego punktu
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = 'var(--colF)';
        this.ctx.beginPath();
        this.ctx.arc(hX, hY, 12, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawSimpleArc(angle) {
        this.ctx.strokeStyle = 'var(--colF)';
        this.ctx.setLineDash([]);
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        // Standardowy łuk o stałym promieniu 40
        // angle >= 0 ? true : false załatwia kierunek rysowania dla kątów ujemnych
        this.ctx.arc(this.centerX, this.centerY, 40, 0, -angle, angle >= 0);
        this.ctx.stroke();
    }

    drawSpiral(angle) {
        this.ctx.strokeStyle = 'var(--colF)';
        this.ctx.setLineDash([]);
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();

        // Zwiększamy liczbę segmentów dla gładkości przy wielu obrotach
        const segments = Math.max(60, Math.abs(angle) * 30);
        const startRadius = 35; // Startujemy nieco bliżej środka niż standardowy łuk
        const growth = 4;       // Jak bardzo spirala "puchnie" z każdym radianem

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const currA = angle * t;
            const currR = startRadius + (Math.abs(currA) * growth);
            
            const x = this.centerX + Math.cos(currA) * currR;
            const y = this.centerY - Math.sin(currA) * currR;

            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
    }

    drawPoints() {
        this.points.forEach(p => {
            this.ctx.fillStyle = 'var(--colC)';
            this.ctx.beginPath();
            this.ctx.arc(this.toCanvasX(p.x), this.toCanvasY(p.y), 8, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}

const game = new UnitCircleGame();