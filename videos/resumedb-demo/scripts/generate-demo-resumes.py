#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pdfplumber
from pypdf import PdfReader
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas


PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT / "output" / "pdf"
SYSTEM_FONTS = Path("/System/Library/Fonts/Supplemental")

INK = HexColor("#201F1D")
MUTED = HexColor("#6C6861")
CREAM = HexColor("#FAF7F1")
VIOLET = HexColor("#6D28D9")
VIOLET_SOFT = HexColor("#F0E9FF")
OCHRE = HexColor("#B8822A")
RULE = HexColor("#D8D0C5")


@dataclass(frozen=True)
class Entry:
    title: str
    meta: str
    bullets: tuple[str, ...]


@dataclass(frozen=True)
class Resume:
    filename: str
    role: str
    summary: str
    skills: str
    metrics: tuple[tuple[str, str], ...]
    experience: tuple[Entry, ...]
    projects: tuple[Entry, ...]
    publications: tuple[str, ...] = ()


ROBOTICS = Resume(
    filename="sam-rivera-robotics-resume.pdf",
    role="AUTONOMY + ROBOTICS SOFTWARE",
    summary=(
        "Software engineer building real-time autonomy, reliable robot infrastructure, "
        "and distributed systems. Turns field failures into measurable, reproducible fixes."
    ),
    skills="C++17  /  ROS 2  /  SLAM  /  motion planning  /  sensor fusion  /  Python  /  distributed systems",
    metrics=(("75%", "replan latency reduction"), ("45 ms", "current path replan"), ("1 merged", "upstream nav2 fix")),
    experience=(
        Entry(
            "Robotics Software Engineer | Waypoint Robotics",
            "2023-present  |  C++17, ROS 2, Python, Docker, Ceres, PCL",
            (
                "Reduced warehouse AMR path-replanning latency 75%, from 180 ms to 45 ms, by moving costmap updates outside the main control loop.",
                "Built deterministic sensor replay that turns intermittent field failures into reproducible test cases.",
                "Shipped fleet-wide OTA updates with staged rollout and automatic rollback on health-check regression.",
            ),
        ),
    ),
    projects=(
        Entry(
            "Autonomous Rover with Visual SLAM",
            "C++, ROS 2, ORB-SLAM3, Raspberry Pi, RPLIDAR",
            (
                "Built an indoor mapping and navigation rover from a single camera and 2D LiDAR.",
                "Developed EKF sensor fusion that maintained localization through visual dropout.",
            ),
        ),
        Entry(
            "Contributor | ROS 2 nav2",
            "Open source",
            (
                "Fixed a recovery-behavior deadlock, added regression coverage, and had the pull request merged upstream.",
            ),
        ),
        Entry(
            "Distributed Key-Value Store",
            "Go, gRPC, Raft",
            (
                "Implemented leader election, replication, snapshotting, and membership changes; passed linearizability checks under partitions and clock skew.",
            ),
        ),
    ),
)


BIOINFORMATICS = Resume(
    filename="sam-rivera-bioinformatics-resume.pdf",
    role="BIOINFORMATICS ENGINEERING",
    summary=(
        "Computational biology engineer shipping reproducible analysis pipelines, quality controls, "
        "and interactive scientific tools for cohort-scale genomics."
    ),
    skills="Python  /  Nextflow  /  AWS Batch  /  variant calling  /  NGS QC  /  scRNA-seq  /  FastAPI  /  WebGL",
    metrics=(("85%", "pipeline runtime reduction"), ("6 h", "full cohort run"), ("1.5k/mo", "PyPI downloads")),
    experience=(
        Entry(
            "Computational Biology Research Assistant | Genome Dynamics Lab",
            "2021-2023  |  Python, Nextflow, AWS Batch, samtools, bcftools, R",
            (
                "Rebuilt a cohort-scale variant-calling pipeline in Nextflow and AWS Batch, cutting runtime 85%, from about 40 hours to 6 hours.",
                "Built genotype-concordance QC that detects sample swaps before downstream analysis.",
                "Maintained the shared analysis environment for a nine-person lab and co-authored two publications.",
            ),
        ),
    ),
    projects=(
        Entry(
            "fastqc-lite | Published PyPI package",
            "Python, streaming bioinformatics",
            (
                "Built a constant-memory FASTQ quality tool for multi-gigabyte files; reached about 1,500 downloads per month.",
            ),
        ),
        Entry(
            "Protein Structure Viewer",
            "TypeScript, React, WebGL, FastAPI",
            (
                "Rendered more than 100,000 atoms interactively and kept first paint under one second for common proteins.",
            ),
        ),
        Entry(
            "Single-Cell RNA-seq Toolkit",
            "Python, Scanpy, UMAP, Leiden",
            (
                "Created a reproducible raw-counts-to-clusters pipeline with automated batch-effect diagnostics.",
            ),
        ),
    ),
    publications=(
        'Rivera, S. et al. "A portable Nextflow pipeline for cohort-scale variant calling." Journal of Demo Genomics, 2023.',
        'Rivera, S. et al. "Genotype-concordance QC catches sample swaps early." Demo Bioinformatics Conference, 2022.',
    ),
)


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Georgia", str(SYSTEM_FONTS / "Georgia.ttf")))
    pdfmetrics.registerFont(TTFont("Georgia-Bold", str(SYSTEM_FONTS / "Georgia Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Arial", str(SYSTEM_FONTS / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(SYSTEM_FONTS / "Arial Bold.ttf")))


def wrap(text: str, font: str, size: float, width: float) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    canvas: Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    font: str,
    size: float,
    color=INK,
    leading: float | None = None,
) -> float:
    line_height = leading or size * 1.28
    canvas.setFont(font, size)
    canvas.setFillColor(color)
    for line in wrap(text, font, size, width):
        canvas.drawString(x, y, line)
        y -= line_height
    return y


def section_heading(canvas: Canvas, title: str, y: float) -> float:
    canvas.setFillColor(VIOLET)
    canvas.setFont("Arial-Bold", 8.2)
    canvas.drawString(42, y, title.upper())
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.65)
    canvas.line(132, y + 2, 570, y + 2)
    return y - 16


def draw_entry(canvas: Canvas, entry: Entry, y: float) -> float:
    canvas.setFillColor(INK)
    canvas.setFont("Georgia-Bold", 10.1)
    canvas.drawString(42, y, entry.title)
    y -= 12
    y = draw_wrapped(canvas, entry.meta, 42, y, 528, "Arial", 7.9, MUTED, 9.8)
    y -= 3
    for bullet in entry.bullets:
        canvas.setFillColor(OCHRE)
        canvas.circle(47, y + 2.5, 1.45, fill=1, stroke=0)
        y = draw_wrapped(canvas, bullet, 55, y, 515, "Arial", 8.65, INK, 11.1)
        y -= 3
    return y - 4


def build_resume(resume: Resume) -> Path:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    output = OUTPUT / resume.filename
    canvas = Canvas(str(output), pagesize=letter, pageCompression=1)
    width, height = letter

    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)

    canvas.setFillColor(VIOLET_SOFT)
    canvas.roundRect(421, 744, 149, 22, 11, fill=1, stroke=0)
    canvas.setFillColor(VIOLET)
    canvas.setFont("Arial-Bold", 7.6)
    canvas.drawCentredString(495.5, 751.5, resume.role)

    canvas.setFillColor(INK)
    canvas.setFont("Georgia-Bold", 23)
    canvas.drawString(42, 748, "Sam Rivera")
    canvas.setFillColor(MUTED)
    canvas.setFont("Arial", 8.2)
    canvas.drawString(42, 731, "sam.rivera@example.com  |  github.com/samrivera-demo  |  Pittsburgh, PA")
    canvas.setStrokeColor(VIOLET)
    canvas.setLineWidth(2)
    canvas.line(42, 717, 570, 717)

    y = 697
    y = draw_wrapped(canvas, resume.summary, 42, y, 528, "Georgia", 10.5, INK, 13.5)
    y -= 7

    canvas.setFillColor(VIOLET_SOFT)
    canvas.roundRect(42, y - 22, 528, 27, 6, fill=1, stroke=0)
    canvas.setFillColor(VIOLET)
    canvas.setFont("Arial-Bold", 7.35)
    canvas.drawString(51, y - 12, resume.skills)
    y -= 37

    metric_width = 168
    for index, (value, label) in enumerate(resume.metrics):
        x = 42 + index * 180
        canvas.setFillColor(HexColor("#F3EEE5"))
        canvas.roundRect(x, y - 44, metric_width, 44, 6, fill=1, stroke=0)
        canvas.setFillColor(INK)
        canvas.setFont("Georgia-Bold", 15)
        canvas.drawString(x + 10, y - 18, value)
        canvas.setFillColor(MUTED)
        canvas.setFont("Arial", 6.8)
        canvas.drawString(x + 10, y - 33, label.upper())
    y -= 59

    y = section_heading(canvas, "Experience", y)
    for entry in resume.experience:
        y = draw_entry(canvas, entry, y)

    y = section_heading(canvas, "Selected work", y)
    for entry in resume.projects:
        y = draw_entry(canvas, entry, y)

    if resume.publications:
        y = section_heading(canvas, "Publications", y)
        for item in resume.publications:
            canvas.setFillColor(OCHRE)
            canvas.circle(47, y + 2.5, 1.45, fill=1, stroke=0)
            y = draw_wrapped(canvas, item, 55, y, 515, "Arial", 7.85, INK, 9.8)
            y -= 3

    if y < 43:
        raise RuntimeError(f"{resume.filename} overflowed the one-page safe area at y={y:.1f}")

    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.65)
    canvas.line(42, 31, 570, 31)
    canvas.setFillColor(MUTED)
    canvas.setFont("Arial", 6.8)
    canvas.drawString(42, 19, "Selected from Sam Rivera's verified ResumeDB experience bank")
    canvas.drawRightString(570, 19, "Tailored demo resume")
    canvas.showPage()
    canvas.save()
    return output


def verify(path: Path, required: tuple[str, ...]) -> None:
    reader = PdfReader(str(path))
    if len(reader.pages) != 1:
        raise RuntimeError(f"{path.name} should contain one page")
    with pdfplumber.open(path) as pdf:
        text = pdf.pages[0].extract_text() or ""
    missing = [term for term in required if term not in text]
    if missing:
        raise RuntimeError(f"{path.name} is missing expected text: {missing}")


def main() -> None:
    register_fonts()
    robotics = build_resume(ROBOTICS)
    bioinformatics = build_resume(BIOINFORMATICS)
    verify(robotics, ("Sam Rivera", "Waypoint Robotics", "75%", "ROS 2", "nav2"))
    verify(bioinformatics, ("Sam Rivera", "Genome Dynamics Lab", "85%", "Nextflow", "fastqc-lite"))
    print(robotics)
    print(bioinformatics)


if __name__ == "__main__":
    main()
