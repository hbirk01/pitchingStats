from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from services.statcast_service import (
    get_pitcher_statcast, get_pitch_summary,
    calc_tunneling, calc_command, calc_vaa, calc_spin_efficiency
)
import pandas as pd
import numpy as np
import requests as _requests

router = APIRouter()


def _mlb_traditional_stats(player_id: int, season: int) -> dict:
    """Fetch all official base stats from MLB Stats API. Never calculate what MLB tracks."""
    try:
        url = (f"https://statsapi.mlb.com/api/v1/people/{player_id}/stats"
               f"?stats=season&group=pitching&season={season}")
        r = _requests.get(url, timeout=8)
        splits = r.json()["stats"][0]["splits"]
        if not splits:
            return {}
        s = splits[0]["stat"]

        def _f(key, fallback=None):
            v = s.get(key)
            return fallback if v in (None, "-.--", "") else v

        def _ff(key):
            v = _f(key)
            return float(v) if v is not None else None

        ip_str = _f("inningsPitched", "0")
        try:
            # "32.1" → 32 full innings + 1 out = 32.333...
            parts = str(ip_str).split(".")
            ip = int(parts[0]) + int(parts[1]) / 3 if len(parts) == 2 else float(ip_str)
        except Exception:
            ip = None

        k  = _f("strikeOuts")
        bb = _f("baseOnBalls")
        bf = _f("battersFaced")
        hr = _f("homeRuns")
        h  = _f("hits")
        er = _f("earnedRuns")
        hbp= _f("hitBatsmen", 0)

        k_pct  = round(k  / bf * 100, 1) if k  is not None and bf else None
        bb_pct = round(bb / bf * 100, 1) if bb is not None and bf else None
        babip_denom = (bf - k - bb - hr) if all(v is not None for v in [bf, k, bb, hr]) else None
        babip = round((h - hr) / babip_denom, 3) if babip_denom and babip_denom > 0 and h is not None and hr is not None else None

        return {
            "era":    _ff("era"),
            "whip":   _ff("whip"),
            "wins":   _f("wins"),
            "losses": _f("losses"),
            "ip":     ip_str,   # display string e.g. "32.1"
            "ip_f":   ip,       # float for math e.g. 32.333
            "k":      k,
            "bb":     bb,
            "bf":     bf,
            "hr":     hr,
            "h":      h,
            "er":     er,
            "hbp":    hbp,
            "k_pct":  k_pct,
            "bb_pct": bb_pct,
            "babip":  babip,
            "games":  _f("gamesPlayed"),
            "gs":     _f("gamesStarted"),
            "saves":  _f("saves"),
        }
    except Exception:
        return {}


def _safe_round(val, digits=2):
    try:
        v = float(val)
        if np.isnan(v) or np.isinf(v):
            return None
        return round(v, digits)
    except Exception:
        return None


def _sanitize(obj):
    """Recursively replace NaN/inf with None so JSON serialization doesn't blow up."""
    if isinstance(obj, float):
        return None if (np.isnan(obj) or np.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj


@router.get("/{player_id}/dashboard")
def pitcher_dashboard(
    player_id: int,
    season: int = Query(2024),
):
    """Full pitcher dashboard: traditional + advanced + pitch metrics."""
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, f"No Statcast data found for player {player_id} in {season}")

    # Traditional aggregates
    total_pitches = len(df)
    games = df["game_pk"].nunique() if "game_pk" in df.columns else None

    # All official base stats from MLB Stats API — never calculate what they track
    mlb = _mlb_traditional_stats(player_id, season)
    era    = mlb.get("era")
    whip   = mlb.get("whip")
    wins   = mlb.get("wins")
    losses = mlb.get("losses")
    ip     = mlb.get("ip")      # display string
    ip_f   = mlb.get("ip_f") or 0  # float for math
    k_pct  = mlb.get("k_pct")
    bb_pct = mlb.get("bb_pct")
    # IP fallback for Statcast-derived pitch-count features only
    if not ip:
        ip_outs = df[df["events"].isin(["strikeout", "field_out", "force_out", "grounded_into_double_play",
                                         "fielders_choice_out", "double_play", "sac_fly"])].shape[0]
        ip = round(ip_outs / 3, 1)

    # xBA / xwOBA / xERA from Statcast columns
    xba = _safe_round(df["estimated_ba_using_speedangle"].mean(), 3) if "estimated_ba_using_speedangle" in df.columns else None
    xwoba = _safe_round(df["estimated_woba_using_speedangle"].mean(), 3) if "estimated_woba_using_speedangle" in df.columns else None

    # Pitch summary
    pitch_summary = get_pitch_summary(df)

    # Tunneling for main pitch pairs
    pitch_types = df["pitch_type"].dropna().unique().tolist()
    tunneling_results = []
    for i, pt_a in enumerate(pitch_types):
        for pt_b in pitch_types[i + 1:]:
            tdf = calc_tunneling(df, pt_a, pt_b, tunnel_point_ft=23.0)
            if not tdf.empty:
                avg_dist_in = tdf["tunnel_distance_in"].mean()
                tunneling_results.append({
                    "pair": f"{pt_a}/{pt_b}",
                    "pitch_a": pt_a,
                    "pitch_b": pt_b,
                    "avg_tunnel_dist_in": _safe_round(avg_dist_in, 2),
                    "sample_size": len(tdf),
                })

    # Command metrics
    command_df = calc_command(df)
    command_results = command_df.to_dict(orient="records") if not command_df.empty else []

    # Zone-level VAA (top third of zone = plate_z > 3.0)
    df_vaa = calc_vaa(calc_spin_efficiency(df))
    zone_vaa = {}
    for pt, grp in df_vaa.groupby("pitch_type"):
        top_zone = grp[grp["plate_z"] > 3.0]
        mid_zone = grp[(grp["plate_z"] >= 1.5) & (grp["plate_z"] <= 3.0)]
        bot_zone = grp[grp["plate_z"] < 1.5]
        zone_vaa[pt] = {
            "top": _safe_round(top_zone["vaa"].mean()),
            "middle": _safe_round(mid_zone["vaa"].mean()),
            "bottom": _safe_round(bot_zone["vaa"].mean()),
            "overall": _safe_round(grp["vaa"].mean()),
        }

    # Movement profile for chart
    movement_profile = []
    for pt, grp in df.groupby("pitch_type"):
        movement_profile.append({
            "pitch_type": pt,
            "pfx_x_in": _safe_round(grp["pfx_x"].mean() * 12),
            "pfx_z_in": _safe_round(grp["pfx_z"].mean() * 12),
            "velocity": _safe_round(grp["release_speed"].mean()),
        })

    # Release point scatter
    release_scatter = df[["pitch_type", "release_pos_x", "release_pos_z"]].dropna().head(500).to_dict(orient="records")

    # Pitch location heatmap data
    location_data = df[["pitch_type", "plate_x", "plate_z", "description"]].dropna().to_dict(orient="records")

    # Pitch run value per 100 pitches (delta_run_exp is negative = good for pitcher)
    pitch_run_value = {}
    if "delta_run_exp" in df.columns and "pitch_type" in df.columns:
        for pt, grp in df.groupby("pitch_type"):
            rv = grp["delta_run_exp"].sum()
            rv_per_100 = (rv / len(grp)) * 100 if len(grp) > 0 else None
            pitch_run_value[pt] = {
                "total_rv": _safe_round(rv, 2),
                "rv_per_100": _safe_round(rv_per_100, 2),
                "pitches": len(grp),
            }

    # Release point consistency (std dev per pitch type)
    release_consistency = {}
    if "release_pos_x" in df.columns and "release_pos_z" in df.columns:
        for pt, grp in df.groupby("pitch_type"):
            release_consistency[pt] = {
                "x_std": _safe_round(grp["release_pos_x"].std(), 3),
                "z_std": _safe_round(grp["release_pos_z"].std(), 3),
                "extension_avg": _safe_round(grp["release_extension"].mean(), 2) if "release_extension" in grp.columns else None,
            }

    return _sanitize({
        "player_id": player_id,
        "season": season,
        "total_pitches": total_pitches,
        "games": games,
        "ip": ip,
        "traditional": {
            "era": era,
            "whip": whip,
            "wins": wins,
            "losses": losses,
            "k_pct": k_pct,
            "bb_pct": bb_pct,
            "strikeouts": mlb.get("k"),
            "walks": mlb.get("bb"),
            "bf": mlb.get("bf"),
            "babip": mlb.get("babip"),
        },
        "predictive": {
            "xba": xba,
            "xwoba": xwoba,
            "xera": round(float(xwoba) * 12.5, 2) if xwoba else None,
        },
        "pitch_summary": pitch_summary,
        "tunneling": tunneling_results,
        "command": command_results,
        "zone_vaa": zone_vaa,
        "movement_profile": movement_profile,
        "release_scatter": release_scatter,
        "location_data": location_data[:2000],
        "pitch_run_value": pitch_run_value,
        "release_consistency": release_consistency,
    })


@router.get("/{player_id}/pitch-types")
def pitch_type_breakdown(player_id: int, season: int = 2024):
    """Per-pitch-type deep dive with outcome distributions."""
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    df_enriched = calc_vaa(calc_spin_efficiency(df))
    results = {}
    for pt, grp in df_enriched.groupby("pitch_type"):
        outcomes = grp["description"].value_counts().to_dict()
        results[pt] = {
            "count": len(grp),
            "outcomes": outcomes,
            "avg_vaa": _safe_round(grp["vaa"].mean()),
            "avg_spin_eff": _safe_round(grp["spin_efficiency"].mean()),
            "avg_velocity": _safe_round(grp["release_speed"].mean()),
            "avg_spin": _safe_round(grp["release_spin_rate"].mean()),
            "avg_ivb": _safe_round(grp["pfx_z"].mean() * 12),
            "avg_hb": _safe_round(grp["pfx_x"].mean() * 12),
        }
    return results


@router.get("/{player_id}/splits")
def pitcher_splits(player_id: int, season: int = 2024):
    """Platoon splits (vs LHB/RHB), count splits, zone heatmap data."""
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    df_e = calc_vaa(calc_spin_efficiency(df))

    def _split_metrics(grp):
        pa = grp[grp["events"].notna()]["events"].count()
        k = (grp["events"] == "strikeout").sum()
        bb = (grp["events"] == "walk").sum()
        whiff = grp["description"].isin(["swinging_strike", "swinging_strike_blocked"]).sum()
        swing = grp["description"].isin(["swinging_strike", "swinging_strike_blocked", "foul", "foul_tip", "hit_into_play"]).sum()
        xba = grp["estimated_ba_using_speedangle"].mean() if "estimated_ba_using_speedangle" in grp.columns else None
        xwoba = grp["estimated_woba_using_speedangle"].mean() if "estimated_woba_using_speedangle" in grp.columns else None
        rv = grp["delta_run_exp"].sum() if "delta_run_exp" in grp.columns else None
        return {
            "pa": int(pa),
            "pitches": len(grp),
            "k_pct": _safe_round(k / pa * 100 if pa > 0 else None),
            "bb_pct": _safe_round(bb / pa * 100 if pa > 0 else None),
            "whiff_pct": _safe_round(whiff / swing * 100 if swing > 0 else None),
            "xba": _safe_round(xba, 3),
            "xwoba": _safe_round(xwoba, 3),
            "rv": _safe_round(rv, 2),
        }

    # Platoon splits
    platoon = {}
    if "stand" in df_e.columns:
        for hand, grp in df_e.groupby("stand"):
            platoon[hand] = _split_metrics(grp)

    # Count splits
    count_splits = {}
    if "balls" in df_e.columns and "strikes" in df_e.columns:
        df_e["count"] = df_e["balls"].astype(str) + "-" + df_e["strikes"].astype(str)
        for count, grp in df_e.groupby("count"):
            count_splits[count] = _split_metrics(grp)

    # Zone heatmap: 5x5 grid, plate_x (-1.5 to 1.5), plate_z (1.0 to 4.5)
    heatmap = {}
    if "plate_x" in df_e.columns and "plate_z" in df_e.columns:
        x_bins = np.linspace(-1.5, 1.5, 6)
        z_bins = np.linspace(1.0, 4.5, 6)
        df_loc = df_e.dropna(subset=["plate_x", "plate_z"])
        df_loc = df_loc[(df_loc["plate_x"].between(-1.5, 1.5)) & (df_loc["plate_z"].between(1.0, 4.5))]

        for pt in (["ALL"] + df_loc["pitch_type"].unique().tolist()):
            g = df_loc if pt == "ALL" else df_loc[df_loc["pitch_type"] == pt]
            if len(g) < 10:
                continue
            cells = []
            for zi in range(5):
                for xi in range(5):
                    mask = (
                        (g["plate_x"] >= x_bins[xi]) & (g["plate_x"] < x_bins[xi+1]) &
                        (g["plate_z"] >= z_bins[zi]) & (g["plate_z"] < z_bins[zi+1])
                    )
                    cell = g[mask]
                    if len(cell) == 0:
                        cells.append({"xi": xi, "zi": zi, "n": 0, "whiff_pct": None, "xba": None, "rv_per_100": None})
                        continue
                    sw = cell["description"].isin(["swinging_strike","swinging_strike_blocked"]).sum()
                    sg = cell["description"].isin(["swinging_strike","swinging_strike_blocked","foul","foul_tip","hit_into_play"]).sum()
                    rv_c = cell["delta_run_exp"].sum() if "delta_run_exp" in cell.columns else 0
                    cells.append({
                        "xi": xi, "zi": zi, "n": len(cell),
                        "whiff_pct": _safe_round(sw / sg * 100 if sg > 0 else None),
                        "xba": _safe_round(cell["estimated_ba_using_speedangle"].mean() if "estimated_ba_using_speedangle" in cell.columns else None, 3),
                        "rv_per_100": _safe_round(rv_c / len(cell) * 100, 2),
                    })
            heatmap[pt] = cells

    # Rolling 30-day splits
    rolling = []
    if "game_date" in df_e.columns:
        df_e["game_date"] = pd.to_datetime(df_e["game_date"])
        dates = sorted(df_e["game_date"].unique())
        for d in dates[::7]:  # weekly samples
            window = df_e[df_e["game_date"] <= d].tail(30 * 15)  # ~30 days of pitches
            if len(window) < 50:
                continue
            sw = window["description"].isin(["swinging_strike","swinging_strike_blocked"]).sum()
            sg = window["description"].isin(["swinging_strike","swinging_strike_blocked","foul","foul_tip","hit_into_play"]).sum()
            rv = window["delta_run_exp"].sum() if "delta_run_exp" in window.columns else None
            rolling.append({
                "date": str(d.date()),
                "pitches": len(window),
                "whiff_pct": _safe_round(sw / sg * 100 if sg > 0 else None),
                "avg_velo": _safe_round(window["release_speed"].mean()),
                "rv_per_100": _safe_round(rv / len(window) * 100 if rv is not None and len(window) > 0 else None, 2),
                "avg_vaa": _safe_round(window["vaa"].mean() if "vaa" in window.columns else None),
            })

    return _sanitize({
        "platoon": platoon,
        "count_splits": count_splits,
        "heatmap": heatmap,
        "rolling": rolling,
    })


@router.get("/{player_id}/seasons")
def pitcher_seasons(player_id: int, seasons: str = "2024,2023,2022,2021"):
    """
    Multi-season aggregate for season-over-season comparison.
    Returns lightweight summary (no pitch-level detail) for each requested season.
    """
    import concurrent.futures

    season_list = [int(s.strip()) for s in seasons.split(",") if s.strip().isdigit()]

    def _season_summary(season):
        df = get_pitcher_statcast(player_id, season)
        if df is None or df.empty:
            return season, None
        df_e = calc_vaa(calc_spin_efficiency(df))

        # Official base stats from MLB Stats API
        mlb = _mlb_traditional_stats(player_id, season)
        era   = mlb.get("era")
        k_pct = mlb.get("k_pct")
        bb_pct= mlb.get("bb_pct")

        swings = df["description"].isin(["swinging_strike","swinging_strike_blocked",
                                          "foul","foul_tip","hit_into_play"])
        whiffs = df["description"].isin(["swinging_strike","swinging_strike_blocked"])
        whiff_pct = round(whiffs.sum() / swings.sum() * 100, 1) if swings.sum() > 0 else None

        avg_velo = _safe_round(df["release_speed"].mean(), 1) if "release_speed" in df.columns else None
        avg_vaa = _safe_round(df_e["vaa"].mean(), 2) if "vaa" in df_e.columns else None
        avg_spin_eff = _safe_round(df_e["spin_efficiency"].mean(), 1) if "spin_efficiency" in df_e.columns else None
        xba = _safe_round(df["estimated_ba_using_speedangle"].mean(), 3) if "estimated_ba_using_speedangle" in df.columns else None
        xwoba = _safe_round(df["estimated_woba_using_speedangle"].mean(), 3) if "estimated_woba_using_speedangle" in df.columns else None
        rv = _safe_round(df["delta_run_exp"].sum(), 2) if "delta_run_exp" in df.columns else None
        rv_per_100 = _safe_round(rv / len(df) * 100, 2) if rv is not None and len(df) > 0 else None

        # Per-pitch-type velocity trend
        velo_by_type = {}
        if "release_speed" in df.columns:
            for pt, grp in df.groupby("pitch_type"):
                velo_by_type[pt] = _safe_round(grp["release_speed"].mean(), 1)

        return season, {
            "season": season,
            "total_pitches": len(df),
            "games": int(df["game_pk"].nunique()) if "game_pk" in df.columns else None,
            "ip": mlb.get("ip_str"),
            "era": era,
            "k_pct": k_pct,
            "bb_pct": bb_pct,
            "whiff_pct": whiff_pct,
            "avg_velo": avg_velo,
            "avg_vaa": avg_vaa,
            "avg_spin_eff": avg_spin_eff,
            "xba": xba,
            "xwoba": xwoba,
            "rv_per_100": rv_per_100,
            "velo_by_type": velo_by_type,
        }

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(_season_summary, s): s for s in season_list}
        for f in concurrent.futures.as_completed(futures):
            season, data = f.result()
            if data:
                results[str(season)] = data

    return _sanitize(results)


@router.get("/{player_id}/trajectory")
def pitch_trajectories(player_id: int, season: int = 2024, n_per_type: int = 20):
    """
    Sample pitch trajectories for animation.
    Returns kinematic coefficients: pos(t) = pos0 + v0*t + 0.5*a*t^2
    Statcast y0 is ~55 ft from plate; plate is at y=0.
    """
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    traj_cols = ["pitch_type", "release_pos_x", "release_pos_y", "release_pos_z",
                 "vx0", "vy0", "vz0", "ax", "ay", "az", "release_speed", "release_extension",
                 "plate_x", "plate_z", "description"]
    available = [c for c in traj_cols if c in df.columns]
    df_t = df[available].dropna(subset=["vx0", "vy0", "vz0", "ax", "ay", "az",
                                         "release_pos_x", "release_pos_y", "release_pos_z"])

    pitches = []
    for pt, grp in df_t.groupby("pitch_type"):
        sample = grp.sample(min(n_per_type, len(grp)), random_state=42)
        for _, row in sample.iterrows():
            pitches.append({
                "pitch_type": pt,
                "x0": _safe_round(row["release_pos_x"], 4),
                "y0": _safe_round(row["release_pos_y"], 4),
                "z0": _safe_round(row["release_pos_z"], 4),
                "vx0": _safe_round(row["vx0"], 4),
                "vy0": _safe_round(row["vy0"], 4),
                "vz0": _safe_round(row["vz0"], 4),
                "ax": _safe_round(row["ax"], 4),
                "ay": _safe_round(row["ay"], 4),
                "az": _safe_round(row["az"], 4),
                "speed": _safe_round(row.get("release_speed"), 1),
                "plate_x": _safe_round(row.get("plate_x"), 3),
                "plate_z": _safe_round(row.get("plate_z"), 3),
                "description": row.get("description"),
            })

    # Averages per pitch type for reference lines
    avgs = {}
    for pt, grp in df_t.groupby("pitch_type"):
        avgs[pt] = {
            "avg_speed": _safe_round(grp["release_speed"].mean(), 1) if "release_speed" in grp.columns else None,
            "avg_extension": _safe_round(grp["release_extension"].mean(), 2) if "release_extension" in grp.columns else None,
            "avg_plate_x": _safe_round(grp["plate_x"].mean(), 3) if "plate_x" in grp.columns else None,
            "avg_plate_z": _safe_round(grp["plate_z"].mean(), 3) if "plate_z" in grp.columns else None,
        }

    return _sanitize({"pitches": pitches, "averages": avgs})


@router.get("/{player_id}/siera")
def pitcher_siera(player_id: int, season: int = 2024):
    """
    Compute SIERA and xFIP from Statcast + MLB peripherals.
    SIERA adds GB rate to FIP for a truer skill estimate.
    xFIP normalises HR/FB to league average (~10.5%).
    """
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    # Base stats from MLB Stats API (K, BB, HR, IP, HBP are official counts)
    mlb = _mlb_traditional_stats(player_id, season)
    k   = mlb.get("k")   or 0
    bb  = mlb.get("bb")  or 0
    hr  = mlb.get("hr")  or 0
    hbp = mlb.get("hbp") or 0
    bf  = mlb.get("bf")  or 0
    ip  = mlb.get("ip_f") or 0  # float for FIP/xFIP/SIERA formulas
    pa  = bf  # battersFaced is the correct denominator for rate stats

    # Ground/fly/line breakdown — Statcast bb_type is the only source for these
    contact = df[df["bb_type"].notna()]
    gb = (contact["bb_type"] == "ground_ball").sum()
    fb = (contact["bb_type"] == "fly_ball").sum()
    ld = (contact["bb_type"] == "line_drive").sum()
    pu = (contact["bb_type"] == "popup").sum()
    total_bip = gb + fb + ld + pu

    # FIP constants
    FIP_C = {2026: 3.18, 2025: 3.19, 2024: 3.17, 2023: 3.16, 2022: 3.11, 2021: 3.17, 2020: 3.13}
    c = FIP_C.get(season, 3.15)

    # FIP and xFIP are legitimately calculated stats (not official), but built on official inputs
    fip  = round((13*hr + 3*(bb+hbp) - 2*k) / ip + c, 2) if ip > 0 else None
    xhr  = fb * 0.105  # xFIP normalises HR/FB to league-avg 10.5%
    xfip = round((13*xhr + 3*(bb+hbp) - 2*k) / ip + c, 2) if ip > 0 else None

    # SIERA formula (Steamer) — calculated stat, uses official K/BB/BF + Statcast GB/FB
    siera = None
    if pa > 0 and ip > 0:
        kpa  = k  / pa
        bbpa = bb / pa
        gbfb = (gb - fb) / pa
        siera = round(
            6.145
            - 16.986 * kpa
            + 11.434 * bbpa
            - 1.858  * gbfb
            + 7.653  * kpa**2
            - 6.664  * bbpa**2
            + 10.130 * kpa  * gbfb
            - 5.195  * bbpa * gbfb,
            2
        )

    # Velocity trend: first third vs last third of season (injury flag)
    velo_flag = None
    speed_col = "release_speed"
    if speed_col in df.columns:
        df_s = df[df[speed_col].notna()].copy()
        if len(df_s) >= 60:
            third = len(df_s) // 3
            early_velo = df_s.iloc[:third][speed_col].mean()
            late_velo = df_s.iloc[-third:][speed_col].mean()
            drop = early_velo - late_velo
            velo_flag = {
                "early_velo": _safe_round(early_velo, 1),
                "late_velo": _safe_round(late_velo, 1),
                "drop": _safe_round(drop, 1),
                "warning": bool(drop > 1.5),
                "label": "⚠ Velocity drop >1.5 mph" if drop > 1.5 else ("✓ Stable" if drop <= 0.5 else "Slight drop"),
            }

    # Spin rate trend
    spin_flag = None
    if "release_spin_rate" in df.columns:
        df_sp = df[df["release_spin_rate"].notna()]
        if len(df_sp) >= 60:
            third = len(df_sp) // 3
            early_spin = df_sp.iloc[:third]["release_spin_rate"].mean()
            late_spin = df_sp.iloc[-third:]["release_spin_rate"].mean()
            spin_drop = early_spin - late_spin
            spin_flag = {
                "early_spin": _safe_round(early_spin, 0),
                "late_spin": _safe_round(late_spin, 0),
                "drop": _safe_round(spin_drop, 0),
                "warning": bool(spin_drop > 100),
                "label": "⚠ Spin drop >100 rpm" if spin_drop > 100 else "✓ Stable",
            }

    return _sanitize({
        "fip": fip,
        "xfip": xfip,
        "siera": siera,
        "components": {
            "pa": int(pa), "k": int(k), "bb": int(bb), "hbp": int(hbp),
            "hr": int(hr), "gb": int(gb), "fb": int(fb), "ld": int(ld),
            "gb_pct": _safe_round(gb/total_bip*100 if total_bip > 0 else None),
            "fb_pct": _safe_round(fb/total_bip*100 if total_bip > 0 else None),
            "ld_pct": _safe_round(ld/total_bip*100 if total_bip > 0 else None),
            "hr_fb_pct": _safe_round(hr/fb*100 if fb > 0 else None),
        },
        "velo_trend": velo_flag,
        "spin_trend": spin_flag,
        "ip": _safe_round(ip, 1),
    })


@router.get("/{player_id}/sequencing")
def pitch_sequencing(player_id: int, season: int = 2025):
    """
    Pitch sequencing: transition matrix (what follows what) and count-specific pitch mix.
    """
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    df = df[df["pitch_type"].notna()].copy()
    df = df.sort_values(["game_pk", "at_bat_number", "pitch_number"])

    # --- Transition matrix ---
    transitions = {}
    for (gk, ab), grp in df.groupby(["game_pk", "at_bat_number"]):
        pitches = grp["pitch_type"].tolist()
        for i in range(len(pitches) - 1):
            prev, nxt = pitches[i], pitches[i + 1]
            transitions.setdefault(prev, {})
            transitions[prev][nxt] = transitions[prev].get(nxt, 0) + 1

    # Normalise to probabilities
    matrix = {}
    for prev, nexts in transitions.items():
        total = sum(nexts.values())
        matrix[prev] = {nxt: round(cnt / total * 100, 1) for nxt, cnt in sorted(nexts.items(), key=lambda x: -x[1])}

    # --- Count-specific pitch mix ---
    counts = {}
    for (balls, strikes), grp in df.groupby(["balls", "strikes"]):
        label = f"{int(balls)}-{int(strikes)}"
        mix = grp["pitch_type"].value_counts(normalize=True).mul(100).round(1).to_dict()
        counts[label] = {"mix": mix, "n": int(len(grp))}

    # --- Pitch usage by ahead/behind/even ---
    def situation(b, s):
        if s == 2 and b < 2: return "pitcher_ahead"
        if b > 1 and s < 2: return "pitcher_behind"
        return "even"

    sit_mix = {}
    for _, row in df.iterrows():
        sit = situation(row["balls"], row["strikes"])
        pt = row["pitch_type"]
        sit_mix.setdefault(sit, {})
        sit_mix[sit][pt] = sit_mix[sit].get(pt, 0) + 1

    for sit in sit_mix:
        total = sum(sit_mix[sit].values())
        sit_mix[sit] = {pt: round(cnt / total * 100, 1) for pt, cnt in sorted(sit_mix[sit].items(), key=lambda x: -x[1])}

    return _sanitize({"matrix": matrix, "counts": counts, "situations": sit_mix})


@router.get("/{player_id}/arsenal-grades")
def arsenal_grades(player_id: int, season: int = 2025):
    """
    Letter grades (A+→F) per pitch type based on league percentile ranks.
    Grades: whiff%, run_value_per_100, velo (percentile vs same pitch type).
    """
    import sys, os
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from services.statcast_service import get_savant_arsenal

    arsenal = get_savant_arsenal(season)
    if arsenal.empty:
        raise HTTPException(503, "Arsenal data unavailable")

    player_rows = arsenal[arsenal["player_id"].astype(str) == str(player_id)]
    if player_rows.empty:
        raise HTTPException(404, "Player not in arsenal data")

    GRADE_MAP = [(95,"A+"),(90,"A"),(80,"A-"),(70,"B+"),(60,"B"),(50,"B-"),(40,"C+"),(30,"C"),(20,"C-"),(10,"D"),(0,"F")]

    def pct_to_grade(pct):
        for threshold, g in GRADE_MAP:
            if pct >= threshold:
                return g
        return "F"

    METRICS = {
        "whiff_pct":        {"label": "Whiff%",   "higher_better": True},
        "run_value_per_100":{"label": "RV/100",    "higher_better": False},
        "mph":              {"label": "Velocity",  "higher_better": True},
        "k_percent":        {"label": "K%",        "higher_better": True},
        "put_away":         {"label": "Put-Away%", "higher_better": True},
    }

    grades = {}
    for _, row in player_rows.iterrows():
        pt = row["pitch_type"]
        pool = arsenal[arsenal["pitch_type"] == pt]
        if len(pool) < 10:
            continue

        metric_grades = {}
        pct_scores = []
        for col, meta in METRICS.items():
            if col not in pool.columns or pd.isna(row.get(col)):
                continue
            vals = pool[col].dropna().values
            val = float(row[col])
            if meta["higher_better"]:
                pct = float((vals < val).mean() * 100)
            else:
                pct = float((vals > val).mean() * 100)
            pct_scores.append(pct)
            metric_grades[col] = {
                "value": _safe_round(val, 2),
                "percentile": round(pct, 1),
                "grade": pct_to_grade(pct),
                "label": meta["label"],
            }

        overall_pct = float(np.mean(pct_scores)) if pct_scores else 50.0
        grades[pt] = {
            "overall_grade": pct_to_grade(overall_pct),
            "overall_percentile": round(overall_pct, 1),
            "pitches": int(row.get("pitches", 0)),
            "metrics": metric_grades,
        }

    return _sanitize(grades)


@router.get("/{player_id}/recent-form")
def recent_form(player_id: int, season: int = 2025):
    """
    Recent form: aggregate stats for last 7, 14, 30 days vs season total.
    """
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    if "game_date" not in df.columns:
        raise HTTPException(422, "No date column")

    df["game_date"] = pd.to_datetime(df["game_date"])
    latest = df["game_date"].max()

    def window_stats(sub):
        if sub.empty:
            return None
        pa_df = sub[sub["events"].notna()]
        pa = len(pa_df)
        k = (pa_df["events"] == "strikeout").sum()
        bb = (pa_df["events"] == "walk").sum()
        hr = (pa_df["events"] == "home_run").sum()
        swings = sub["description"].isin(["swinging_strike","swinging_strike_blocked","foul","foul_tip","hit_into_play"])
        whiffs = sub["description"].isin(["swinging_strike","swinging_strike_blocked"])
        ip_outs = sub[sub["events"].isin(["strikeout","field_out","force_out",
                       "grounded_into_double_play","fielders_choice_out","double_play","sac_fly"])].shape[0]
        ip = ip_outs / 3
        avg_velo = _safe_round(sub["release_speed"].mean(), 1) if "release_speed" in sub.columns else None
        xba = _safe_round(sub["estimated_ba_using_speedangle"].mean(), 3) if "estimated_ba_using_speedangle" in sub.columns else None
        return {
            "pitches": int(len(sub)),
            "games": int(sub["game_pk"].nunique()) if "game_pk" in sub.columns else None,
            "ip": round(ip, 1),
            "k_pct": round(k / pa * 100, 1) if pa > 0 else None,
            "bb_pct": round(bb / pa * 100, 1) if pa > 0 else None,
            "hr": int(hr),
            "whiff_pct": round(whiffs.sum() / swings.sum() * 100, 1) if swings.sum() > 0 else None,
            "avg_velo": avg_velo,
            "xba": xba,
        }

    return _sanitize({
        "latest_date": str(latest.date()),
        "L7":  window_stats(df[df["game_date"] >= latest - pd.Timedelta(days=7)]),
        "L14": window_stats(df[df["game_date"] >= latest - pd.Timedelta(days=14)]),
        "L30": window_stats(df[df["game_date"] >= latest - pd.Timedelta(days=30)]),
        "season": window_stats(df),
    })


@router.get("/{player_id}/batted-ball")
def batted_ball(player_id: int, season: int = 2025):
    """
    Batted ball profile: GB/LD/FB by pitch type, spray direction, pull/center/oppo rates,
    and called-strike probability by zone cell.
    """
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    # --- Batted ball by pitch type ---
    contact = df[df["bb_type"].notna()].copy()
    bb_by_type = {}
    for pt, grp in contact.groupby("pitch_type"):
        total = len(grp)
        bb_by_type[pt] = {
            "n": total,
            "gb_pct": round((grp["bb_type"] == "ground_ball").sum() / total * 100, 1),
            "fb_pct": round((grp["bb_type"] == "fly_ball").sum() / total * 100, 1),
            "ld_pct": round((grp["bb_type"] == "line_drive").sum() / total * 100, 1),
            "pu_pct": round((grp["bb_type"] == "popup").sum() / total * 100, 1),
            "avg_exit_velo": _safe_round(grp["launch_speed"].mean(), 1) if "launch_speed" in grp.columns else None,
            "avg_launch_angle": _safe_round(grp["launch_angle"].mean(), 1) if "launch_angle" in grp.columns else None,
        }

    # --- Spray direction (hc_x / hc_y) ---
    spray = df[df["hc_x"].notna() & df["hc_y"].notna()].copy() if "hc_x" in df.columns else pd.DataFrame()
    spray_points = []
    if not spray.empty:
        for _, row in spray.sample(min(500, len(spray)), random_state=42).iterrows():
            spray_points.append({
                "x": _safe_round(float(row["hc_x"]), 1),
                "y": _safe_round(float(row["hc_y"]), 1),
                "bb_type": row.get("bb_type"),
                "pitch_type": row.get("pitch_type"),
                "exit_velo": _safe_round(row.get("launch_speed"), 1),
            })

    # Pull/center/oppo: hc_x ~125 = LF, ~125 = RF (depends on batter hand)
    # We approximate: hc_x < 100 = pull for RHB, > 155 = pull for LHB
    pull_pct = center_pct = oppo_pct = None
    if not spray.empty and "stand" in spray.columns:
        rhb = spray[spray["stand"] == "R"]
        lhb = spray[spray["stand"] == "L"]
        hits = pd.concat([rhb, lhb])
        if len(hits) > 0:
            pull = ((rhb["hc_x"] < 105).sum() + (lhb["hc_x"] > 155).sum())
            oppo = ((rhb["hc_x"] > 155).sum() + (lhb["hc_x"] < 105).sum())
            center = len(hits) - pull - oppo
            pull_pct = round(pull / len(hits) * 100, 1)
            center_pct = round(center / len(hits) * 100, 1)
            oppo_pct = round(oppo / len(hits) * 100, 1)

    # --- Called strike probability by zone (5x5) ---
    zone_df = df[df["description"].isin(["called_strike","ball"])].copy()
    zone_df = zone_df[zone_df["plate_x"].notna() & zone_df["plate_z"].notna()]
    X_BINS = np.linspace(-1.5, 1.5, 6)
    Z_BINS = np.linspace(1.0, 4.5, 6)
    csw_grid = {}
    for zi in range(5):
        for xi in range(5):
            cell = zone_df[
                (zone_df["plate_x"] >= X_BINS[xi]) & (zone_df["plate_x"] < X_BINS[xi+1]) &
                (zone_df["plate_z"] >= Z_BINS[zi]) & (zone_df["plate_z"] < Z_BINS[zi+1])
            ]
            if len(cell) >= 5:
                csw = (cell["description"] == "called_strike").sum() / len(cell)
                csw_grid[f"{zi}_{xi}"] = {"csw": round(float(csw) * 100, 1), "n": int(len(cell))}

    return _sanitize({
        "by_pitch_type": bb_by_type,
        "spray_points": spray_points,
        "pull_pct": pull_pct,
        "center_pct": center_pct,
        "oppo_pct": oppo_pct,
        "csw_zone": csw_grid,
    })


@router.get("/{player_id}/fatigue")
def fatigue_model(player_id: int, season: int = 2025):
    """
    Velocity, spin, and command degradation as pitch count increases within games.
    Bins pitches 1-20, 21-40, 41-60, 61-80, 81-100, 100+.
    """
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    # Cumulative pitch number within each game
    if "pitch_number" not in df.columns:
        raise HTTPException(422, "No pitch_number column")

    df = df.copy()
    # Compute game-level cumulative pitch count
    df["cum_pitch"] = df.groupby("game_pk")["pitch_number"].transform(lambda x: x)

    BINS = [(1,20,"1-20"),(21,40,"21-40"),(41,60,"41-60"),(61,80,"61-80"),(81,100,"81-100"),(101,200,"100+")]
    result = []
    for lo, hi, label in BINS:
        sub = df[(df["cum_pitch"] >= lo) & (df["cum_pitch"] <= hi)]
        if sub.empty:
            continue
        avg_velo = _safe_round(sub["release_speed"].mean(), 1) if "release_speed" in sub.columns else None
        avg_spin = _safe_round(sub["release_spin_rate"].mean(), 0) if "release_spin_rate" in sub.columns else None
        # Command proxy: std dev of plate_x and plate_z (higher = less consistent)
        cmd_x = _safe_round(sub["plate_x"].std(), 3) if "plate_x" in sub.columns else None
        cmd_z = _safe_round(sub["plate_z"].std(), 3) if "plate_z" in sub.columns else None
        swings = sub["description"].isin(["swinging_strike","swinging_strike_blocked","foul","foul_tip","hit_into_play"])
        whiffs = sub["description"].isin(["swinging_strike","swinging_strike_blocked"])
        whiff_pct = round(whiffs.sum() / swings.sum() * 100, 1) if swings.sum() > 0 else None
        result.append({
            "bin": label, "lo": lo, "hi": hi, "n": int(len(sub)),
            "avg_velo": avg_velo, "avg_spin": avg_spin,
            "cmd_x_std": cmd_x, "cmd_z_std": cmd_z,
            "whiff_pct": whiff_pct,
        })

    # Per-pitch-type fatigue (velo only, top 2 pitch types)
    top_types = df["pitch_type"].value_counts().head(2).index.tolist() if "pitch_type" in df.columns else []
    per_type = {}
    for pt in top_types:
        sub_t = df[df["pitch_type"] == pt]
        bins_t = []
        for lo, hi, label in BINS:
            sub = sub_t[(sub_t["cum_pitch"] >= lo) & (sub_t["cum_pitch"] <= hi)]
            if len(sub) >= 5 and "release_speed" in sub.columns:
                bins_t.append({"bin": label, "avg_velo": _safe_round(sub["release_speed"].mean(), 1), "n": int(len(sub))})
        if bins_t:
            per_type[pt] = bins_t

    return _sanitize({"bins": result, "per_type": per_type})


@router.get("/{player_id}/game-log")
def game_log(player_id: int, season: int = 2025):
    """Per-game pitching log from MLB Stats API."""
    import requests
    url = (
        f"https://statsapi.mlb.com/api/v1/people/{player_id}/stats"
        f"?stats=gameLog&group=pitching&season={season}&gameType=R"
    )
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    if not data.get("stats") or not data["stats"][0].get("splits"):
        return []

    FIP_C = {2026: 3.18, 2025: 3.19, 2024: 3.17, 2023: 3.16, 2022: 3.11, 2021: 3.17}
    c = FIP_C.get(season, 3.15)

    games = []
    for s in data["stats"][0]["splits"]:
        stat = s.get("stat", {})
        ip_str = stat.get("inningsPitched", "0.0")
        parts = ip_str.split(".")
        ip = float(parts[0]) + (float(parts[1]) / 3 if len(parts) > 1 else 0)

        k = int(stat.get("strikeOuts", 0))
        bb = int(stat.get("baseOnBalls", 0))
        hbp = int(stat.get("hitBatsmen", 0))
        hr = int(stat.get("homeRuns", 0))
        h = int(stat.get("hits", 0))
        er = int(stat.get("earnedRuns", 0))
        bf = int(stat.get("battersFaced", 0)) or 1

        era_game = round(er / ip * 9, 2) if ip > 0 else None
        fip_game = round((13*hr + 3*(bb+hbp) - 2*k) / ip + c, 2) if ip > 0 else None
        k_pct = round(k / bf * 100, 1) if bf > 0 else None

        games.append({
            "date": s.get("date", ""),
            "opponent": s.get("opponent", {}).get("name", ""),
            "home": s.get("isHome", True),
            "result": stat.get("gamesPitched"),
            "ip": round(ip, 1),
            "h": h,
            "er": er,
            "k": k,
            "bb": bb,
            "hr": hr,
            "bf": bf,
            "era": era_game,
            "fip": fip_game,
            "k_pct": k_pct,
            "win": stat.get("wins", 0),
            "loss": stat.get("losses", 0),
            "save": stat.get("saves", 0),
        })

    # Most recent first
    return list(reversed(games))


@router.get("/{player_id}/leverage-splits")
def leverage_splits(player_id: int, season: int = 2025):
    """
    Splits by game situation:
    - Runners on vs bases empty
    - High leverage (RISP or tied/1-run game late) vs low
    - By inning (1-3, 4-6, 7+)
    """
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    def agg(sub):
        if sub.empty:
            return None
        pa_df = sub[sub["events"].notna()]
        pa = len(pa_df)
        k = (pa_df["events"] == "strikeout").sum()
        bb = (pa_df["events"] == "walk").sum()
        hr = (pa_df["events"] == "home_run").sum()
        swings = sub["description"].isin(["swinging_strike","swinging_strike_blocked","foul","foul_tip","hit_into_play"])
        whiffs = sub["description"].isin(["swinging_strike","swinging_strike_blocked"])
        xba = _safe_round(sub["estimated_ba_using_speedangle"].mean(), 3) if "estimated_ba_using_speedangle" in sub.columns else None
        rv = _safe_round(sub["delta_run_exp"].sum(), 2) if "delta_run_exp" in sub.columns else None
        return {
            "pa": int(pa), "k": int(k), "bb": int(bb), "hr": int(hr),
            "pitches": int(len(sub)),
            "k_pct":    round(k / pa * 100, 1) if pa > 0 else None,
            "bb_pct":   round(bb / pa * 100, 1) if pa > 0 else None,
            "whiff_pct":round(whiffs.sum() / swings.sum() * 100, 1) if swings.sum() > 0 else None,
            "xba": xba,
            "rv_per_100": round(rv / len(sub) * 100, 2) if rv is not None and len(sub) > 0 else None,
        }

    # Runners on / bases empty
    has_runner = (
        df.get("on_1b", pd.Series(dtype=float)).notna() |
        df.get("on_2b", pd.Series(dtype=float)).notna() |
        df.get("on_3b", pd.Series(dtype=float)).notna()
    )
    runners = {"bases_empty": agg(df[~has_runner]), "runners_on": agg(df[has_runner])}

    # RISP (2nd or 3rd occupied)
    risp = (
        df.get("on_2b", pd.Series(dtype=float)).notna() |
        df.get("on_3b", pd.Series(dtype=float)).notna()
    )
    risp_split = {"no_risp": agg(df[~risp]), "risp": agg(df[risp])}

    # By inning group
    inning_splits = {}
    if "inning" in df.columns:
        df["inning_group"] = pd.cut(df["inning"], bins=[0,3,6,30], labels=["1-3","4-6","7+"])
        for grp in ["1-3","4-6","7+"]:
            sub = df[df["inning_group"] == grp]
            if not sub.empty:
                inning_splits[grp] = agg(sub)

    # First pitch strikes vs balls
    first_pitch = df[df["balls"] == 0][df["strikes"] == 0] if "balls" in df.columns else pd.DataFrame()
    first_pitch_strike = None
    if not first_pitch.empty:
        strikes = first_pitch["description"].isin(["called_strike","swinging_strike","foul","foul_tip"])
        first_pitch_strike = round(strikes.sum() / len(first_pitch) * 100, 1)

    return _sanitize({
        "runners": runners,
        "risp": risp_split,
        "innings": inning_splits,
        "first_pitch_strike_pct": first_pitch_strike,
    })


@router.get("/{player_id}/pitch-type/{pitch_type}")
def pitch_type_deep_dive(player_id: int, pitch_type: str, season: int = 2025):
    """
    Full breakdown for a single pitch type: movement, release, zone usage,
    outcomes by count, velocity trend by month, platoon splits.
    """
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    df_p = df[df["pitch_type"] == pitch_type.upper()].copy()
    if df_p.empty:
        raise HTTPException(404, f"No {pitch_type} data found")

    df_p["game_date"] = pd.to_datetime(df_p["game_date"])

    # Core stats
    swings = df_p["description"].isin(["swinging_strike","swinging_strike_blocked","foul","foul_tip","hit_into_play"])
    whiffs = df_p["description"].isin(["swinging_strike","swinging_strike_blocked"])
    called_strikes = (df_p["description"] == "called_strike")
    pa_events = df_p[df_p["events"].notna()]

    stats = {
        "pitches": int(len(df_p)),
        "usage_pct": round(len(df_p) / len(df) * 100, 1),
        "avg_velo": _safe_round(df_p["release_speed"].mean(), 1),
        "max_velo": _safe_round(df_p["release_speed"].max(), 1),
        "avg_spin": _safe_round(df_p["release_spin_rate"].mean(), 0) if "release_spin_rate" in df_p else None,
        "avg_ivb": _safe_round(df_p["pfx_z"].mean() * 12, 1) if "pfx_z" in df_p.columns else None,
        "avg_hb": _safe_round(df_p["pfx_x"].mean() * 12, 1) if "pfx_x" in df_p.columns else None,
        "avg_extension": _safe_round(df_p["release_extension"].mean(), 2) if "release_extension" in df_p.columns else None,
        "whiff_pct": round(whiffs.sum() / swings.sum() * 100, 1) if swings.sum() > 0 else None,
        "csw_pct": round((whiffs.sum() + called_strikes.sum()) / len(df_p) * 100, 1),
        "put_away_pct": None,  # 2-strike whiff%
        "xba": _safe_round(df_p["estimated_ba_using_speedangle"].mean(), 3) if "estimated_ba_using_speedangle" in df_p.columns else None,
        "rv_per_100": _safe_round(df_p["delta_run_exp"].sum() / len(df_p) * 100, 2) if "delta_run_exp" in df_p.columns else None,
    }

    # Put-away (2-strike count)
    two_strike = df_p[df_p["strikes"] == 2]
    if not two_strike.empty:
        ts_swings = two_strike["description"].isin(["swinging_strike","swinging_strike_blocked","foul","foul_tip","hit_into_play"])
        ts_whiffs = two_strike["description"].isin(["swinging_strike","swinging_strike_blocked"])
        stats["put_away_pct"] = round(ts_whiffs.sum() / ts_swings.sum() * 100, 1) if ts_swings.sum() > 0 else None

    # Velo trend by month
    df_p["month"] = df_p["game_date"].dt.strftime("%b")
    df_p["month_num"] = df_p["game_date"].dt.month
    monthly = df_p.groupby(["month_num","month"]).agg(
        avg_velo=("release_speed","mean"),
        avg_spin=("release_spin_rate","mean") if "release_spin_rate" in df_p.columns else ("release_speed","count"),
        n=("release_speed","count")
    ).reset_index().sort_values("month_num")
    velo_trend = [{"month": r["month"], "avg_velo": _safe_round(r["avg_velo"], 1), "n": int(r["n"])} for _, r in monthly.iterrows()]

    # Zone heatmap (5x5) — whiff%
    X_BINS = np.linspace(-1.5, 1.5, 6)
    Z_BINS = np.linspace(1.0, 4.5, 6)
    heatmap = {}
    zone_df = df_p[df_p["plate_x"].notna() & df_p["plate_z"].notna()]
    for zi in range(5):
        for xi in range(5):
            cell = zone_df[
                (zone_df["plate_x"] >= X_BINS[xi]) & (zone_df["plate_x"] < X_BINS[xi+1]) &
                (zone_df["plate_z"] >= Z_BINS[zi]) & (zone_df["plate_z"] < Z_BINS[zi+1])
            ]
            if len(cell) >= 5:
                sw = cell["description"].isin(["swinging_strike","swinging_strike_blocked","foul","foul_tip","hit_into_play"])
                wh = cell["description"].isin(["swinging_strike","swinging_strike_blocked"])
                heatmap[f"{zi}_{xi}"] = {
                    "n": int(len(cell)),
                    "whiff_pct": round(wh.sum() / sw.sum() * 100, 1) if sw.sum() > 0 else None,
                    "usage_pct": round(len(cell) / len(zone_df) * 100, 1) if len(zone_df) > 0 else None,
                }

    # Platoon splits (vs LHB / RHB)
    platoon = {}
    if "stand" in df_p.columns:
        for side in ["L", "R"]:
            sub = df_p[df_p["stand"] == side]
            if not sub.empty:
                sw = sub["description"].isin(["swinging_strike","swinging_strike_blocked","foul","foul_tip","hit_into_play"])
                wh = sub["description"].isin(["swinging_strike","swinging_strike_blocked"])
                platoon[f"vs_{side}HB"] = {
                    "pitches": int(len(sub)),
                    "whiff_pct": round(wh.sum() / sw.sum() * 100, 1) if sw.sum() > 0 else None,
                    "avg_velo": _safe_round(sub["release_speed"].mean(), 1),
                    "xba": _safe_round(sub["estimated_ba_using_speedangle"].mean(), 3) if "estimated_ba_using_speedangle" in sub.columns else None,
                }

    return _sanitize({
        "pitch_type": pitch_type.upper(),
        "stats": stats,
        "velo_trend": velo_trend,
        "heatmap": heatmap,
        "platoon": platoon,
    })


@router.get("/{player_id}/tunneling")
def tunneling_detail(
    player_id: int,
    pitch_a: str = Query(...),
    pitch_b: str = Query(...),
    season: int = 2024,
    tunnel_ft: float = 23.0,
):
    """
    Detailed tunneling analysis between two pitch types.
    Returns tunnel distance distribution and outcome breakdowns.
    """
    df = get_pitcher_statcast(player_id, season)
    if df is None or df.empty:
        raise HTTPException(404, "No data found")

    tdf = calc_tunneling(df, pitch_a, pitch_b, tunnel_point_ft=tunnel_ft)
    if tdf.empty:
        raise HTTPException(404, f"No {pitch_a}/{pitch_b} pairs found")

    hist, bins = np.histogram(tdf["tunnel_distance_in"], bins=20)
    histogram = [{"bin_center": round((bins[i] + bins[i + 1]) / 2, 2), "count": int(hist[i])} for i in range(len(hist))]

    return {
        "pitch_a": pitch_a,
        "pitch_b": pitch_b,
        "tunnel_point_ft": tunnel_ft,
        "sample_size": len(tdf),
        "avg_tunnel_dist_in": _safe_round(tdf["tunnel_distance_in"].mean()),
        "median_tunnel_dist_in": _safe_round(tdf["tunnel_distance_in"].median()),
        "pct_under_3in": round((tdf["tunnel_distance_in"] < 3.0).mean() * 100, 1),
        "pct_under_6in": round((tdf["tunnel_distance_in"] < 6.0).mean() * 100, 1),
        "histogram": histogram,
    }
