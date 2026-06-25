from fastapi import APIRouter, HTTPException
import requests
import datetime

router = APIRouter()
MLB_API = "https://statsapi.mlb.com"


def _safe_ip(ip_str):
    """'5.2' → (5.667, '5.2')  where .2 means 2 outs = 2/3 of an inning."""
    try:
        parts = str(ip_str or "0").split(".")
        decimal = int(parts[0]) + int(parts[1]) / 3 if len(parts) == 2 else float(ip_str or 0)
        return decimal, str(ip_str)
    except Exception:
        return 0.0, "0.0"


def _era_str(er, ip_decimal):
    if not ip_decimal:
        return "---"
    return f"{(er / ip_decimal * 9):.2f}"


RESULT_MAP = {
    "Called Strike":              ("CS", "strike"),
    "Swinging Strike":            ("SS", "whiff"),
    "Swinging Strike (Blocked)":  ("SS", "whiff"),
    "Ball":                       ("B",  "ball"),
    "Ball In Dirt":               ("B",  "ball"),
    "Foul":                       ("F",  "foul"),
    "Foul Tip":                   ("FT", "foul"),
    "Foul Bunt":                  ("FB", "foul"),
    "In play, no out":            ("X",  "contact"),
    "In play, out(s)":            ("X",  "contact"),
    "In play, run(s)":            ("X",  "contact"),
    "Hit By Pitch":               ("HBP","other"),
    "Pitchout":                   ("PO", "other"),
}


@router.get("/games")
def live_games():
    """All MLB games today with scores, status, and probable pitchers."""
    today = datetime.date.today().isoformat()
    try:
        url = (
            f"{MLB_API}/api/v1/schedule"
            f"?sportId=1&date={today}"
            f"&hydrate=linescore,probablePitcher,team"
        )
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(502, f"MLB Stats API unavailable: {e}")

    dates = data.get("dates", [])
    if not dates:
        return []

    games = []
    for game in dates[0].get("games", []):
        teams = game.get("teams", {})
        home = teams.get("home", {})
        away = teams.get("away", {})
        status = game.get("status", {})
        ls = game.get("linescore", {})

        abstract = status.get("abstractGameState", "Preview")
        detailed  = status.get("detailedState", "Scheduled")

        home_score = ls.get("teams", {}).get("home", {}).get("runs")
        away_score = ls.get("teams", {}).get("away", {}).get("runs")

        games.append({
            "game_pk":   game["gamePk"],
            "status":    abstract,       # "Preview", "Live", "Final"
            "detailed_status": detailed, # "Scheduled", "In Progress", "Final", "Warmup", etc.
            "inning":    ls.get("currentInning"),
            "inning_half": ls.get("inningHalf"),
            "outs":      ls.get("outs"),
            "home_team": home.get("team", {}).get("name"),
            "home_abbr": home.get("team", {}).get("abbreviation"),
            "away_team": away.get("team", {}).get("name"),
            "away_abbr": away.get("team", {}).get("abbreviation"),
            "home_score": home_score,
            "away_score": away_score,
            "home_probable": home.get("probablePitcher", {}).get("fullName"),
            "away_probable": away.get("probablePitcher", {}).get("fullName"),
            "venue": game.get("venue", {}).get("name"),
            "game_time_utc": game.get("gameDate"),
        })

    return games


@router.get("/game/{game_pk}")
def live_game_detail(game_pk: int):
    """Full live pitch-by-pitch data for a single game."""
    try:
        url = f"{MLB_API}/api/v1.1/game/{game_pk}/feed/live"
        r = requests.get(url, timeout=12)
        r.raise_for_status()
        feed = r.json()
    except Exception as e:
        raise HTTPException(502, f"MLB Stats API unavailable: {e}")

    game_data = feed.get("gameData", {})
    live_data  = feed.get("liveData", {})

    abstract_state = game_data.get("status", {}).get("abstractGameState", "Preview")
    detailed_state  = game_data.get("status", {}).get("detailedState", "Scheduled")

    if abstract_state == "Preview":
        return {"game_pk": game_pk, "state": "preview", "detailed_status": detailed_state}

    linescore = live_data.get("linescore", {})
    ls_teams  = linescore.get("teams", {})

    home_score = ls_teams.get("home", {}).get("runs", 0)
    away_score = ls_teams.get("away", {}).get("runs", 0)
    inning     = linescore.get("currentInning")
    inning_half = linescore.get("inningHalf")
    outs       = linescore.get("outs", 0)

    # Current play info
    all_plays    = live_data.get("plays", {}).get("allPlays", [])
    current_play = live_data.get("plays", {}).get("currentPlay", {})
    current_matchup = current_play.get("matchup", {})

    current_pitcher_info = current_matchup.get("pitcher", {})
    current_batter_info  = current_matchup.get("batter",  {})
    current_count = current_play.get("count", {})

    current_pitcher_id   = current_pitcher_info.get("id")
    current_pitcher_name = current_pitcher_info.get("fullName", "Unknown")
    current_batter_name  = current_batter_info.get("fullName", "—")

    # Figure out which side (home/away) the current pitcher is on
    home_pitchers_ids = {
        p for p in live_data.get("boxscore", {}).get("teams", {})
              .get("home", {}).get("pitchers", [])
    }
    pitcher_side = "home" if current_pitcher_id in home_pitchers_ids else "away"

    # Get in-game stats for current pitcher from boxscore
    boxscore_teams = live_data.get("boxscore", {}).get("teams", {})
    pitcher_stats_map = {}
    for side in ("home", "away"):
        for pid in boxscore_teams.get(side, {}).get("pitchers", []):
            pinfo = boxscore_teams[side].get("players", {}).get(f"ID{pid}", {})
            pstats = pinfo.get("stats", {}).get("pitching", {})
            pitcher_stats_map[pid] = pstats

    cp_box = pitcher_stats_map.get(current_pitcher_id, {})
    ip_decimal, ip_str = _safe_ip(cp_box.get("inningsPitched", "0.0"))
    earned_runs = int(cp_box.get("earnedRuns", 0) or 0)
    strikeouts  = int(cp_box.get("strikeOuts",  0) or 0)
    walks       = int(cp_box.get("baseOnBalls", 0) or 0)
    pitch_count = int(cp_box.get("numberOfPitches", 0) or 0)

    # Build pitch log from all plays by current pitcher
    pitch_log   = []
    velo_trend  = []
    pitch_type_counts = {}
    swings = 0
    whiffs = 0
    balls_in_play = 0
    ground_balls  = 0
    pitch_num = 0

    for play in all_plays:
        if play.get("matchup", {}).get("pitcher", {}).get("id") != current_pitcher_id:
            continue
        batter_name = play.get("matchup", {}).get("batter", {}).get("fullName", "—")
        pa_idx = play.get("atBatIndex", 0)

        for event in play.get("playEvents", []):
            if not event.get("isPitch"):
                continue
            pitch_num += 1
            pdata = event.get("pitchData", {})
            pdetails = event.get("details", {})

            desc  = pdetails.get("description", "")
            ptype = pdetails.get("type", {}).get("code", "—")
            pname = pdetails.get("type", {}).get("description", "")
            velo  = pdata.get("startSpeed")
            coords = pdata.get("coordinates", {})
            px    = coords.get("pX")
            pz    = coords.get("pZ")
            zone  = pdata.get("zone")
            count_b = event.get("count", {}).get("balls", 0)
            count_s = event.get("count", {}).get("strikes", 0)

            result_abbr, result_class = RESULT_MAP.get(desc, ("?", "other"))

            if result_class == "whiff":
                whiffs += 1
                swings += 1
            elif result_class == "foul":
                swings += 1
            elif result_class == "contact":
                swings += 1
                balls_in_play += 1
                hit_data = play.get("hitData", {})
                if hit_data.get("trajectory") == "ground_ball":
                    ground_balls += 1

            if velo:
                velo_trend.append(round(velo, 1))

            pitch_type_counts[ptype] = pitch_type_counts.get(ptype, 0) + 1

            pitch_log.append({
                "pitch_num":   pitch_num,
                "pitch_type":  ptype,
                "pitch_name":  pname,
                "velo":        round(velo, 1) if velo else None,
                "zone":        zone,
                "px":          round(px, 3) if px else None,
                "pz":          round(pz, 3) if pz else None,
                "description": desc,
                "result_abbr": result_abbr,
                "result_class":result_class,
                "balls":       count_b,
                "strikes":     count_s,
                "batter":      batter_name,
                "pa_index":    pa_idx,
            })

    # Derived rates
    whiff_pct = round(whiffs / swings * 100, 1) if swings > 0 else None
    gb_pct    = round(ground_balls / balls_in_play * 100, 1) if balls_in_play > 0 else None

    # Reverse pitch log so most recent is first
    pitch_log.reverse()

    return {
        "game_pk":    game_pk,
        "state":      abstract_state,
        "detailed_status": detailed_state,
        "inning":     inning,
        "inning_half": inning_half,
        "outs":       outs,
        "home_score": home_score,
        "away_score": away_score,
        "current_pitcher": {
            "id":           current_pitcher_id,
            "name":         current_pitcher_name,
            "side":         pitcher_side,
            "pitch_count":  pitch_count or pitch_num,
            "ip_str":       ip_str,
            "ip_decimal":   round(ip_decimal, 3),
            "earned_runs":  earned_runs,
            "strikeouts":   strikeouts,
            "walks":        walks,
            "era_today":    _era_str(earned_runs, ip_decimal),
            "k_minus_bb":   strikeouts - walks,
            "current_batter": current_batter_name,
            "count_balls":  current_count.get("balls", 0),
            "count_strikes": current_count.get("strikes", 0),
        },
        "pitch_log":        pitch_log,
        "velo_trend":       velo_trend,
        "pitch_type_counts": pitch_type_counts,
        "whiff_pct":        whiff_pct,
        "gb_pct":           gb_pct,
    }
