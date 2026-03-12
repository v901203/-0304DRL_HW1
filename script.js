document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const sizeInput = document.getElementById('grid-size');
    const generateBtn = document.getElementById('generate-btn');
    const workspace = document.getElementById('workspace');
    const gridTitle = document.getElementById('grid-title');
    const gridContainer = document.getElementById('grid-container');
    const evaluateBtn = document.getElementById('evaluate-btn');
    const shortestPathBtn = document.getElementById('shortest-path-btn');
    const resultsContainer = document.getElementById('results-container');
    const valueMatrixContainer = document.getElementById('value-matrix');
    const policyMatrixContainer = document.getElementById('policy-matrix');
    const obsMaxSpan = document.getElementById('obs-max');

    // Parameter sliders
    const gammaSlider = document.getElementById('gamma-slider');
    const rewardSlider = document.getElementById('reward-slider');
    const gammaVal = document.getElementById('gamma-val');
    const rewardVal = document.getElementById('reward-val');

    gammaSlider.addEventListener('input', (e) => gammaVal.textContent = e.target.value);
    rewardSlider.addEventListener('input', (e) => rewardVal.textContent = e.target.value);

    // --- State ---
    let currentN = 0;
    let startCell = null;
    let endCell = null;
    let obstacles = [];
    let maxObstacles = 0;

    // SVG arrows for policy display
    const svgArrows = {
        'U': '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L4 10h5v12h6V10h5L12 2z"/></svg>',
        'D': '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 22l8-8h-5V2h-6v12H4l8 8z"/></svg>',
        'L': '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 12l8-8v5h12v6H10v5L2 12z"/></svg>',
        'R': '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M22 12l-8 8v-5H2v-6h12V4l8 8z"/></svg>'
    };

    // --- Generate Grid ---
    generateBtn.addEventListener('click', () => {
        const n = parseInt(sizeInput.value);
        if (isNaN(n) || n < 3 || n > 10) {
            alert('Please enter a valid number between 3 and 10.');
            return;
        }
        renderGrid(n);
    });

    function renderGrid(n) {
        currentN = n;
        maxObstacles = n - 2;

        // Reset state
        startCell = null;
        endCell = null;
        obstacles = [];
        evaluateBtn.disabled = true;
        shortestPathBtn.disabled = true;
        resultsContainer.style.display = 'none';

        // Update UI
        workspace.style.display = 'block';
        gridTitle.textContent = `${n} x ${n} Square:`;
        obsMaxSpan.textContent = maxObstacles;

        gridContainer.style.gridTemplateColumns = `repeat(${n}, var(--cell-size))`;
        gridContainer.innerHTML = '';

        for (let i = 1; i <= n * n; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = i;
            cell.dataset.id = i;
            cell.addEventListener('click', () => handleCellClick(cell));
            gridContainer.appendChild(cell);
        }
    }

    // --- Cell Click Logic (with toggle off support) ---
    function handleCellClick(cell) {
        const id = parseInt(cell.dataset.id);

        // Toggle off: click again to remove
        if (cell === startCell) {
            cell.classList.remove('start');
            startCell = null;
            checkReady();
            return;
        }
        if (cell === endCell) {
            cell.classList.remove('end');
            endCell = null;
            checkReady();
            return;
        }
        if (obstacles.includes(cell)) {
            cell.classList.remove('obstacle');
            obstacles = obstacles.filter(c => c !== cell);
            checkReady();
            return;
        }

        // Set new
        if (!startCell) {
            cell.classList.add('start');
            startCell = cell;
        } else if (!endCell) {
            cell.classList.add('end');
            endCell = cell;
        } else if (obstacles.length < maxObstacles) {
            cell.classList.add('obstacle');
            obstacles.push(cell);
        } else {
            alert(`You can only set up to ${maxObstacles} obstacles for a ${currentN} x ${currentN} grid.`);
        }
        checkReady();
    }

    function checkReady() {
        const ready = startCell && endCell && obstacles.length === maxObstacles;
        evaluateBtn.disabled = !ready;
        shortestPathBtn.disabled = !ready;
    }

    // --- Helper: get (row, col) from cell ---
    function getCellPos(cell) {
        const index = parseInt(cell.dataset.id) - 1;
        return [Math.floor(index / currentN), index % currentN];
    }

    // --- Movement helper ---
    function getNextState(r, c, a, sz, obsPos) {
        let nr = r, nc = c;
        if (a === 'U') nr -= 1;
        else if (a === 'D') nr += 1;
        else if (a === 'L') nc -= 1;
        else if (a === 'R') nc += 1;

        // Boundary or obstacle check → stay in place
        if (nr < 0 || nr >= sz || nc < 0 || nc >= sz ||
            obsPos.some(o => o[0] === nr && o[1] === nc)) {
            nr = r; nc = c;
        }
        return [nr, nc];
    }

    // --- HW1-2: Policy Evaluation ---
    evaluateBtn.addEventListener('click', () => {
        if (!startCell || !endCell) return;
        runAlgorithm('PE');
    });

    // --- HW1-3: Value Iteration & Optimal Path ---
    shortestPathBtn.addEventListener('click', () => {
        if (!startCell || !endCell) return;
        runAlgorithm('VI');
    });

    function runAlgorithm(algo) {
        const startPos = getCellPos(startCell);
        const endPos = getCellPos(endCell);
        const obsPos = obstacles.map(getCellPos);
        const gamma = parseFloat(gammaSlider.value);
        const stepReward = parseFloat(rewardSlider.value);
        const size = currentN;
        const actionsMap = ['U', 'D', 'L', 'R'];
        const theta = 1e-4;

        // Disable buttons during computation
        evaluateBtn.disabled = true;
        shortestPathBtn.disabled = true;
        const oldPE = evaluateBtn.textContent;
        const oldVI = shortestPathBtn.textContent;
        evaluateBtn.textContent = 'Evaluating...';
        shortestPathBtn.textContent = 'Evaluating...';

        setTimeout(() => {
            const policy = {};
            const V = {};

            // Initialize
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const key = `${r},${c}`;
                    V[key] = 0.0;
                    if ((endPos[0] === r && endPos[1] === c) ||
                        obsPos.some(o => o[0] === r && o[1] === c)) continue;
                    policy[key] = actionsMap[Math.floor(Math.random() * 4)];
                }
            }

            let path = [];

            if (algo === 'PE') {
                // Policy Evaluation: evaluate the random policy
                for (let iter = 0; iter < 1000; iter++) {
                    let delta = 0.0;
                    for (let r = 0; r < size; r++) {
                        for (let c = 0; c < size; c++) {
                            if ((endPos[0] === r && endPos[1] === c) ||
                                obsPos.some(o => o[0] === r && o[1] === c)) continue;
                            const key = `${r},${c}`;
                            let v = V[key];
                            let new_v = 0.0;
                            for (let a of actionsMap) {
                                let [nr, nc] = getNextState(r, c, a, size, obsPos);
                                let reward = (nr === endPos[0] && nc === endPos[1]) ? 10.0 : stepReward;
                                new_v += 0.25 * (reward + gamma * V[`${nr},${nc}`]);
                            }
                            V[key] = new_v;
                            delta = Math.max(delta, Math.abs(v - new_v));
                        }
                    }
                    if (delta < theta) break;
                }
            } else {
                // Value Iteration: find optimal values
                for (let iter = 0; iter < 1000; iter++) {
                    let delta = 0.0;
                    for (let r = 0; r < size; r++) {
                        for (let c = 0; c < size; c++) {
                            if ((endPos[0] === r && endPos[1] === c) ||
                                obsPos.some(o => o[0] === r && o[1] === c)) continue;
                            const key = `${r},${c}`;
                            let v = V[key];
                            let max_v = -Infinity;
                            for (let a of actionsMap) {
                                let [nr, nc] = getNextState(r, c, a, size, obsPos);
                                let reward = (nr === endPos[0] && nc === endPos[1]) ? 10.0 : stepReward;
                                let av = reward + gamma * V[`${nr},${nc}`];
                                if (av > max_v) max_v = av;
                            }
                            V[key] = max_v;
                            delta = Math.max(delta, Math.abs(v - max_v));
                        }
                    }
                    if (delta < theta) break;
                }

                // Extract optimal policy via argmax
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        if ((endPos[0] === r && endPos[1] === c) ||
                            obsPos.some(o => o[0] === r && o[1] === c)) continue;
                        let max_v = -Infinity;
                        let best_a = 'U';
                        for (let a of actionsMap) {
                            let [nr, nc] = getNextState(r, c, a, size, obsPos);
                            let reward = (nr === endPos[0] && nc === endPos[1]) ? 10.0 : stepReward;
                            let av = reward + gamma * V[`${nr},${nc}`];
                            av = Math.round(av * 10000) / 10000;
                            if (av > max_v) { max_v = av; best_a = a; }
                        }
                        policy[`${r},${c}`] = best_a;
                    }
                }

                // Trace optimal path from start to end
                let curr = [...startPos];
                let visited = new Set();
                while (curr[0] !== endPos[0] || curr[1] !== endPos[1]) {
                    let key = `${curr[0]},${curr[1]}`;
                    if (visited.has(key)) break;
                    visited.add(key);
                    path.push([...curr]);
                    let a = policy[key];
                    if (!a) break;
                    curr = getNextState(curr[0], curr[1], a, size, obsPos);
                }
            }

            // Format values
            const formatted_V = {};
            for (const [k, v] of Object.entries(V)) {
                formatted_V[k] = parseFloat(v).toFixed(2);
            }

            displayResults(policy, formatted_V, startPos, endPos, obsPos, path);

            evaluateBtn.disabled = false;
            shortestPathBtn.disabled = false;
            evaluateBtn.textContent = oldPE;
            shortestPathBtn.textContent = oldVI;
        }, 200);
    }

    // --- Display Results ---
    function displayResults(policy, values, startPos, endPos, obsPos, optimalPath) {
        resultsContainer.style.display = 'block';

        valueMatrixContainer.style.gridTemplateColumns = `repeat(${currentN}, 55px)`;
        policyMatrixContainer.style.gridTemplateColumns = `repeat(${currentN}, 55px)`;
        valueMatrixContainer.innerHTML = '';
        policyMatrixContainer.innerHTML = '';

        const isPosInArray = (pos, arr) => arr.some(p => p[0] === pos[0] && p[1] === pos[1]);
        const isPosEqual = (p1, p2) => p1[0] === p2[0] && p1[1] === p2[1];

        for (let r = 0; r < currentN; r++) {
            for (let c = 0; c < currentN; c++) {
                const key = `${r},${c}`;
                const pos = [r, c];

                // Value cell
                const vc = document.createElement('div');
                vc.className = 'cell';
                vc.style.fontSize = '0.85em';
                vc.style.width = '55px';
                vc.style.height = '55px';

                // Policy cell
                const pc = document.createElement('div');
                pc.className = 'cell';
                pc.style.width = '55px';
                pc.style.height = '55px';

                if (isPosEqual(pos, startPos)) {
                    vc.classList.add('start');
                    pc.classList.add('start');
                    vc.textContent = values[key] || '0.00';
                    pc.innerHTML = svgArrows[policy[key]] || '';
                } else if (isPosEqual(pos, endPos)) {
                    vc.classList.add('end');
                    pc.classList.add('end');
                    vc.textContent = '0';
                    pc.innerHTML = '<strong style="font-size:1.3em;">G</strong>';
                } else if (isPosInArray(pos, obsPos)) {
                    vc.classList.add('obstacle');
                    pc.classList.add('obstacle');
                } else {
                    vc.textContent = values[key] || '0.00';
                    pc.innerHTML = svgArrows[policy[key]] || '';
                    // Highlight optimal path cells in yellow
                    if (isPosInArray(pos, optimalPath) && !isPosEqual(pos, startPos)) {
                        vc.classList.add('path');
                        pc.classList.add('path');
                    }
                }

                valueMatrixContainer.appendChild(vc);
                policyMatrixContainer.appendChild(pc);
            }
        }
    }

    // Initial render
    renderGrid(5);
});
