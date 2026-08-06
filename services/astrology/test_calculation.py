from app.lambda_handler import handler
from app.main import BirthDetails, calculate


def test_calculation_is_deterministic():
    payload = BirthDetails(**{
        "name": "Aanya Sharma",
        "birthDate": "1994-10-12",
        "birthTime": "08:45",
        "birthPlace": "Jaipur, India",
        "language": "English",
        "focusArea": "Overview",
    })
    first = calculate(payload)
    second = calculate(payload)
    assert first["planets"] == second["planets"]
    assert len(first["planets"]) == 9


def test_lambda_handler_uses_the_same_contract():
    event = {
        "name": "Aanya Sharma",
        "birthDate": "1994-10-12",
        "birthTime": "08:45",
        "birthPlace": "Jaipur, India",
        "language": "English",
        "focusArea": "Overview",
    }
    result = handler(event, None)
    assert result["engine"] == "mock-v1"
    assert result["ascendant"]
