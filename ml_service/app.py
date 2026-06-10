"""
MindWell ML Engine – Flask REST API
Runs on port 5001 alongside the Node.js backend (port 5000).
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import analyzer

app = Flask(__name__)
CORS(app)


# ── Health Check ─────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "MindWell ML Engine"})


# ── Single Message Analysis ───────────────────────────────────────────────────
@app.route("/analyze", methods=["POST"])
def analyze_message():
    """
    Analyze a single chat message.
    Body: { "text": "..." }
    Returns full emotion profile.
    """
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "text field is required"}), 400

    result = analyzer.analyze(text)
    return jsonify(result)


# ── Batch / Session Analysis ──────────────────────────────────────────────────
@app.route("/analyze/session", methods=["POST"])
def analyze_session():
    """
    Analyze an entire chat session to derive trends.
    Body: { "messages": [{ "text": "...", "sender": "user" }, ...] }
    Returns aggregated session analytics.
    """
    data = request.get_json(silent=True) or {}
    messages = data.get("messages", [])

    if not messages:
        return jsonify({"error": "messages array is required"}), 400

    user_messages = [m["text"] for m in messages if m.get("sender") == "user"]

    if not user_messages:
        return jsonify({"error": "No user messages found in session"}), 400

    # Analyze each user message
    analyses = [analyzer.analyze(t) for t in user_messages]

    # Aggregate metrics
    avg_compound      = sum(a["compound"]       for a in analyses) / len(analyses)
    avg_crisis_risk   = sum(a["crisis_risk"]    for a in analyses) / len(analyses)
    avg_stress_score  = sum(a["stress_score"]   for a in analyses) / len(analyses)
    avg_wellness      = sum(a["wellness_score"] for a in analyses) / len(analyses)

    # Mood distribution
    mood_distribution = {}
    for a in analyses:
        mood = a["mood"]
        mood_distribution[mood] = mood_distribution.get(mood, 0) + 1

    # Collect all unique workplace flags
    all_flags = []
    for a in analyses:
        all_flags.extend(a["workplace_flags"])
    unique_flags = list(set(all_flags))

    # Overall trend
    if avg_compound > 0.1:
        overall_trend = "improving"
    elif avg_compound < -0.1:
        overall_trend = "declining"
    else:
        overall_trend = "stable"

    # Crisis alert if ANY message triggered it
    any_crisis = any(a["needs_intervention"] for a in analyses)

    return jsonify({
        "session_summary": {
            "total_user_messages": len(user_messages),
            "avg_compound":        round(avg_compound, 4),
            "avg_crisis_risk":     round(avg_crisis_risk, 1),
            "avg_stress_score":    round(avg_stress_score, 1),
            "avg_wellness_score":  round(avg_wellness, 1),
            "mood_distribution":   mood_distribution,
            "workplace_flags":     unique_flags,
            "overall_trend":       overall_trend,
            "any_crisis_detected": any_crisis,
        },
        "message_analyses": analyses,
    })


# ── Workplace Stressor Deep Dive ──────────────────────────────────────────────
@app.route("/analyze/stressors", methods=["POST"])
def analyze_stressors():
    """
    Given a list of user messages, return a ranked list of detected stressors.
    Body: { "messages": ["...", "..."] }
    """
    data = request.get_json(silent=True) or {}
    messages = data.get("messages", [])

    flag_counts = {}
    for text in messages:
        result = analyzer.analyze(text)
        for flag in result["workplace_flags"]:
            flag_counts[flag] = flag_counts.get(flag, 0) + 1

    ranked = sorted(flag_counts.items(), key=lambda x: x[1], reverse=True)

    return jsonify({
        "stressors": [{"category": k, "count": v} for k, v in ranked]
    })


# ── Burnout prediction (aggregated metrics) ───────────────────────────────────
@app.route("/predict/burnout", methods=["POST"])
def predict_burnout_route():
    """
    Body: {
      avg_stress_score, avg_crisis_risk, avg_wellness_score, avg_compound,
      message_count, overwhelmed_ratio, recent_texts: [...]
    }
    """
    data = request.get_json(silent=True) or {}
    result = analyzer.predict_burnout(data)
    return jsonify(result)


# ── Voice + text emotion (speech features optional) ───────────────────────────
@app.route("/analyze/voice", methods=["POST"])
def analyze_voice_route():
    """
    Body: { "text": "...", "features": { words_per_minute, pause_ratio, avg_confidence } }
    """
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    features = data.get("features") or {}

    if not text:
        return jsonify({"error": "text field is required"}), 400

    result = analyzer.analyze_voice(text, features)
    return jsonify(result)


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("[MindWell ML Engine] Starting on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=True)
