from pydantic import BaseModel
from typing import Optional
from datetime import date

from backend.models.case import CaseType, CaseStatus


class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    case_type: CaseType
    status: CaseStatus = CaseStatus.ACTIVE
    case_number: Optional[str] = None
    court_name: Optional[str] = None
    judge: Optional[str] = None
    opposing_party: Optional[str] = None
    opposing_counsel: Optional[str] = None
    next_hearing_date: Optional[date] = None
    filing_deadline: Optional[date] = None


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    case_type: Optional[CaseType] = None
    status: Optional[CaseStatus] = None
    case_number: Optional[str] = None
    court_name: Optional[str] = None
    judge: Optional[str] = None
    opposing_party: Optional[str] = None
    opposing_counsel: Optional[str] = None
    next_hearing_date: Optional[date] = None
    filing_deadline: Optional[date] = None


class CaseInDBBase(CaseBase):
    id: int
    user_id: str

    class Config:
        orm_mode = True


class Case(CaseInDBBase):
    pass


class CaseInDB(CaseInDBBase):
    pass
