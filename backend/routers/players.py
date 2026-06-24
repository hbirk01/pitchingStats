from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from services.statcast_service import lookup_player_id, get_mlb_pitching_leaderboard, get_savant_arsenal
import pandas as pd
import numpy as np

router = APIRouter()


class PlayerSearchResult(BaseModel):
    player_id: int
    name: str
    team: Optional[str] = None


@router.get("/search")
def search_players(name: str = Query(..., min_length=2)):
    """Search for players by name. Returns mlbam id + name."""
    from pybaseball import playerid_lookup
    parts = name.strip().split()
    if len(parts) < 2:
        raise HTTPException(400, "Provide first and last name")
    first, last = parts[0], " ".join(parts[1:])
    result = playerid_lookup(last, first)
    if result.empty:
        return []
    out = []
    for _, row in result.iterrows():
        if pd.notna(row["key_mlbam"]):
            out.append({
                "player_id": int(row["key_mlbam"]),
                "name": f"{row['name_first'].title()} {row['name_last'].title()}",
                "birth_year": int(row["birth_year"]) if "birth_year" in row and pd.notna(row["birth_year"]) else None,
                "mlb_played_last": int(row["mlb_played_last"]) if "mlb_played_last" in row and pd.notna(row["mlb_played_last"]) else None,
            })
    return out


@router.get("/leaderboard")
def pitching_leaderboard(season: int = 2024, min_ip: int = 20, role: str = "all"):
    """MLB Stats API pitching leaderboard with mlbam IDs for headshots."""
    import numpy as np
    df = get_mlb_pitching_leaderboard(season, min_ip)
    if df.empty:
        return []

    # Role filter
    if role == "sp" and "GS" in df.columns and "G" in df.columns:
        df = df[df["GS"] >= df["G"] * 0.5]
    elif role == "rp" and "GS" in df.columns and "G" in df.columns:
        df = df[df["GS"] < df["G"] * 0.3]

    # Sanitize NaN/inf
    records = []
    for _, row in df.iterrows():
        rec = {}
        for col in df.columns:
            val = row[col]
            if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
                rec[col] = None
            else:
                rec[col] = val
        records.append(rec)

    return records


@router.get("/teams")
def list_teams():
    """All 30 MLB teams with IDs."""
    import requests
    resp = requests.get("https://statsapi.mlb.com/api/v1/teams?sportId=1&season=2024", timeout=10)
    resp.raise_for_status()
    teams = resp.json()["teams"]
    return sorted([
        {"id": t["id"], "name": t["name"], "abbr": t.get("abbreviation", ""), "division": t.get("division", {}).get("name", "")}
        for t in teams if t.get("active", True)
    ], key=lambda x: x["name"])


@router.get("/team/{team_id}")
def team_pitching(team_id: int, season: int = 2024, min_ip: int = 5):
    """Pitching staff for a team — stats from MLB Stats API."""
    import requests

    FIP_CONST = {2026: 3.18, 2025: 3.19, 2024: 3.17, 2023: 3.16, 2022: 3.11, 2021: 3.17, 2020: 3.13}
    fip_c = FIP_CONST.get(season, 3.15)

    # Fetch team info
    team_resp = requests.get(f"https://statsapi.mlb.com/api/v1/teams/{team_id}", timeout=10)
    team_resp.raise_for_status()
    team_info = team_resp.json()["teams"][0]

    # Fetch all pitchers for this team this season (no limit)
    url = (
        f"https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching"
        f"&season={season}&playerPool=All&teamId={team_id}&limit=100"
    )
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    splits = resp.json()["stats"][0]["splits"]

    pitchers = []
    for s in splits:
        stat = s["stat"]
        ip_str = stat.get("inningsPitched", "0.0")
        parts = ip_str.split(".")
        ip = float(parts[0]) + (float(parts[1]) / 3 if len(parts) > 1 else 0)
        if ip < min_ip:
            continue

        bf = int(stat.get("battersFaced", 1)) or 1
        k = int(stat.get("strikeOuts", 0))
        bb = int(stat.get("baseOnBalls", 0))
        hbp = int(stat.get("hitBatsmen", 0))
        hr = int(stat.get("homeRuns", 0))
        h = int(stat.get("hits", 0))
        sf = int(stat.get("sacFlies", 0))
        ab = int(stat.get("atBats", 0))
        g = int(stat.get("gamesPlayed", 0))
        gs = int(stat.get("gamesStarted", 0))
        era = float(stat.get("era", 0) or 0)
        whip = float(stat.get("whip", 0) or 0)

        fip = round((13*hr + 3*(bb+hbp) - 2*k) / ip + fip_c, 2) if ip > 0 else None
        k_pct = round(k / bf, 4) if bf > 0 else None
        bb_pct = round(bb / bf, 4) if bf > 0 else None
        babip_denom = ab - k - hr + sf
        babip = round((h - hr) / babip_denom, 3) if babip_denom > 0 else None

        pitchers.append({
            "mlbam_id": s["player"]["id"],
            "Name": s["player"]["fullName"],
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

    pitchers.sort(key=lambda x: x["IP"], reverse=True)

    def _san(v):
        if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
            return None
        return v

    return {
        "team": {"id": team_id, "name": team_info["name"], "abbr": team_info.get("abbreviation", "")},
        "season": season,
        "pitchers": [{k: _san(v) for k, v in p.items()} for p in pitchers],
    }


def _safe_val(v):
    if v is None:
        return None
    try:
        f = float(v)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, 3)
    except Exception:
        return None


@router.get("/{player_id}/comps")
def pitch_comps(player_id: int, season: int = 2024, n: int = 5):
    """
    Find the most similar pitchers by cosine similarity on pitch metrics.
    Uses Baseball Savant pre-aggregated arsenal stats.
    Features: velocity, iVB, HB, VAA (normalised).
    Returns top-n comps per pitch type for this player.
    """
    arsenal = get_savant_arsenal(season)
    if arsenal.empty:
        raise HTTPException(503, "Could not fetch Savant arsenal data")

    # Features available from pybaseball arsenal stats
    FEAT = ["mph", "whiff_pct", "run_value_per_100", "k_percent", "put_away", "xba"]
    results = {}

    player_pitches = arsenal[arsenal["player_id"].astype(str) == str(player_id)]
    if player_pitches.empty:
        raise HTTPException(404, f"Player {player_id} not found in Savant arsenal for {season}")

    for _, player_row in player_pitches.iterrows():
        pt = player_row["pitch_type"]
        pt_pool = arsenal[(arsenal["pitch_type"] == pt) & (arsenal["player_id"].astype(str) != str(player_id))].copy()
        if len(pt_pool) < n:
            continue

        # Build feature vectors — drop rows with any null in features
        pt_pool = pt_pool.dropna(subset=FEAT)
        if player_row[FEAT].isna().any() or len(pt_pool) < n:
            continue

        target = player_row[FEAT].values.astype(float)
        pool_mat = pt_pool[FEAT].values.astype(float)

        # Normalise each feature to 0-1 across the pool
        feat_min = pool_mat.min(axis=0)
        feat_max = pool_mat.max(axis=0)
        rng = feat_max - feat_min
        rng[rng == 0] = 1
        pool_norm = (pool_mat - feat_min) / rng
        target_norm = (target - feat_min) / rng

        # Cosine similarity
        def cos_sim(a, b):
            n_a = np.linalg.norm(a)
            n_b = np.linalg.norm(b)
            if n_a == 0 or n_b == 0:
                return 0.0
            return float(np.dot(a, b) / (n_a * n_b))

        sims = [cos_sim(target_norm, pool_norm[i]) for i in range(len(pool_norm))]
        pt_pool = pt_pool.copy()
        pt_pool["similarity"] = sims
        top = pt_pool.nlargest(n, "similarity")

        results[pt] = {
            "target": {
                "mph": _safe_val(player_row.get("mph")),
                "whiff_pct": _safe_val(player_row.get("whiff_pct")),
                "run_value_per_100": _safe_val(player_row.get("run_value_per_100")),
                "k_percent": _safe_val(player_row.get("k_percent")),
                "put_away": _safe_val(player_row.get("put_away")),
                "xba": _safe_val(player_row.get("xba")),
                "pitches": int(player_row.get("pitches", 0)),
            },
            "comps": [
                {
                    "player_id": int(r["player_id"]) if pd.notna(r.get("player_id")) else None,
                    "name": r.get("player_name"),
                    "similarity": round(float(r["similarity"]), 4),
                    "mph": _safe_val(r.get("mph")),
                    "whiff_pct": _safe_val(r.get("whiff_pct")),
                    "run_value_per_100": _safe_val(r.get("run_value_per_100")),
                    "k_percent": _safe_val(r.get("k_percent")),
                    "xba": _safe_val(r.get("xba")),
                }
                for _, r in top.iterrows()
            ]
        }

    # Sanitise NaN
    def _san(obj):
        if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
            return None
        if isinstance(obj, dict):
            return {k: _san(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_san(v) for v in obj]
        return obj

    return _san(results)
