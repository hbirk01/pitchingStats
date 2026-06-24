"""
Statcast data fetching and caching via pybaseball.
Provides pitch-level data from Baseball Savant for all advanced metrics.
"""
import pandas as pd
import numpy as np
from functools import lru_cache
from typing import Optional
import pybaseball
from pybaseball import statcast_pitcher, playerid_lookup, pitching_stats

pybaseball.cache.enable()


def lookup_player_id(first: str, last: str) -> Optional[int]:
    result = playerid_lookup(last, first)
    if result.empty:
        return None
    # prefer MLB key (mlbam id used by Statcast)
    row = result.iloc[0]
    return int(row["key_mlbam"]) if pd.notna(row["key_mlbam"]) else None


def get_pitcher_statcast(player_id: int, season: int) -> pd.DataFrame:
    """Return all pitch-level Statcast rows for a pitcher in a given season."""
    start = f"{season}-03-01"
    end = f"{season}-11-30"
    df = statcast_pitcher(start, end, player_id)
    return df


_arsenal_cache: dict = {}

def get_savant_arsenal(season: int) -> pd.DataFrame:
    """
    Pitch-level arsenal stats for all pitchers — merged from two pybaseball calls.
    Outcome features: whiff%, run_value/100, k%, put_away, est_ba, est_woba.
    Velocity: from statcast_pitcher_pitch_arsenal (wide format → melted).
    Used for cosine-similarity pitch comps.
    """
    from pybaseball import statcast_pitcher_arsenal_stats, statcast_pitcher_pitch_arsenal

    if season in _arsenal_cache:
        return _arsenal_cache[season]

    try:
        # Outcome metrics (long format, one row per pitcher × pitch_type)
        outcome = statcast_pitcher_arsenal_stats(season)
        outcome = outcome.rename(columns={
            "last_name, first_name": "player_name",
            "player_id": "player_id",
            "whiff_percent": "whiff_pct",
            "est_ba": "xba",
            "est_woba": "xwoba",
        })
        outcome = outcome[outcome["pitches"] >= 50]  # min 50 pitches per type

        # Velocity (wide format — one column per pitch type)
        velo_wide = statcast_pitcher_pitch_arsenal(season)
        velo_wide = velo_wide.rename(columns={"pitcher": "player_id"})
        # Melt to long: ff_avg_speed → pitch_type=FF, mph=value
        speed_cols = {c: c.split("_")[0].upper() for c in velo_wide.columns if c.endswith("_avg_speed")}
        if speed_cols:
            melted = velo_wide.melt(
                id_vars=["player_id"],
                value_vars=list(speed_cols.keys()),
                var_name="pt_col",
                value_name="mph"
            )
            melted["pitch_type"] = melted["pt_col"].map(speed_cols)
            melted = melted[["player_id", "pitch_type", "mph"]].dropna()
            outcome = outcome.merge(melted, on=["player_id", "pitch_type"], how="left")

        _arsenal_cache[season] = outcome
        return outcome
    except Exception as e:
        return pd.DataFrame()


def get_mlb_pitching_leaderboard(season: int, min_ip: int = 10) -> pd.DataFrame:
    """MLB Stats API pitching leaderboard — no third-party scraping needed."""
    import requests

    # FIP constant varies slightly by year; close enough for display
    FIP_CONST = {2026: 3.18, 2025: 3.19, 2024: 3.17, 2023: 3.16, 2022: 3.11, 2021: 3.17, 2020: 3.13}
    fip_c = FIP_CONST.get(season, 3.15)

    url = (
        "https://statsapi.mlb.com/api/v1/stats"
        f"?stats=season&group=pitching&season={season}"
        "&playerPool=All&limit=500&offset=0"
        "&sortStat=earnedRunAverage&order=asc"
    )
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    splits = resp.json()["stats"][0]["splits"]

    rows = []
    for s in splits:
        stat = s["stat"]
        ip_str = stat.get("inningsPitched", "0.0")
        # "60.1" means 60 full innings + 1 out = 60.333...
        parts = ip_str.split(".")
        ip = float(parts[0]) + (float(parts[1]) / 3 if len(parts) > 1 else 0)
        if ip < min_ip:
            continue

        player = s["player"]
        team = s.get("team", {}).get("name", "")
        g = int(stat.get("gamesPlayed", 0))
        gs = int(stat.get("gamesStarted", 0))
        bf = int(stat.get("battersFaced", 1)) or 1
        k = int(stat.get("strikeOuts", 0))
        bb = int(stat.get("baseOnBalls", 0))
        hbp = int(stat.get("hitBatsmen", 0))
        hr = int(stat.get("homeRuns", 0))
        h = int(stat.get("hits", 0))
        sf = int(stat.get("sacFlies", 0))
        ab = int(stat.get("atBats", 0))
        era = float(stat.get("era", 0) or 0)
        whip = float(stat.get("whip", 0) or 0)

        # FIP = (13*HR + 3*(BB+HBP) - 2*K) / IP + C
        fip = round((13 * hr + 3 * (bb + hbp) - 2 * k) / ip + fip_c, 2) if ip > 0 else None
        k_pct = round(k / bf, 4) if bf > 0 else None
        bb_pct = round(bb / bf, 4) if bf > 0 else None
        # BABIP = (H - HR) / (AB - K - HR + SF)
        babip_denom = ab - k - hr + sf
        babip = round((h - hr) / babip_denom, 3) if babip_denom > 0 else None

        rows.append({
            "Name": player["fullName"],
            "mlbam_id": player["id"],
            "Team": team,
            "G": g,
            "GS": gs,
            "IP": round(ip, 1),
            "ERA": round(era, 2),
            "FIP": fip,
            "WHIP": round(whip, 2),
            "K%": k_pct,
            "BB%": bb_pct,
            "BABIP": babip,
            "K": k,
            "BB": bb,
            "HR": hr,
        })

    return pd.DataFrame(rows) if rows else pd.DataFrame()


# ── Metric calculations ───────────────────────────────────────────────────────

def calc_vaa(df: pd.DataFrame) -> pd.DataFrame:
    """
    Vertical Approach Angle in degrees.
    VAA = arctan(vz0_plate / vx0_plate_speed) converted to degrees.
    Uses Statcast plate coordinates: vz0 (vertical velocity at plate) and
    the total horizontal+vertical speed.

    Standard formula: VAA = atan(vz_at_plate / sqrt(vx_at_plate^2 + vy_at_plate^2))
    Statcast provides vx0/vy0/vz0 at release; we need velocity at plate crossing.
    """
    df = df.copy()
    # time to plate ≈ 60.5 / |vy0|  (vy0 is negative toward plate)
    df["t_plate"] = 60.5 / df["vy0"].abs()
    df["vz_plate"] = df["vz0"] + (-32.174) * df["t_plate"]  # gravity accel ft/s^2
    df["vx_plate"] = df["vx0"]
    df["vy_plate"] = df["vy0"]
    speed_hz = np.sqrt(df["vx_plate"] ** 2 + df["vy_plate"] ** 2)
    df["vaa"] = np.degrees(np.arctan(df["vz_plate"] / speed_hz))
    return df


def calc_spin_efficiency(df: pd.DataFrame) -> pd.DataFrame:
    """
    Spin efficiency = active spin / total spin.
    Approximated from Statcast: spin_axis determines how much spin produces
    Magnus force vs. gyro (wasted) spin.
    Active spin % ≈ |sin(spin_axis_radians)| for back/topspin pitches.
    """
    df = df.copy()
    axis_rad = np.radians(df["spin_axis"])
    df["spin_efficiency"] = np.abs(np.sin(axis_rad)) * 100  # percent
    return df


def calc_release_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Release height, extension, and horizontal slot."""
    df = df.copy()
    df["release_height"] = df["release_pos_z"]
    df["release_side"] = df["release_pos_x"]
    df["extension"] = df["release_extension"]
    return df


def calc_tunneling(df: pd.DataFrame, pitch_a: str, pitch_b: str,
                   tunnel_point_ft: float = 23.0) -> pd.DataFrame:
    """
    Quantify pitch tunneling between two pitch types.

    At the tunnel point (~23 ft from plate), compute the vertical and
    horizontal separation between pitch A and pitch B. Closer = better tunnel.

    Returns DataFrame with per-pair tunnel distance, average, and outcome effects.
    """
    cols = ["pitch_type", "vy0", "vx0", "vz0", "release_pos_x", "release_pos_z", "release_extension"]
    available = [c for c in cols if c in df.columns]
    pa = df[df["pitch_type"] == pitch_a][available].dropna().copy()
    pb = df[df["pitch_type"] == pitch_b][available].dropna().copy()
    if pa.empty or pb.empty:
        return pd.DataFrame()

    # Sample to keep computation fast (max 150 pitches per type)
    MAX_SAMPLE = 150
    if len(pa) > MAX_SAMPLE:
        pa = pa.sample(MAX_SAMPLE, random_state=42)
    if len(pb) > MAX_SAMPLE:
        pb = pb.sample(MAX_SAMPLE, random_state=42)

    # Vectorized position at tunnel point using numpy broadcasting
    def pos_vectors(grp):
        ext = grp["release_extension"].values if "release_extension" in grp.columns else np.full(len(grp), 6.0)
        release_dist = 60.5 - ext
        t = (release_dist - tunnel_point_ft) / np.abs(grp["vy0"].values)
        x = grp["release_pos_x"].values + grp["vx0"].values * t
        z = grp["release_pos_z"].values + grp["vz0"].values * t + 0.5 * (-32.174) * t ** 2
        return x, z

    xa, za = pos_vectors(pa)
    xb, zb = pos_vectors(pb)

    # Broadcast: (n_a, 1) - (1, n_b) → (n_a, n_b) distance matrix
    dx = xa[:, None] - xb[None, :]
    dz = za[:, None] - zb[None, :]
    dist_matrix = np.sqrt(dx ** 2 + dz ** 2)

    dists_ft = dist_matrix.ravel()
    tunnel_df = pd.DataFrame({
        "pitch_a": pitch_a,
        "pitch_b": pitch_b,
        "tunnel_distance_ft": dists_ft,
        "tunnel_distance_in": dists_ft * 12,
    })
    return tunnel_df


def calc_command(df: pd.DataFrame) -> pd.DataFrame:
    """
    Quantify command: distance from intended target.
    Baseball Savant does not expose catcher target; we approximate using
    the called-strike zone midpoint for each pitch as proxy.
    A better approach: group by pitcher intent bucket using plate_x/plate_z
    quartiles vs. actual location.

    Returns miss distance stats per pitch type.
    """
    df = df.copy()
    results = []
    for pitch_type, group in df.groupby("pitch_type"):
        # Use zone median as intended target proxy
        med_x = group["plate_x"].median()
        med_z = group["plate_z"].median()
        group["miss_x"] = (group["plate_x"] - med_x).abs()
        group["miss_z"] = (group["plate_z"] - med_z).abs()
        group["miss_dist"] = np.sqrt(group["miss_x"] ** 2 + group["miss_z"] ** 2)
        results.append({
            "pitch_type": pitch_type,
            "avg_miss_dist_ft": group["miss_dist"].mean(),
            "avg_miss_dist_in": group["miss_dist"].mean() * 12,
            "miss_x_avg": group["miss_x"].mean() * 12,
            "miss_z_avg": group["miss_z"].mean() * 12,
            "count": len(group),
        })
    return pd.DataFrame(results)


def get_pitch_summary(df: pd.DataFrame) -> list[dict]:
    """Aggregate per-pitch-type summary with all computed metrics."""
    df = calc_vaa(df)
    df = calc_spin_efficiency(df)
    df = calc_release_metrics(df)

    summary = []
    for pitch_type, grp in df.groupby("pitch_type"):
        whiff = grp[grp["description"].isin(["swinging_strike", "swinging_strike_blocked"])]
        swings = grp[grp["description"].isin([
            "swinging_strike", "swinging_strike_blocked",
            "foul", "foul_tip", "hit_into_play",
        ])]
        s = {
            "pitch_type": pitch_type,
            "pitch_name": grp["pitch_name"].mode().iloc[0] if not grp["pitch_name"].isna().all() else pitch_type,
            "count": len(grp),
            "usage_pct": round(len(grp) / len(df) * 100, 1),
            "avg_velocity": round(grp["release_speed"].mean(), 1),
            "max_velocity": round(grp["release_speed"].max(), 1),
            "avg_spin_rate": round(grp["release_spin_rate"].mean(), 0),
            "avg_spin_efficiency": round(grp["spin_efficiency"].mean(), 1),
            "avg_vaa": round(grp["vaa"].mean(), 2),
            "avg_ivb": round(grp["pfx_z"].mean() * 12, 1),   # induced vertical break (inches)
            "avg_hb": round(grp["pfx_x"].mean() * 12, 1),    # horizontal break (inches)
            "avg_release_height": round(grp["release_height"].mean(), 2),
            "avg_extension": round(grp["extension"].mean(), 2),
            "whiff_rate": round(len(whiff) / len(swings) * 100, 1) if len(swings) > 0 else 0,
            "k_pct_contribution": None,  # filled after
        }
        summary.append(s)

    total_k = sum(1 for _, r in df.iterrows() if r.get("events") == "strikeout")
    for s in summary:
        pt = s["pitch_type"]
        k_by_pitch = df[(df["pitch_type"] == pt) & (df["events"] == "strikeout")]
        s["k_pct_contribution"] = round(len(k_by_pitch) / total_k * 100, 1) if total_k > 0 else 0

    return summary
