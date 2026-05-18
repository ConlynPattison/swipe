import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

VoteChoice = Literal["yes", "no"]

USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not USERNAME_PATTERN.match(v):
            raise ValueError("Username may only contain letters, digits, hyphen, and underscore.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain an uppercase letter.")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain a lowercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain a digit.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    created_at: datetime


class PetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    image_url: str
    your_vote: VoteChoice | None = None


class VoteRequest(BaseModel):
    choice: VoteChoice


class VoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pet_id: int
    choice: VoteChoice
    updated_at: datetime
