# Career ASsisting Path Application: CASPA

This application assists you in choosing a career path most suitable for you.

## Environment setup (`.env`)

The AI features read your OpenAI key from a `.env` file in this folder. It is
loaded automatically at startup via `python-dotenv`, and `.env` is gitignored so
your key is never committed.

To replicate the setup:

1. Create a file named `.env` in the project root (same folder as `app.py`).
2. Add your key:

   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

3. Install dependencies and run:

   ```bash
   pip install -r requirements.txt
   python app.py
   ```

Then open http://localhost:5050.

> The basic (scikit-learn) prediction works with no key. A key is only needed
> for the AI-powered prediction and follow-up features. You can also paste a key
> directly into the UI instead of using `.env`.
