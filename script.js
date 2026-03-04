document.addEventListener('DOMContentLoaded', () => {
    const sizeInput = document.getElementById('grid-size');
    const generateBtn = document.getElementById('generate-btn');
    const gridTitle = document.getElementById('grid-title');
    const gridContainer = document.getElementById('grid-container');
    const evaluateBtn = document.getElementById('evaluate-btn');
    const resultsContainer = document.getElementById('results-container');
    const valueMatrixContainer = document.getElementById('value-matrix');
    const policyMatrixContainer = document.getElementById('policy-matrix');

    const obsCountSpan = document.getElementById('obs-count');
    const obsMaxSpan = document.getElementById('obs-max');
    const obsInstruction = document.getElementById('obstacle-instruction');

    let currentN = 5;
    let startCell = null;
    let endCell = null;
    let obstacles = [];
    let maxObstacles = 0;

    function renderGrid(n) {
        currentN = n;
        maxObstacles = n - 2;

        // Reset state
        startCell = null;
        endCell = null;
        obstacles = [];
        evaluateBtn.disabled = true;
        resultsContainer.style.display = 'none';

        // Update UI
        gridTitle.textContent = `${n} x ${n} Square:`;
        obsCountSpan.textContent = "0";
        obsMaxSpan.textContent = maxObstacles;
        obsInstruction.style.display = 'none';

        gridContainer.style.gridTemplateColumns = `repeat(${n}, var(--cell-size))`;
        gridContainer.innerHTML = '';

        for (let i = 1; i <= n * n; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = i;
            cell.dataset.id = i;
            cell.addEventListener('click', handleCellClick);
            gridContainer.appendChild(cell);
        }
    }

    function handleCellClick(e) {
        const cell = e.target;
        const id = parseInt(cell.dataset.id);

        // Already assigned
        if (id === startCell || id === endCell || obstacles.includes(id)) {
            return;
        }

        if (startCell === null) {
            startCell = id;
            cell.classList.add('start');
        } else if (endCell === null) {
            endCell = id;
            cell.classList.add('end');
            obsInstruction.style.display = 'block';
            checkReady();
        } else if (obstacles.length < maxObstacles) {
            obstacles.push(id);
            cell.classList.add('obstacle');
            obsCountSpan.textContent = obstacles.length;
            checkReady();
        }
    }

    function checkReady() {
        if (startCell !== null && endCell !== null && obstacles.length === maxObstacles) {
            evaluateBtn.disabled = false;
        } else {
            evaluateBtn.disabled = true;
        }
    }

    generateBtn.addEventListener('click', () => {
        let n = parseInt(sizeInput.value);
        if (isNaN(n) || n < 3 || n > 10) {
            alert('Please enter a valid number between 3 and 10.');
            return;
        }
        renderGrid(n);
    });

    // Local RL logic
    function evaluatePolicyLocal(n, start, end, obstacles) {
        const gamma = 0.9;
        const theta = 1e-4;
        const actions = ['U', 'R', 'D', 'L'];
        const arrows = { 'U': '↑', 'R': '→', 'D': '↓', 'L': '←' };

        let policy = {};
        for (let i = 1; i <= n * n; i++) {
            if (i === end || obstacles.includes(i)) {
                policy[i] = null;
            } else {
                policy[i] = actions[Math.floor(Math.random() * actions.length)];
            }
        }

        let V = {};
        for (let i = 1; i <= n * n; i++) {
            V[i] = 0.0;
        }

        function getNextState(s, a) {
            let r = Math.floor((s - 1) / n);
            let c = (s - 1) % n;

            if (a === 'U') r -= 1;
            else if (a === 'D') r += 1;
            else if (a === 'L') c -= 1;
            else if (a === 'R') c += 1;

            if (r < 0 || r >= n || c < 0 || c >= n) {
                return { next_s: s, reward: -1.0 };
            }

            let next_s = r * n + c + 1;
            if (obstacles.includes(next_s)) {
                return { next_s: s, reward: -1.0 };
            }

            if (next_s === end) {
                return { next_s: next_s, reward: 10.0 };
            }

            return { next_s: next_s, reward: 0.0 };
        }

        for (let iter = 0; iter < 1000; iter++) {
            let delta = 0;
            let new_V = { ...V };

            for (let s = 1; s <= n * n; s++) {
                if (s === end) {
                    new_V[s] = 0.0;
                    continue;
                }
                if (obstacles.includes(s)) continue;

                let a = policy[s];
                let { next_s, reward } = getNextState(s, a);
                let v = reward + gamma * V[next_s];
                delta = Math.max(delta, Math.abs(v - V[s]));
                new_V[s] = v;
            }
            V = new_V;
            if (delta < theta) break;
        }

        let V_out = {};
        let Policy_out = {};

        for (let s = 1; s <= n * n; s++) {
            V_out[s] = Math.round(V[s] * 100) / 100;
            Policy_out[s] = policy[s] ? arrows[policy[s]] : '';
        }

        return { policy: Policy_out, values: V_out };
    }

    evaluateBtn.addEventListener('click', () => {
        evaluateBtn.disabled = true;
        evaluateBtn.textContent = 'Evaluating...';

        setTimeout(() => {
            const data = evaluatePolicyLocal(currentN, startCell, endCell, obstacles);
            renderResults(data);
            evaluateBtn.disabled = false;
            evaluateBtn.textContent = 'Evaluate Policy';
        }, 300); // Simulate processing time
    });

    function renderResults(data) {
        resultsContainer.style.display = 'block';

        valueMatrixContainer.style.gridTemplateColumns = `repeat(${currentN}, var(--cell-size))`;
        policyMatrixContainer.style.gridTemplateColumns = `repeat(${currentN}, var(--cell-size))`;

        valueMatrixContainer.innerHTML = '';
        policyMatrixContainer.innerHTML = '';

        const policy = data.policy;
        const values = data.values;

        for (let i = 1; i <= currentN * currentN; i++) {
            // Value cell
            const vCell = document.createElement('div');
            vCell.className = 'cell';

            // Policy cell
            const pCell = document.createElement('div');
            pCell.className = 'cell';

            if (i === endCell) {
                vCell.classList.add('end');
                vCell.textContent = values[i];
                pCell.classList.add('end');
                pCell.textContent = 'End';
            } else if (obstacles.includes(i)) {
                vCell.classList.add('obstacle');
                pCell.classList.add('obstacle');
            } else {
                if (i === startCell) {
                    vCell.classList.add('start');
                    pCell.classList.add('start');
                }
                vCell.textContent = values[i];
                pCell.textContent = policy[i];
            }

            valueMatrixContainer.appendChild(vCell);
            policyMatrixContainer.appendChild(pCell);
        }
    }

    // Initial render
    renderGrid(5);
});
