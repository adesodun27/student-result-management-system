import csv
import io
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, status
from app.database import supabase
from app.schemas import SingleResultUpload, UploadResponse

router = APIRouter(prefix="/api/v1/results", tags=["Results"])

def process_single_grade(item: SingleResultUpload) -> tuple[bool, Optional[str]]:
    course_code = item.course_code.strip().upper()
    session = item.session.strip()
    semester = item.semester.strip()
    matric_number = item.matric_number.strip()

    # 1. Lookup student UUID
    profile_q = supabase.table("profiles").select("id").eq("matric_number", matric_number).execute()
    if not profile_q.data:
        return False, f"Student '{matric_number}' not found."
    student_id = profile_q.data[0]["id"]

    # 2. Lookup course ID
    course_q = supabase.table("courses").select("id").eq("course_code", course_code).execute()
    if not course_q.data:
        return False, f"Course '{course_code}' not found."
    course_id = course_q.data[0]["id"]

    # 3. Lookup or create student registration
    reg_q = (
        supabase.table("student_registrations")
        .select("id")
        .eq("student_id", student_id)
        .eq("course_id", course_id)
        .eq("session", session)
        .eq("semester", semester)
        .execute()
    )

    if reg_q.data:
        registration_id = reg_q.data[0]["id"]
    else:
        try:
            reg_insert = supabase.table("student_registrations").insert({
                "student_id": student_id,
                "course_id": course_id,
                "session": session,
                "semester": semester
            }).execute()
            registration_id = reg_insert.data[0]["id"]
        except Exception as err:
            return False, f"Registration failed for {matric_number}: {str(err)}"

    # 4. Upsert result record
    try:
        supabase.table("results").upsert({
            "registration_id": registration_id,
            "ca_score": item.ca_score,
            "exam_score": item.exam_score,
            "status": "draft"
        }, on_conflict="registration_id").execute()
        return True, None
    except Exception as err:
        return False, f"Database error for {matric_number}: {str(err)}"


@router.post("/upload-json", response_model=UploadResponse)
def upload_results_json(payload: List[SingleResultUpload]):
    success_count = 0
    errors = []
    for item in payload:
        ok, err = process_single_grade(item)
        if ok:
            success_count += 1
        else:
            errors.append(err)
    return UploadResponse(success_count=success_count, failed_count=len(errors), errors=errors)


@router.post("/upload-csv", response_model=UploadResponse)
async def upload_results_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV.")

    contents = await file.read()
    buffer = io.StringIO(contents.decode('utf-8'))
    reader = csv.DictReader(buffer)

    success_count = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            item = SingleResultUpload(
                course_code=row.get("course_code", ""),
                session=row.get("session", ""),
                semester=row.get("semester", ""),
                matric_number=row.get("matric_number", ""),
                ca_score=float(row.get("ca_score", 0)),
                exam_score=float(row.get("exam_score", 0))
            )
            ok, err = process_single_grade(item)
            if ok:
                success_count += 1
            else:
                errors.append(f"Row {row_num}: {err}")
        except Exception as e:
            errors.append(f"Row {row_num}: Validation Error - {str(e)}")

    return UploadResponse(success_count=success_count, failed_count=len(errors), errors=errors)
