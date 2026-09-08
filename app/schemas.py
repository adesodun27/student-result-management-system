from pydantic import BaseModel, Field
from typing import List, Optional

class SingleResultUpload(BaseModel):
    course_code: str = Field(..., example="CSC201")
    session: str = Field(..., example="2025/2026")
    semester: str = Field(..., example="Harmattan")
    matric_number: str = Field(..., example="SEN/2023/1001")
    ca_score: float = Field(..., ge=0, le=30)
    exam_score: float = Field(..., ge=0, le=70)

class UploadResponse(BaseModel):
    success_count: int
    failed_count: int
    errors: List[str]