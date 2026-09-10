import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_student_transcript_pdf(student_data: dict, results: list[dict]) -> io.BytesIO:
    """
    Generates an in-memory PDF transcript for a given student and their course results.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18, leading=22, alignment=1, textColor=colors.HexColor('#1E293B'))
    subtitle_style = ParagraphStyle('SubTitleStyle', parent=styles['Normal'], fontSize=10, leading=14, alignment=1, textColor=colors.HexColor('#64748B'))
    normal_bold = ParagraphStyle('BoldStyle', parent=styles['Normal'], fontSize=10, leading=14, fontName='Helvetica-Bold')

    # Header Section
    story.append(Paragraph("ACADEX UNIVERSITY SYSTEM", title_style))
    story.append(Paragraph("OFFICIAL STUDENT SEMESTER STATEMENT", subtitle_style))
    story.append(Spacer(1, 15))

    # Student Details Grid
    details_data = [
        [Paragraph(f"<b>Name:</b> {student_data.get('full_name', 'N/A')}", styles['Normal']), Paragraph(f"<b>Matric No:</b> {student_data.get('matric_number', 'N/A')}", styles['Normal'])],
        [Paragraph(f"<b>Department:</b> {student_data.get('department', 'N/A')}", styles['Normal']), Paragraph(f"<b>CGPA:</b> {student_data.get('cgpa', '0.00')}", normal_bold)]
    ]
    details_table = Table(details_data, colWidths=[270, 270])
    details_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    story.append(details_table)
    story.append(Spacer(1, 15))

    # Results Table Headers & Content
    table_data = [["Course Code", "Course Title", "Units", "Score", "Grade"]]
    
    for row in results:
        table_data.append([
            str(row.get('course_code', '')),
            str(row.get('title', 'N/A')),
            str(row.get('units', 0)),
            str(row.get('score', 0)),
            str(row.get('grade', 'F'))
        ])

    results_table = Table(table_data, colWidths=[90, 250, 60, 70, 70])
    results_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F1F5F9')]),
    ]))
    
    story.append(results_table)
    doc.build(story)
    
    buffer.seek(0)
    return buffer