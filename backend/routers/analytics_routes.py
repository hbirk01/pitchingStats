from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from services.statcast_service import get_pitcher_statcast, get_pitch_summary, calc_vaa, calc_spin_efficiency
from services.analytics_service import (
    calc_stuff_plus, calc_plv, breakout_score,
    tunneling_grade, vaa_grade, ERAPredictor
)
import numpy as np

router = APIRouter()


def _sanitize(obj):
    if isinstance(obj, float):
        return None if (np.isnan(obj) or np.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj
_era_predictor = ERAPredictor()


@router.get("/{player_id}/breakout")
def breakout_analysis(player_id: int, season: int = 2024):
    """Full breakout candidate analysis with scoring."""
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    df_enriched = calc_vaa(calc_spin_efficiency(df))
    pitch_summary = get_pitch_summary(df)

    pa = df["events"].notna().sum()
    k_events = (df["events"] == "strikeout").sum()
    bb_events = (df["events"] == "walk").sum()
    ip_outs = df["events"].isin(["strikeout", "field_out", "force_out"]).sum()
    ip = ip_outs / 3

    traditional = {
        "era": round((df["events"].isin(["home_run"]).sum() * 1.3 * 9 / ip), 2) if ip > 0 else 0,
        "k_pct": round(k_events / pa * 100, 1) if pa > 0 else 0,
        "bb_pct": round(bb_events / pa * 100, 1) if pa > 0 else 0,
    }

    xera_proxy = None
    if "estimated_woba_using_speedangle" in df.columns:
        xwoba = df["estimated_woba_using_speedangle"].mean()
        xera_proxy = round(xwoba * 12.5, 2)  # rough linear conversion

    predictive = {
        "xera": xera_proxy or traditional["era"],
        "fip": traditional["era"] * 0.9,  # simplified when FIP data unavailable
    }

    # Enrich pitch summary with stuff+ and PLV
    enriched_pitches = []
    for p in pitch_summary:
        pt = p["pitch_type"]
        metrics = {
            "velocity": p.get("avg_velocity", 90),
            "induced_vb": p.get("avg_ivb", 10),
            "spin_rate": p.get("avg_spin_rate", 2200),
            "horizontal_break": p.get("avg_hb", 0),
            "extension": p.get("avg_extension", 6.0),
            "spin_efficiency": p.get("avg_spin_efficiency", 80),
        }
        stuff = calc_stuff_plus(pt, metrics)
        vaa = p.get("avg_vaa", -4.5)
        whiff = p.get("whiff_rate", 25.0)
        usage = p.get("usage_pct", 20.0)
        plv = calc_plv(vaa, stuff, whiff, usage)
        vaa_info = vaa_grade(vaa)

        enriched_pitches.append({
            **p,
            "stuff_plus": stuff,
            "plv": plv,
            "vaa_grade": vaa_info,
        })

    score = breakout_score(traditional, predictive, enriched_pitches)

    return _sanitize({
        "player_id": player_id,
        "season": season,
        "traditional": traditional,
        "predictive": predictive,
        "pitch_grades": enriched_pitches,
        "breakout_analysis": score,
    })


@router.get("/{player_id}/regression")
def era_regression(player_id: int, season: int = 2024):
    """ERA regression analysis — predicted vs actual using peripheral stats."""
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    df_enriched = calc_vaa(calc_spin_efficiency(df))
    pitch_summary = get_pitch_summary(df)

    pa = df["events"].notna().sum()
    ip_outs = df["events"].isin(["strikeout", "field_out", "force_out"]).sum()
    ip = ip_outs / 3

    k_events = (df["events"] == "strikeout").sum()
    bb_events = (df["events"] == "walk").sum()
    hr_events = (df["events"] == "home_run").sum()

    actual_era = round((hr_events * 1.3 * 9 / ip), 2) if ip > 0 else 0
    xwoba = df["estimated_woba_using_speedangle"].mean() if "estimated_woba_using_speedangle" in df.columns else None
    xera = round(float(xwoba) * 12.5, 2) if xwoba else actual_era * 0.9

    avg_vaa = float(df_enriched["vaa"].mean()) if "vaa" in df_enriched.columns else -4.5
    avg_spin_eff = float(df_enriched["spin_efficiency"].mean()) if "spin_efficiency" in df_enriched.columns else 80.0
    avg_whiff = np.mean([p.get("whiff_rate", 25) for p in pitch_summary]) if pitch_summary else 25.0
    avg_stuff = np.mean([
        calc_stuff_plus(p["pitch_type"], {
            "velocity": p.get("avg_velocity", 90),
            "induced_vb": p.get("avg_ivb", 10),
            "spin_rate": p.get("avg_spin_rate", 2200),
            "horizontal_break": p.get("avg_hb", 0),
            "extension": p.get("avg_extension", 6.0),
            "spin_efficiency": p.get("avg_spin_efficiency", 80),
        })
        for p in pitch_summary
    ]) if pitch_summary else 100.0

    features = {
        "fip": xera * 0.95,
        "xera": xera,
        "k_pct": float(k_events / pa * 100) if pa > 0 else 22,
        "bb_pct": float(bb_events / pa * 100) if pa > 0 else 9,
        "hr_fb_pct": float(hr_events / max(1, pa) * 100),
        "avg_stuff_plus": float(avg_stuff),
        "avg_whiff_rate": float(avg_whiff),
        "avg_vaa": float(avg_vaa),
        "avg_spin_eff": float(avg_spin_eff),
    }

    predicted_era = _era_predictor.predict(features)

    return _sanitize({
        "player_id": player_id,
        "season": season,
        "actual_era": actual_era,
        "predicted_era": predicted_era,
        "xera": xera,
        "era_vs_predicted": round(actual_era - predicted_era, 2),
        "era_vs_xera": round(actual_era - xera, 2),
        "features_used": features,
        "interpretation": {
            "luck_component": round(actual_era - xera, 2),
            "positive_regression_expected": bool(actual_era > predicted_era),
            "description": (
                f"ERA is {abs(round(actual_era - predicted_era, 2))} runs "
                f"{'worse than' if actual_era > predicted_era else 'better than'} "
                f"what underlying metrics predict."
            ),
        },
    })


@router.get("/{player_id}/vaa-analysis")
def vaa_analysis(player_id: int, season: int = 2024):
    """Detailed VAA analysis by pitch type and zone location."""
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    df_enriched = calc_vaa(df)
    results = {}
    for pt, grp in df_enriched.groupby("pitch_type"):
        top_zone = grp[grp["plate_z"] > 3.0]
        mid_zone = grp[(grp["plate_z"] >= 1.5) & (grp["plate_z"] <= 3.0)]
        bot_zone = grp[grp["plate_z"] < 1.5]

        results[pt] = {
            "overall_vaa": round(float(grp["vaa"].mean()), 2),
            "top_zone_vaa": round(float(top_zone["vaa"].mean()), 2) if not top_zone.empty else None,
            "mid_zone_vaa": round(float(mid_zone["vaa"].mean()), 2) if not mid_zone.empty else None,
            "bot_zone_vaa": round(float(bot_zone["vaa"].mean()), 2) if not bot_zone.empty else None,
            "top_zone_vaa_grade": vaa_grade(float(top_zone["vaa"].mean()), "top") if not top_zone.empty else None,
            "vaa_distribution": {
                "p10": round(float(grp["vaa"].quantile(0.10)), 2),
                "p25": round(float(grp["vaa"].quantile(0.25)), 2),
                "p50": round(float(grp["vaa"].quantile(0.50)), 2),
                "p75": round(float(grp["vaa"].quantile(0.75)), 2),
                "p90": round(float(grp["vaa"].quantile(0.90)), 2),
            },
        }
    return results
