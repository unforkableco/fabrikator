import pytest
from pydantic import ValidationError

from cadlib import TubeParams, tube


def test_invalid_tube_wall_thickness_message():
    # wall thickness >= outer/2 should raise a clear error
    with pytest.raises(ValidationError) as ei:
        TubeParams(outer_diameter=10.0, wall_thickness=6.0, height=20.0)
    msg = str(ei.value)
    assert "wall_thickness" in msg and "< outer_diameter / 2" in msg


