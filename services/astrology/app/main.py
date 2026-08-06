from datetime import UTC, date, datetime
import hashlib
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="AstroAI Calculation Service", version="0.1.0")

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
NAKSHATRAS = ["Ashwini", "Rohini", "Mrigashira", "Pushya", "Magha", "Hasta", "Swati", "Anuradha", "Mula", "Shravana", "Dhanishta", "Revati"]


class BirthDetails(BaseModel):
    name: str = Field(min_length=2)
    birthDate: date
    birthTime: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    birthPlace: str = Field(min_length=2)
    language: str
    focusArea: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "astrology-calculation", "engine": "mock-v1"}


@app.post("/calculate")
def calculate(details: BirthDetails):
    """Stable mock engine. Replace this function with Swiss Ephemeris without changing the API contract."""
    seed_text = f"{details.birthDate}|{details.birthTime}|{details.birthPlace.strip().lower()}"
    digest = hashlib.sha256(seed_text.encode()).digest()
    ascendant_index = digest[0] % 12
    planets = []
    for index, name in enumerate(PLANETS):
        position = int.from_bytes(digest[index:index + 2], "big") % 36000 / 100
        sign_index = int(position // 30)
        planets.append({
            "name": name,
            "sign": SIGNS[sign_index],
            "house": ((sign_index - ascendant_index) % 12) + 1,
            "degree": round(position % 30, 2),
        })
    moon = planets[1]
    return {
        "engine": "mock-v1",
        "calculatedAt": datetime.now(UTC).isoformat(),
        "ascendant": SIGNS[ascendant_index],
        "moonSign": moon["sign"],
        "nakshatra": NAKSHATRAS[int(moon["degree"] / 30 * 12) % 12],
        "planets": planets,
        "assumptions": ["Mocked geocoding and timezone", "Sidereal settings are an extension point"],
    }
