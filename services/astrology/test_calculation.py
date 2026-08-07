from pydantic import ValidationError
import pytest

from app.lambda_handler import handler
from app.main import BirthDetails, calculate


JAIPUR_BIRTH = {
    "name": "Aanya Sharma",
    "birthDate": "1994-10-12",
    "birthTime": "08:45",
    "birthPlace": "Jaipur, India",
    "latitude": 26.9124,
    "longitude": 75.7873,
    "timeZone": "Asia/Kolkata",
    "language": "English",
    "focusArea": "Overview",
}


def test_calculation_is_deterministic_and_complete():
    payload = BirthDetails(**JAIPUR_BIRTH)
    first = calculate(payload)
    second = calculate(payload)

    assert first["engine"] == "swiss-ephemeris-moshier-v1"
    assert first["planets"] == second["planets"]
    assert len(first["planets"]) == 9
    assert 1 <= first["nakshatraPada"] <= 4
    assert first["metadata"]["ayanamsa"] == "Lahiri"
    assert first["metadata"]["houseSystem"].startswith("Whole sign")

    rahu = next(planet for planet in first["planets"] if planet["name"] == "Rahu")
    ketu = next(planet for planet in first["planets"] if planet["name"] == "Ketu")
    assert ((ketu["longitude"] - rahu["longitude"]) % 360) == pytest.approx(180)


def test_j2000_sidereal_sun_matches_known_swiss_ephemeris_position():
    result = calculate(BirthDetails(**{
        **JAIPUR_BIRTH,
        "birthDate": "2000-01-01",
        "birthTime": "12:00",
        "birthPlace": "Greenwich",
        "latitude": 0,
        "longitude": 0,
        "timeZone": "UTC",
    }))
    sun = next(planet for planet in result["planets"] if planet["name"] == "Sun")
    assert sun["sign"] == "Sagittarius"
    assert sun["longitude"] == pytest.approx(256.5157, abs=0.001)


def test_invalid_timezone_is_rejected():
    with pytest.raises(ValidationError):
        BirthDetails(**{**JAIPUR_BIRTH, "timeZone": "India/NotAZone"})


def test_lambda_handler_uses_the_same_contract():
    result = handler(JAIPUR_BIRTH, None)
    assert result["engine"] == "swiss-ephemeris-moshier-v1"
    assert result["ascendant"]
