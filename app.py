from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.json
    n = data.get('n', 5)
    start = data.get('start', 1)
    end = data.get('end', n*n)
    obstacles = data.get('obstacles', [])
    
    gamma = 0.9
    theta = 1e-4

    # Initialize policy
    # arrows: 0: Up, 1: Right, 2: Down, 3: Left
    actions = ['U', 'R', 'D', 'L']
    arrows = {'U': '↑', 'R': '→', 'D': '↓', 'L': '←'}
    
    policy = {}
    for i in range(1, n*n + 1):
        if i == end or i in obstacles:
            policy[i] = None
        else:
            policy[i] = random.choice(actions)

    # Initialize V
    V = {i: 0.0 for i in range(1, n*n + 1)}

    def get_next_state(s, a):
        r = (s - 1) // n
        c = (s - 1) % n
        if a == 'U': r -= 1
        elif a == 'D': r += 1
        elif a == 'L': c -= 1
        elif a == 'R': c += 1
        
        if r < 0 or r >= n or c < 0 or c >= n:
            return s, -1.0 # Bump into wall
        
        next_s = r * n + c + 1
        if next_s in obstacles:
            return s, -1.0 # Bump into obstacle
            
        if next_s == end:
            return next_s, 10.0 # Reach end
            
        return next_s, 0.0 # Normal step
        
    # Policy evaluation
    for _ in range(1000):
        delta = 0
        new_V = V.copy()
        for s in range(1, n*n + 1):
            if s == end:
                new_V[s] = 0.0
                continue
            if s in obstacles:
                continue
                
            a = policy[s]
            next_s, reward = get_next_state(s, a)
            v = reward + gamma * V[next_s]
            delta = max(delta, abs(v - V[s]))
            new_V[s] = v
        V = new_V
        if delta < theta:
            break

    # Format output for matrices
    V_out = {s: round(v, 2) for s, v in V.items()}
    Policy_out = {s: arrows[p] if p else '' for s, p in policy.items()}

    return jsonify({
        'policy': Policy_out,
        'values': V_out
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
