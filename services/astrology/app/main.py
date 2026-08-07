from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import FastAPI
from pydantic import BaseModel, Field, field_validator
import swisseph as swe

app = FastAPI(title="AstroAI Calculation Service", version="0.2.0")

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]
NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
    "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
    "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
    "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]
PLANET_IDS = [
    ("Sun", swe.SUN),
    ("Moon", swe.MOON),
    ("Mars", swe.MARS),
    ("Mercury", swe.MERCURY),
    ("Jupiter", swe.JUPITER),
    ("Venus", swe.VENUS),
    ("Saturn", swe.SATURN),
    ("Rahu", swe.TRUE_NODE),
]
CALCULATION_FLAGS = swe.FLG_MOSEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED


class BirthDetails(BaseModel):
    name: str = Field(min_length=2)
    birthDate: date
    birthTime: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    birthPlace: str = Field(min_length=2)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    timeZone: str = Field(min_length=3)
    language: str
    focusArea: str

    @field_validator("timeZone")
    @classmethod
    def validate_time_zone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as error:
            raise ValueError("Use a valid IANA timezone, for example Asia/Kolkata") from error
        return value


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "astrology-calculation",
        "engine": "swiss-ephemeris-moshier-v1",
        "swissEphemerisVersion": swe.version,
    }


@app.post("/calculate")
def calculate(details: BirthDetails):
    """Calculate an offline, sidereal D1 chart from explicit birth coordinates."""
    local_datetime = datetime.combine(
        details.birthDate,
        time.fromisoformat(details.birthTime),
        tzinfo=ZoneInfo(details.timeZone),
    )
    utc_datetime = local_datetime.astimezone(UTC)
    utc_hour = (
        utc_datetime.hour
        + utc_datetime.minute / 60
        + utc_datetime.second / 3600
        + utc_datetime.microsecond / 3_600_000_000
    )
    julian_day = swe.julday(
        utc_datetime.year,
        utc_datetime.month,
        utc_datetime.day,
        utc_hour,
        swe.GREG_CAL,
    )

    swe.set_sid_mode(swe.SIDM_LAHIRI)
    _, ascmc = swe.houses_ex(
        julian_day,
        details.latitude,
        details.longitude,
        b"P",
        swe.FLG_SIDEREAL,
    )
    ascendant_longitude = normalize_longitude(ascmc[0])
    ascendant_sign_index = sign_index(ascendant_longitude)

    warnings: list[str] = []
    planets = []
    for name, planet_id in PLANET_IDS:
        coordinates, _, warning = swe.calc_ut(julian_day, planet_id, CALCULATION_FLAGS)
        if warning and warning not in warnings:
            warnings.append(warning)
        planets.append(planet_result(name, coordinates[0], coordinates[3], ascendant_sign_index))

    rahu = next(planet for planet in planets if planet["name"] == "Rahu")
    planets.append(planet_result("Ketu", rahu["longitude"] + 180, rahu["speed"], ascendant_sign_index))

    moon = next(planet for planet in planets if planet["name"] == "Moon")
    nakshatra_span = 360 / 27
    pada_span = nakshatra_span / 4
    nakshatra_index = min(int(moon["longitude"] / nakshatra_span), 26)
    pada = min(int((moon["longitude"] % nakshatra_span) / pada_span) + 1, 4)

    return {
        "engine": "swiss-ephemeris-moshier-v1",
        "calculatedAt": datetime.now(UTC).isoformat(),
        "birthTimeUtc": utc_datetime.isoformat(),
        "julianDayUt": round(julian_day, 8),
        "ascendant": SIGNS[ascendant_sign_index],
        "ascendantLongitude": round(ascendant_longitude, 6),
        "ascendantDegree": round(ascendant_longitude % 30, 4),
        "moonSign": moon["sign"],
        "nakshatra": NAKSHATRAS[nakshatra_index],
        "nakshatraPada": pada,
        "planets": planets,
        "metadata": {
            "zodiac": "Sidereal",
            "ayanamsa": "Lahiri",
            "ayanamsaDegrees": round(swe.get_ayanamsa_ut(julian_day), 6),
            "ephemeris": "Moshier (offline Swiss Ephemeris)",
            "houseSystem": "Whole sign houses from the Swiss Ephemeris sidereal ascendant",
            "nodeType": "True lunar node",
            "coordinates": {"latitude": details.latitude, "longitude": details.longitude},
            "timeZone": details.timeZone,
            "utcOffset": local_datetime.strftime("%z"),
            "warnings": warnings,
        },
        "assumptions": [
            "Coordinates and IANA timezone were supplied by the user.",
            "Planetary positions are geocentric and sidereal using Lahiri ayanamsa.",
            "D1 houses use the whole-sign convention from the calculated ascendant sign.",
        ],
    }


def planet_result(name: str, longitude: float, speed: float, ascendant_sign_index: int):
    normalized = normalize_longitude(longitude)
    planet_sign_index = sign_index(normalized)
    return {
        "name": name,
        "longitude": round(normalized, 6),
        "sign": SIGNS[planet_sign_index],
        "house": ((planet_sign_index - ascendant_sign_index) % 12) + 1,
        "degree": round(normalized % 30, 4),
        "retrograde": speed < 0,
        "speed": round(speed, 8),
    }


def normalize_longitude(longitude: float) -> float:
    return longitude % 360


def sign_index(longitude: float) -> int:
    return int(normalize_longitude(longitude) // 30) % 12
