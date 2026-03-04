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

    evaluateBtn.addEventListener('click', () => {
        evaluateBtn.disabled = true;
        evaluateBtn.textContent = 'Evaluating...';

        const payload = {
            n: currentN,
            start: startCell,
            end: endCell,
            obstacles: obstacles
        };

        fetch('/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            renderResults(data);
        })
        .catch(err => {
            console.error(err);
            alert('An error occurred during evaluation.');
        })
        .finally(() => {
            evaluateBtn.disabled = false;
            evaluateBtn.textContent = 'Evaluate Policy';
        });
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
