from fastapi import APIRouter, HTTPException
from app.database import supabase

router = APIRouter(prefix="/api/v1/students", tags=["Students & Gradebook"])

@router.get("/{matric_number:path}/results")
def get_student_gradebook(matric_number: str):
    profile_res = (
        supabase.table("profiles")
        .select("id, full_name, matric_number")
        .eq("matric_number", matric_number.strip())
        .execute()
    )

    if not profile_res.data:
        raise HTTPException(status_code=404, detail=f"Student with matric number '{matric_number}' not found.")

    student = profile_res.data[0]
    student_id = student["id"]

    results_res = (
        supabase.table("student_registrations")
        .select("session, semester, courses(course_code, course_title, credit_units), results(ca_score, exam_score, total_score, grade, status)")
        .eq("student_id", student_id)
        .execute()
    )

    courses_list = []
    total_units = 0
    weighted_points = 0
    grade_point_map = {'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0}

    for row in results_res.data:
        course = row.get("courses", {})
        res_data = row.get("results")
        res = res_data[0] if isinstance(res_data, list) and res_data else res_data

        if isinstance(res, dict) and res.get("status") == "approved":
            units = course.get("credit_units", 0)
            grade = res.get("grade")
            
            total_units += units
            weighted_points += grade_point_map.get(grade, 0) * units
            
            courses_list.append({
                "course_code": course.get("course_code"),
                "course_title": course.get("course_title"),
                "credit_units": units,
                "ca_score": res.get("ca_score"),
                "exam_score": res.get("exam_score"),
                "total_score": res.get("total_score"),
                "grade": grade,
                "session": row.get("session"),
                "semester": row.get("semester"),
                "status": res.get("status")
            })

    cgpa = round(weighted_points / total_units, 2) if total_units > 0 else 0.00

    return {
        "student_info": {
            "full_name": student["full_name"],
            "matric_number": student["matric_number"]
        },
        "courses": courses_list,
        "summary": {
            "completed_units": total_units,
            "cgpa": cgpa
        }
    }