from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class TubeParams(BaseModel):
    outer_diameter: float = Field(20.0, ge=2.0, le=1000.0)
    wall_thickness: float = Field(2.4, ge=0.8, le=100.0)
    height: float = Field(40.0, ge=1.0, le=2000.0)
    end_style: Literal["open", "one_end_closed", "both_closed"] = "open"
    end_cap_thickness: float = Field(2.0, ge=0.8, le=20.0)

    @field_validator("wall_thickness")
    @classmethod
    def wall_reasonable(cls, v: float, info):
        outer = info.data.get("outer_diameter", 0.0)
        if outer and v * 2.0 >= outer:
            raise ValueError("wall_thickness must be < outer_diameter / 2")
        return v


class HoleSpec(BaseModel):
    standard: Literal["ISO", "UNC"] = "ISO"
    size: Literal["M2", "M2_5", "M3", "M4", "M5", "M6"]
    fit: Literal["TIGHT", "SNAP", "SLIDE"] = "SNAP"
    through: bool = True
    depth: Optional[float] = None
    counterbore: bool = False
    countersink: bool = False
    head_type: Optional[Literal["flat", "pan", "socket"]] = None

    @field_validator("depth")
    @classmethod
    def depth_required_for_blind(cls, v: Optional[float], info):
        through = info.data.get("through", True)
        if not through and (v is None or v <= 0):
            raise ValueError("depth must be provided for blind holes")
        return v


class RectEnclosureParams(BaseModel):
    length: float = Field(100.0, ge=20.0, le=1000.0)
    width: float = Field(60.0, ge=20.0, le=1000.0)
    height: float = Field(40.0, ge=10.0, le=1000.0)
    wall_thickness: float = Field(2.4, ge=1.2, le=10.0)
    lid_height: float = Field(4.0, ge=2.0, le=30.0)
    lid_clearance: float = Field(0.2, ge=0.05, le=1.0)

    @field_validator("lid_height")
    @classmethod
    def lid_taller_than_wall(cls, v: float, info):
        height = info.data.get("height", 0.0)
        if v >= height:
            raise ValueError("lid_height must be < total height")
        return v


