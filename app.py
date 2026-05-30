import os
import json
import threading
from flask import Flask, render_template, jsonify, request

try:
    from dotenv import load_dotenv
except ImportError:  # dotenv is optional — the app still runs without it
    def load_dotenv(*args, **kwargs):
        return False

from ml.predictor import CaspaPredictor, USER_CAREERS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'career_path_in_all_field.csv')

# Load OPENAI_API_KEY (and any other vars) from this folder's .env file.
load_dotenv(os.path.join(BASE_DIR, '.env'))

app = Flask(__name__)
predictor = CaspaPredictor(DATA_PATH)

# ── OpenAI config ──────────────────────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
OPENAI_MODEL  = "gpt-5.4-nano"

SKILL_LABELS = {
    'coding':         'Coding & Technology',
    'communication':  'Communication',
    'problem_solving':'Problem Solving & Logic',
    'teamwork':       'Teamwork & Collaboration',
    'analytical':     'Analytical Thinking',
    'presentation':   'Presentation Skills',
    'networking':     'Networking & Social Skills',
}
SKILL_LEVELS = ['None', 'Basic', 'Intermediate', 'Advanced', 'Expert']


def build_profile_text(data):
    lines = []
    name = data.get('child_name', '').strip()
    if name:
        lines.append(f"Child's Name: {name}")
    lines.append(f"Field of Interest: {data.get('field', 'Not specified')}")
    lines.append(f"Academic Performance (GPA): {data.get('gpa', 3.0)} / 5.0")
    lines.append(f"Active Hobbies / Clubs: {data.get('extracurricular', 0)}")
    prog_map = {0: 'None', 1: '1–2 programmes', 2: '3 or more'}
    lines.append(f"Workshops / Programmes: {prog_map.get(int(data.get('internships', 0)), 'None')}")
    lines.append(f"Independent Projects Completed: {data.get('projects', 0)}")
    lines.append(f"Leadership Experience: {'Yes' if data.get('leadership', 0) else 'No'}")
    lines.append(f"Specialised Courses Taken: {data.get('field_courses', 0)}")
    lines.append(f"Research / Science Fair Experience: {'Yes' if data.get('research', 0) else 'No'}")
    lines.append(f"Certifications / Awards: {'Yes' if data.get('certifications', 0) else 'No'}")
    lines.append("\nSkill Levels:")
    for key, label in SKILL_LABELS.items():
        val = max(0, min(4, int(data.get(key, 2))))
        lines.append(f"  • {label}: {SKILL_LEVELS[val]} ({val}/4)")
    return '\n'.join(lines)


# ── Training ───────────────────────────────────────────────────────────────────
def train_in_background():
    try:
        print('[CASPA] Training models...')
        accs = predictor.train()
        print(f'[CASPA] Training complete. Accuracies: {accs}')
    except Exception as e:
        print(f'[CASPA] Training failed: {e}')


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/status')
def status():
    return jsonify({
        'trained': predictor.is_trained,
        'accuracies': predictor.accuracies,
        'error': predictor.training_error,
        'fields': predictor.fields,
    })


@app.route('/api/predict', methods=['POST'])
def predict():
    if not predictor.is_trained:
        return jsonify({'success': False, 'error': 'Models are still training. Please wait.'}), 503
    try:
        data = request.get_json()
        result = predictor.predict(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ai-predict', methods=['POST'])
def ai_predict():
    """Career prediction using OpenAI GPT."""
    try:
        from openai import OpenAI
    except ImportError:
        return jsonify({'success': False, 'error': 'openai package not installed. Run: pip install openai'}), 500

    data = request.get_json()
    custom_key = (data.get('api_key') or '').strip()
    api_key = custom_key if custom_key else OPENAI_API_KEY

    profile_text = build_profile_text(data)
    careers_list  = '\n'.join(f"{i+1}. {c}" for i, c in enumerate(USER_CAREERS))

    prompt = f"""You are CASPA — Career ASsisted Path App, a warm and expert AI career counsellor for children.

Analyse the child profile below and recommend the best career paths from the provided list.

## Child Profile
{profile_text}

## Available Career Categories (choose ONLY from this exact list)
{careers_list}

## Response Format
Reply in this exact JSON (no extra keys):
{{
  "top_3": [
    {{"career": "<exact name from list>", "confidence": <integer 1-100>, "reason": "<one sentence>", "icon": "<one emoji>"}},
    {{"career": "<exact name from list>", "confidence": <integer 1-100>, "reason": "<one sentence>", "icon": "<one emoji>"}},
    {{"career": "<exact name from list>", "confidence": <integer 1-100>, "reason": "<one sentence>", "icon": "<one emoji>"}}
  ],
  "analysis": "<2-3 warm, encouraging paragraphs analysing the child's aptitudes and why these careers fit>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>", "<strength 4>"],
  "advice": "<one warm, specific paragraph of actionable guidance for this child's development>"
}}"""

    try:
        client  = OpenAI(api_key=api_key)
        resp    = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content)
        result['success'] = True
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ai-followup', methods=['POST'])
def ai_followup():
    """Answer a follow-up question in context of previous AI analysis."""
    try:
        from openai import OpenAI
    except ImportError:
        return jsonify({'success': False, 'error': 'openai package not installed'}), 500

    data = request.get_json()
    custom_key = (data.get('api_key') or '').strip()
    api_key    = custom_key if custom_key else OPENAI_API_KEY

    question   = (data.get('question') or '').strip()
    if not question:
        return jsonify({'success': False, 'error': 'No question provided'}), 400

    profile_text      = build_profile_text(data)
    previous_analysis = data.get('previous_analysis', '')
    top_career        = data.get('top_career', 'the recommended career')

    prompt = f"""You are CASPA — Career ASsisted Path App, a warm and expert AI career counsellor for children.

You previously analysed this child's profile and recommended {top_career} as their top career match.

## Child Profile
{profile_text}

## Your Previous Analysis
{previous_analysis}

## Follow-up Question
{question}

Answer warmly and specifically in 2–4 sentences. Be encouraging, practical, and directly address the question.
Do NOT use JSON format — reply in plain, friendly text."""

    try:
        client = OpenAI(api_key=api_key)
        resp   = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return jsonify({'success': True, 'answer': resp.choices[0].message.content})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    t = threading.Thread(target=train_in_background, daemon=True)
    t.start()
    app.run(debug=False, host='0.0.0.0', port=5050, use_reloader=False)
