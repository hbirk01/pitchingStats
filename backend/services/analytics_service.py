"""
Regression and prediction models for pitcher analytics.
- ERA prediction from underlying metrics
- Breakout candidate scoring
- Stuff+ proxy calculation
- PLV (Pitch Level Value) estimation
"""
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import r2_score
from typing import Optional


# ── Stuff+ Proxy ─────────────────────────────────────────────────────────────

STUFF_WEIGHTS = {
    "velocity": 0.35,
    "induced_vb": 0.25,
    "spin_rate": 0.15,
    "horizontal_break": 0.10,
    "extension": 0.10,
    "spin_efficiency": 0.05,
}

LEAGUE_AVGS = {
    "FF": {"velocity": 93.5, "induced_vb": 16.5, "spin_rate": 2260, "horizontal_break": -5.2, "extension": 6.3, "spin_efficiency": 95.0},
    "SL": {"velocity": 85.3, "induced_vb": -0.5, "spin_rate": 2430, "horizontal_break": 5.1, "extension": 6.1, "spin_efficiency": 52.0},
    "CB": {"velocity": 78.2, "induced_vb": -12.1, "spin_rate": 2570, "horizontal_break": 4.8, "extension": 6.0, "spin_efficiency": 73.0},
    "CH": {"velocity": 84.5, "induced_vb": 4.5, "spin_rate": 1820, "horizontal_break": -8.0, "extension": 6.2, "spin_efficiency": 48.0},
    "SI": {"velocity": 92.8, "induced_vb": 10.2, "spin_rate": 2140, "horizontal_break": -13.2, "extension": 6.3, "spin_efficiency": 88.0},
    "FC": {"velocity": 88.1, "induced_vb": 9.1, "spin_rate": 2360, "horizontal_break": -1.2, "extension": 6.2, "spin_efficiency": 80.0},
}

LEAGUE_STD = {
    "FF": {"velocity": 2.5, "induced_vb": 3.5, "spin_rate": 220, "horizontal_break": 3.2, "extension": 0.8, "spin_efficiency": 6.0},
    "SL": {"velocity": 3.0, "induced_vb": 4.0, "spin_rate": 250, "horizontal_break": 4.0, "extension": 0.8, "spin_efficiency": 15.0},
    "CB": {"velocity": 3.5, "induced_vb": 4.5, "spin_rate": 290, "horizontal_break": 4.5, "extension": 0.8, "spin_efficiency": 18.0},
    "CH": {"velocity": 2.8, "induced_vb": 3.0, "spin_rate": 180, "horizontal_break": 4.2, "extension": 0.8, "spin_efficiency": 14.0},
    "SI": {"velocity": 2.6, "induced_vb": 3.2, "spin_rate": 200, "horizontal_break": 4.0, "extension": 0.8, "spin_efficiency": 8.0},
    "FC": {"velocity": 2.8, "induced_vb": 3.0, "spin_rate": 240, "horizontal_break": 3.0, "extension": 0.8, "spin_efficiency": 10.0},
}


def calc_stuff_plus(pitch_type: str, metrics: dict) -> float:
    """
    Calculate Stuff+ proxy (100 = league avg, >100 = better).
    Uses weighted z-scores of pitch characteristics vs. league averages by pitch type.
    """
    pt = pitch_type if pitch_type in LEAGUE_AVGS else "FF"
    avgs = LEAGUE_AVGS[pt]
    stds = LEAGUE_STD[pt]

    score = 0.0
    for feature, weight in STUFF_WEIGHTS.items():
        if feature in metrics and feature in avgs:
            z = (metrics[feature] - avgs[feature]) / stds[feature]
            # For induced VB and spin rate, higher is better for FB; adjust for offspeed
            if pitch_type in ("CB",) and feature == "induced_vb":
                z = -z  # more drop is better for curveballs
            score += weight * z

    return round(100 + score * 15, 1)  # scale to 100-base


def calc_plv(vaa: float, stuff_plus: float, whiff_rate: float, usage_pct: float) -> float:
    """
    Pitch Level Value proxy (0-10 scale, 5 = league avg).
    Combines VAA quality, stuff, whiff rate, and usage balance.
    """
    vaa_score = max(0, min(10, (abs(vaa) - 2.0) / 0.4))  # -3.5 VAA → ~score 7.5
    stuff_score = (stuff_plus - 85) / 15  # normalized 0-1 ish
    whiff_score = whiff_rate / 40  # 40% whiff → normalized 1.0
    balance_score = min(1.0, usage_pct / 30)

    raw = (vaa_score * 0.35 + stuff_score * 10 * 0.30 + whiff_score * 10 * 0.25 + balance_score * 10 * 0.10)
    return round(max(0, min(10, raw)), 2)


# ── ERA Regression Model ──────────────────────────────────────────────────────

class ERAPredictor:
    """
    Ridge regression to predict ERA from underlying pitch metrics.
    Features: FIP components + Stuff+ + whiff rate + VAA + spin efficiency.
    """

    def __init__(self):
        self.model = Pipeline([
            ("scaler", StandardScaler()),
            ("ridge", Ridge(alpha=1.0)),
        ])
        self.feature_names = [
            "fip", "xera", "k_pct", "bb_pct", "hr_fb_pct",
            "avg_stuff_plus", "avg_whiff_rate", "avg_vaa", "avg_spin_eff",
        ]
        self.is_trained = False

    def train(self, X: pd.DataFrame, y: pd.Series):
        self.model.fit(X[self.feature_names], y)
        self.is_trained = True
        preds = self.model.predict(X[self.feature_names])
        return {"r2": round(r2_score(y, preds), 3)}

    def predict(self, features: dict) -> float:
        if not self.is_trained:
            return self._heuristic_predict(features)
        row = pd.DataFrame([{k: features.get(k, 0) for k in self.feature_names}])
        return round(float(self.model.predict(row)[0]), 2)

    def _heuristic_predict(self, features: dict) -> float:
        """Fallback formula when no training data available."""
        fip = features.get("fip", 4.0)
        xera = features.get("xera", 4.0)
        return round((fip * 0.5 + xera * 0.5), 2)


# ── Breakout Candidate Scoring ─────────────────────────────────────────────────

def breakout_score(traditional: dict, predictive: dict, pitch_metrics: list) -> dict:
    """
    Score a pitcher's breakout potential (0-100).
    High score = traditional ERA much worse than predictive metrics suggest.
    """
    era = traditional.get("era", 4.0)
    xera = predictive.get("xera", era)
    fip = predictive.get("fip", era)
    k_pct = traditional.get("k_pct", 22.0)
    bb_pct = traditional.get("bb_pct", 9.0)

    era_gap = era - xera  # positive = outperforming peripherals (lucky)
    fip_gap = era - fip   # positive = ERA worse than FIP

    avg_stuff = np.mean([p.get("stuff_plus", 100) for p in pitch_metrics]) if pitch_metrics else 100
    avg_whiff = np.mean([p.get("whiff_rate", 25) for p in pitch_metrics]) if pitch_metrics else 25

    # score components
    era_vs_xera = min(30, max(0, era_gap * 10))  # up to 30 pts
    era_vs_fip = min(20, max(0, fip_gap * 7))    # up to 20 pts
    k_score = min(20, max(0, (k_pct - 20) * 1.5))
    bb_score = min(15, max(0, (10 - bb_pct) * 2))
    stuff_score = min(15, max(0, (avg_stuff - 100) * 0.5))

    total = era_vs_xera + era_vs_fip + k_score + bb_score + stuff_score

    return {
        "breakout_score": round(min(100, total), 1),
        "era_vs_xera_gap": round(era_gap, 2),
        "era_vs_fip_gap": round(fip_gap, 2),
        "components": {
            "era_xera_component": round(era_vs_xera, 1),
            "era_fip_component": round(era_vs_fip, 1),
            "strikeout_component": round(k_score, 1),
            "walk_component": round(bb_score, 1),
            "stuff_component": round(stuff_score, 1),
        },
        "verdict": _breakout_verdict(total),
    }


def _breakout_verdict(score: float) -> str:
    if score >= 70:
        return "Elite Breakout Candidate"
    elif score >= 50:
        return "Strong Breakout Candidate"
    elif score >= 30:
        return "Moderate Upside"
    elif score >= 15:
        return "Limited Breakout Potential"
    else:
        return "Performing to Metrics"


# ── Tunneling Analysis ─────────────────────────────────────────────────────────

def tunneling_grade(avg_tunnel_distance_in: float) -> dict:
    """
    Grade a pitch pair's tunneling (distance in inches at tunnel point).
    Elite tunnels share the same path until ~0.167 seconds before plate.
    """
    if avg_tunnel_distance_in <= 2.0:
        grade, description = "Elite", "Pitches virtually indistinguishable until break"
    elif avg_tunnel_distance_in <= 4.0:
        grade, description = "Plus", "Excellent tunnel — hitters have minimal read time"
    elif avg_tunnel_distance_in <= 6.0:
        grade, description = "Above Average", "Good tunnel — creates difficult decisions"
    elif avg_tunnel_distance_in <= 8.0:
        grade, description = "Average", "Acceptable tunnel"
    else:
        grade, description = "Below Average", "Pitches diverge early — readable by hitters"

    return {"grade": grade, "description": description, "avg_dist_in": round(avg_tunnel_distance_in, 2)}


# ── VAA Analysis ──────────────────────────────────────────────────────────────

def vaa_grade(vaa: float, zone_location: Optional[str] = None) -> dict:
    """
    Grade VAA per Dad's messages: -3.5 at top of zone = elite, -4.0 = very good.
    Sign convention: negative = ball coming downward (typical for fastballs).
    """
    if zone_location == "top":
        if vaa <= -3.5:
            grade, desc = "Elite", "≤ -3.5° at top of zone — elite ride, extremely hard to elevate"
        elif vaa <= -4.0:
            grade, desc = "Very Good", "-4.0° — very flat entry angle at top of zone"
        elif vaa <= -5.0:
            grade, desc = "Above Average", "Flat approach angle creates solid ride effect"
        else:
            grade, desc = "Average", "Average approach angle"
    else:
        if vaa >= -4.0:
            grade, desc = "Elite", "Very flat approach — high ride potential"
        elif vaa >= -5.0:
            grade, desc = "Above Average", "Flat angle — above average ride"
        elif vaa >= -6.0:
            grade, desc = "Average", "Average VAA"
        else:
            grade, desc = "Below Average", "Steep angle — easier for hitters to track"

    return {"vaa": round(vaa, 2), "grade": grade, "description": desc}
