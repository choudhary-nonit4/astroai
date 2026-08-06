from app.main import BirthDetails, calculate


def handler(event, _context):
    """Private Lambda entry point invoked directly by the NestJS API Lambda."""
    return calculate(BirthDetails.model_validate(event))
