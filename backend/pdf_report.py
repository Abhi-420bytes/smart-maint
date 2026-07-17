"""
Feature: PDF Report Generation
Generates a professional downloadable PDF report from analysis results.
"""

import io
import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# ── Colour palette ────────────────────────────────────────────────────────────
INDIGO   = colors.HexColor('#6366f1')
RED      = colors.HexColor('#f87171')
AMBER    = colors.HexColor('#fbbf24')
GREEN    = colors.HexColor('#34d399')
DARK_BG  = colors.HexColor('#1e293b')
SLATE    = colors.HexColor('#64748b')
WHITE    = colors.white
LIGHT_BG = colors.HexColor('#f1f5f9')


def _risk_color(score: float):
    if score > 70:
        return RED
    if score > 40:
        return AMBER
    return GREEN


def _risk_label(score: float) -> str:
    if score > 70:
        return "HIGH RISK"
    if score > 40:
        return "MEDIUM"
    return "STABLE"


def generate_pdf_report(analysis_data: dict, project_name: str = "Project") -> bytes:
    """
    Generates a PDF report from analysis data.
    Returns the PDF as bytes (for streaming response).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"SMART-MAINT Report — {project_name}",
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Custom styles ─────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        'Title', parent=styles['Title'],
        fontSize=24, textColor=INDIGO, spaceAfter=4,
        alignment=TA_CENTER, fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'Subtitle', parent=styles['Normal'],
        fontSize=11, textColor=SLATE, spaceAfter=2,
        alignment=TA_CENTER
    )
    section_style = ParagraphStyle(
        'Section', parent=styles['Heading2'],
        fontSize=14, textColor=INDIGO, spaceBefore=16, spaceAfter=8,
        fontName='Helvetica-Bold', borderPad=4
    )
    body_style = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#334155'), spaceAfter=4
    )
    small_style = ParagraphStyle(
        'Small', parent=styles['Normal'],
        fontSize=8, textColor=SLATE
    )

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("SMART-MAINT", title_style))
    story.append(Paragraph("Software Maintenance Effort &amp; Capacity Estimation Report", subtitle_style))
    story.append(Paragraph(
        f"Project: <b>{project_name}</b> &nbsp;|&nbsp; "
        f"Generated: {datetime.datetime.now().strftime('%B %d, %Y at %H:%M')}",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=INDIGO, spaceAfter=16))

    # ── Executive Summary ─────────────────────────────────────────────────────
    summary = analysis_data.get("summary", {})
    story.append(Paragraph("Executive Summary", section_style))

    summary_data = [
        ["Metric", "Value", "Status"],
        ["Total Files Analyzed", str(summary.get("total_files", 0)), "—"],
        ["Total Lines of Code", f"{summary.get('total_loc', 0):,}", "—"],
        ["Average Complexity", str(summary.get("average_complexity", 0)),
         "⚠ High" if summary.get("average_complexity", 0) > 15 else "✓ Normal"],
        ["Average Maintenance Score", f"{summary.get('average_maintenance_score', 0)}/100",
         "🔴 High" if summary.get("average_maintenance_score", 0) > 70
         else "⚠ Medium" if summary.get("average_maintenance_score", 0) > 40
         else "✓ Low"],
        ["High Risk Files", str(summary.get("high_risk_count", 0)),
         "🔴 Action Required" if summary.get("high_risk_count", 0) > 0 else "✓ None"],
        ["Medium Risk Files", str(summary.get("medium_risk_count", 0)), "—"],
        ["Low Risk Files", str(summary.get("low_risk_count", 0)), "—"],
    ]

    summary_table = Table(summary_data, colWidths=[7 * cm, 4 * cm, 6 * cm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), INDIGO),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [LIGHT_BG, WHITE]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 12))

    # ── Risk Distribution ─────────────────────────────────────────────────────
    story.append(Paragraph("Risk Distribution", section_style))
    total = summary.get("total_files", 1) or 1
    high_pct = round(summary.get("high_risk_count", 0) / total * 100, 1)
    med_pct  = round(summary.get("medium_risk_count", 0) / total * 100, 1)
    low_pct  = round(summary.get("low_risk_count", 0) / total * 100, 1)

    risk_data = [
        ["Risk Level", "File Count", "Percentage", "Action"],
        ["🔴 High Risk",   str(summary.get("high_risk_count", 0)),   f"{high_pct}%", "Immediate refactoring required"],
        ["⚠ Medium Risk", str(summary.get("medium_risk_count", 0)), f"{med_pct}%",  "Monitor and plan improvements"],
        ["✓ Low Risk",    str(summary.get("low_risk_count", 0)),    f"{low_pct}%",  "Maintain current quality"],
    ]
    risk_table = Table(risk_data, colWidths=[4 * cm, 3 * cm, 3 * cm, 7 * cm])
    risk_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#fff1f2'), WHITE, colors.HexColor('#f0fdf4')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(risk_table)
    story.append(Spacer(1, 12))

    # ── AI Recommendations ────────────────────────────────────────────────────
    recommendations = analysis_data.get("recommendations", [])
    if recommendations:
        story.append(Paragraph("AI-Generated Recommendations", section_style))
        for i, rec in enumerate(recommendations[:8], 1):
            priority = rec.get("priority", "medium").upper()
            # Use plain hex strings — ReportLab hexval() adds 'x' prefix
            if priority == "CRITICAL":
                p_hex = "f87171"
            elif priority == "HIGH":
                p_hex = "fbbf24"
            else:
                p_hex = "64748b"
            story.append(KeepTogether([
                Paragraph(
                    f'<font color="#{p_hex}"><b>[{priority}]</b></font> '
                    f'<b>{rec["file"]}</b> — Score: {rec["score"]}/100',
                    body_style
                ),
                *[Paragraph(f"  • {action}", small_style) for action in rec.get("actions", [])],
                Spacer(1, 4),
            ]))

    # ── Detailed File Analysis ────────────────────────────────────────────────
    details = analysis_data.get("details", [])
    if details:
        story.append(Paragraph("Detailed File Analysis", section_style))
        story.append(Paragraph(
            "Files sorted by Maintenance Effort Score (highest risk first).",
            small_style
        ))
        story.append(Spacer(1, 6))

        table_data = [["File", "LOC", "Complexity", "Coupling", "Commits", "Score", "Risk"]]
        for file in details[:30]:  # Max 30 files to keep PDF manageable
            risk_label = _risk_label(file["score"])
            table_data.append([
                Paragraph(file["file"][-45:] if len(file["file"]) > 45 else file["file"], small_style),
                str(file["loc"]),
                str(file["complexity"]),
                str(file["coupling"]),
                str(file.get("change_frequency", 0)),
                str(file["score"]),
                risk_label,
            ])

        col_widths = [6.5 * cm, 1.5 * cm, 2 * cm, 2 * cm, 1.8 * cm, 1.5 * cm, 2 * cm]
        detail_table = Table(table_data, colWidths=col_widths, repeatRows=1)

        row_styles = [
            ('BACKGROUND', (0, 0), (-1, 0), DARK_BG),
            ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ]

        # Colour-code risk column and high-risk rows
        for row_idx, file in enumerate(details[:30], 1):
            if file["score"] > 70:
                row_styles.append(('BACKGROUND', (0, row_idx), (-1, row_idx), colors.HexColor('#fff1f2')))
                row_styles.append(('TEXTCOLOR', (6, row_idx), (6, row_idx), RED))
                row_styles.append(('FONTNAME', (6, row_idx), (6, row_idx), 'Helvetica-Bold'))
            elif file["score"] > 40:
                row_styles.append(('TEXTCOLOR', (6, row_idx), (6, row_idx), AMBER))
            else:
                row_styles.append(('TEXTCOLOR', (6, row_idx), (6, row_idx), GREEN))

        detail_table.setStyle(TableStyle(row_styles))
        story.append(detail_table)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=SLATE))
    story.append(Paragraph(
        "Generated by SMART-MAINT v2.0 | Software Maintenance Effort &amp; Capacity Estimation Tool",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7, textColor=SLATE, alignment=TA_CENTER)
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
