"""
MindWell ML Analyzer
Handles sentiment analysis, crisis risk scoring, and workplace stress detection.
"""

import re
from typing import Optional
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Initialize VADER
_analyzer = SentimentIntensityAnalyzer()

# ── Crisis Keywords (High Severity) ─────────────────────────────────────────
CRISIS_PHRASES = [
    "suicide", "kill myself", "end my life", "want to die", "no reason to live",
    "self harm", "hurt myself", "can't go on", "don't want to be here",
    "wish i was dead", "not worth living", "take my life", "rather be dead"
]

# ── High Stress Workplace Indicators ────────────────────────────────────────
STRESS_HIGH = [
    "breaking down", "mental breakdown", "can't cope", "totally overwhelmed",
    "losing my mind", "can't take it anymore", "falling apart", "burnt out",
    "complete burnout", "having a panic attack", "can't breathe"
]

STRESS_MEDIUM = [
    "deadline", "overloaded", "exhausted", "burned out", "stressed out",
    "overwhelmed", "anxious", "worried", "pressure", "too much work",
    "no work-life balance", "working nonstop", "no sleep", "layoff",
    "fired", "conflict with manager", "micromanaged", "underpaid"
]

# ── Positive Resilience Indicators ──────────────────────────────────────────
POSITIVE_INDICATORS = [
    "feeling better", "making progress", "grateful", "achieved",
    "proud of myself", "accomplished", "feeling hopeful", "motivated",
    "had a good day", "great day", "relaxed", "recharged"
]

# ── Loneliness Indicators ────────────────────────────────────────────────────
LONELINESS_INDICATORS = [
    "lonely", "isolated", "no one understands", "nobody cares",
    "alone", "no friends", "no support", "all by myself", "left out"
]


def _keyword_score(text: str, keywords: list) -> int:
    """Count how many keywords are present in text (case-insensitive)."""
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw in text_lower)


def analyze(text: str) -> dict:
    """
    Main analysis function. Returns a comprehensive emotion profile.

    Returns:
        dict with keys:
          - sentiment       : "positive" | "negative" | "neutral"
          - compound        : float -1.0 to 1.0 (VADER compound score)
          - positive_score  : float 0–1
          - negative_score  : float 0–1
          - neutral_score   : float 0–1
          - crisis_risk     : int 0–100
          - stress_level    : "low" | "medium" | "high" | "critical"
          - stress_score    : int 0–100
          - mood            : str  (friendly label)
          - workplace_flags : list of detected stressor categories
          - loneliness_flag : bool
          - needs_intervention : bool
    """
    if not text or not text.strip():
        return _default_result()

    # ── VADER Sentiment ──────────────────────────────────────────────────────
    scores = _analyzer.polarity_scores(text)
    compound = scores["compound"]
    positive_score = round(scores["pos"], 3)
    negative_score = round(scores["neg"], 3)
    neutral_score  = round(scores["neu"], 3)

    if compound >= 0.05:
        sentiment = "positive"
    elif compound <= -0.05:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    # ── Crisis Risk Calculation ──────────────────────────────────────────────
    crisis_hits = _keyword_score(text, CRISIS_PHRASES)
    # Base crisis risk from VADER negativity + explicit keywords
    crisis_risk = min(100, int(negative_score * 40 + crisis_hits * 35))

    # ── Stress Score ─────────────────────────────────────────────────────────
    high_hits   = _keyword_score(text, STRESS_HIGH)
    medium_hits = _keyword_score(text, STRESS_MEDIUM)
    stress_score = min(100, int(high_hits * 30 + medium_hits * 15 + negative_score * 20))

    if crisis_hits > 0 or stress_score >= 80:
        stress_level = "critical"
    elif stress_score >= 55 or high_hits > 0:
        stress_level = "high"
    elif stress_score >= 25 or medium_hits > 0:
        stress_level = "medium"
    else:
        stress_level = "low"

    # ── Mood Label ───────────────────────────────────────────────────────────
    mood = _derive_mood(compound, crisis_hits, stress_score)

    # ── Workplace Stressor Flags ─────────────────────────────────────────────
    workplace_flags = []
    text_lower = text.lower()
    if any(w in text_lower for w in ["deadline", "overdue", "late submission"]):
        workplace_flags.append("deadline_pressure")
    if any(w in text_lower for w in ["meeting", "standup", "zoom fatigue"]):
        workplace_flags.append("meeting_fatigue")
    if any(w in text_lower for w in ["manager", "boss", "micromanage", "conflict"]):
        workplace_flags.append("management_conflict")
    if any(w in text_lower for w in ["layoff", "fired", "job security", "redundant"]):
        workplace_flags.append("job_insecurity")
    if any(w in text_lower for w in ["work from home", "wfh", "remote", "hybrid"]):
        workplace_flags.append("remote_work_stress")

    # ── Loneliness Flag ──────────────────────────────────────────────────────
    loneliness_flag = _keyword_score(text, LONELINESS_INDICATORS) > 0

    # ── Positive Reinforcement ───────────────────────────────────────────────
    positive_hits = _keyword_score(text, POSITIVE_INDICATORS)

    # ── Emotional Wellness Score (0–100, higher = healthier) ─────────────────
    wellness_score = max(0, min(100,
        int(50 + compound * 40 - crisis_risk * 0.3 - stress_score * 0.1 + positive_hits * 5)
    ))

    return {
        "sentiment": sentiment,
        "compound": round(compound, 4),
        "positive_score": positive_score,
        "negative_score": negative_score,
        "neutral_score": neutral_score,
        "crisis_risk": crisis_risk,
        "stress_level": stress_level,
        "stress_score": stress_score,
        "mood": mood,
        "workplace_flags": workplace_flags,
        "loneliness_flag": loneliness_flag,
        "needs_intervention": crisis_hits > 0 or crisis_risk >= 60,
        "wellness_score": wellness_score,
    }


def _derive_mood(compound: float, crisis_hits: int, stress_score: int) -> str:
    if crisis_hits > 0:
        return "crisis"
    if compound >= 0.5:
        return "happy"
    if compound >= 0.1:
        return "calm"
    if compound >= -0.1:
        return "neutral"
    if stress_score >= 60:
        return "overwhelmed"
    if compound >= -0.4:
        return "anxious"
    return "distressed"


BURNOUT_LEXICON = [
    "burnout", "burnt out", "exhausted", "drained", "no energy",
    "can't cope", "overwhelmed", "detached", "cynical", "depersonalized",
    "workload", "nonstop", "no sleep", "emotionally drained",
]


def analyze_voice(text: str, features: Optional[dict] = None) -> dict:
    """
    Text + optional speech features (words_per_minute, pause_ratio, avg_confidence).
    """
    base = analyze(text)
    features = features or {}
    wpm = float(features.get("words_per_minute") or 0)
    pause_ratio = float(features.get("pause_ratio") or 0)
    confidence = float(features.get("avg_confidence") or 0.85)
    avg_volume = float(features.get("avg_volume") or 0)
    pitch_variance = float(features.get("pitch_variance") or 0)
    avg_pitch_hz = float(features.get("avg_pitch_hz") or 0)

    voice_mood = base["mood"]
    voice_energy = "medium"

    if wpm > 165 and base["stress_score"] > 40:
        voice_mood = "anxious"
        voice_energy = "high"
    elif wpm < 90 and base["compound"] < -0.1:
        voice_mood = "distressed"
        voice_energy = "low"
    elif pause_ratio > 0.35:
        voice_mood = "overwhelmed"
        voice_energy = "low"
    elif base["compound"] > 0.2:
        voice_mood = "calm"
        voice_energy = "medium"

    if pitch_variance > 80 and avg_pitch_hz > 220:
        voice_mood = "anxious"
        voice_energy = "high"
    elif avg_volume < 25 and base["compound"] < 0:
        voice_mood = "distressed"
        voice_energy = "low"
    elif avg_volume > 60 and pitch_variance < 30:
        voice_mood = "overwhelmed"
        voice_energy = "high"

    stress_boost = min(15, int(pause_ratio * 20 + max(0, (wpm - 140) * 0.05)))
    stress_boost += min(10, int(pitch_variance / 25))
    if avg_volume < 20:
        stress_boost += 4
    if confidence < 0.6:
        stress_boost += 5

    base["voice_mood"] = voice_mood
    base["voice_energy"] = voice_energy
    base["voice_stress_boost"] = stress_boost
    base["voice_prosody"] = {
        "avg_volume": round(avg_volume, 1),
        "pitch_variance": round(pitch_variance, 1),
        "avg_pitch_hz": round(avg_pitch_hz, 1),
    }
    base["stress_score"] = min(100, base["stress_score"] + stress_boost)
    return base


def predict_burnout(metrics: dict) -> dict:
    """
    ML burnout risk from aggregated user metrics + recent message texts.
    """
    avg_stress = float(metrics.get("avg_stress_score") or 30)
    avg_crisis = float(metrics.get("avg_crisis_risk") or 20)
    avg_wellness = float(metrics.get("avg_wellness_score") or 70)
    avg_compound = float(metrics.get("avg_compound") or 0)
    message_count = int(metrics.get("message_count") or 0)
    recent_texts = metrics.get("recent_texts") or []

    lex_hits = 0
    stress_from_text = []
    for t in recent_texts[-12:]:
        if not t:
            continue
        tl = t.lower()
        lex_hits += sum(1 for kw in BURNOUT_LEXICON if kw in tl)
        stress_from_text.append(analyze(t)["stress_score"])

    avg_text_stress = (
        sum(stress_from_text) / len(stress_from_text) if stress_from_text else avg_stress
    )

    overwhelmed_ratio = float(metrics.get("overwhelmed_ratio") or 0)
    declining = avg_compound < -0.15 and message_count >= 3

    risk = (
        avg_stress * 0.32
        + avg_crisis * 0.22
        + avg_text_stress * 0.28
        + (100 - avg_wellness) * 0.12
        + min(20, lex_hits * 4)
        + overwhelmed_ratio * 15
    )
    if declining:
        risk += 8
    if message_count < 2:
        risk *= 0.75

    risk = int(max(5, min(100, round(risk))))

    if risk >= 70:
        level, label = "high", "High burnout risk"
        recommendation = "Prioritize recovery: boundaries, sleep, and talk to your AI companion or a professional."
    elif risk >= 45:
        level, label = "moderate", "Moderate burnout signals"
        recommendation = "Watch workload patterns; schedule micro-breaks and a daily check-in."
    else:
        level, label = "low", "Resilience holding"
        recommendation = "Keep your current rhythm; maintain mood check-ins and focus sessions."

    drivers = []
    if avg_stress >= 50:
        drivers.append("elevated_stress")
    if avg_crisis >= 35:
        drivers.append("crisis_signals")
    if lex_hits >= 2:
        drivers.append("burnout_language")
    if avg_wellness < 50:
        drivers.append("low_wellness")
    if declining:
        drivers.append("declining_sentiment")

    return {
        "burnout_risk": risk,
        "burnout_level": level,
        "burnout_label": label,
        "recommendation": recommendation,
        "drivers": drivers,
        "model": "mindwell-vader-burnout-v1",
        "confidence": min(0.95, 0.5 + message_count * 0.05),
    }


def _default_result() -> dict:
    return {
        "sentiment": "neutral",
        "compound": 0.0,
        "positive_score": 0.0,
        "negative_score": 0.0,
        "neutral_score": 1.0,
        "crisis_risk": 0,
        "stress_level": "low",
        "stress_score": 0,
        "mood": "neutral",
        "workplace_flags": [],
        "loneliness_flag": False,
        "needs_intervention": False,
        "wellness_score": 75,
    }
