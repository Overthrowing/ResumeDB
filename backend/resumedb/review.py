import json
from .claude import run_oneshot

REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "readiness_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "summary": {"type": "string"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "severity": {"type": "string", "enum": ["critical", "medium", "low"]},
                    "category": {"type": "string", "enum": ["missing_field", "weak_content", "keyword_gap", "suggestion"]},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "action": {"type": "string"}
                },
                "required": ["severity", "category", "title", "description", "action"]
            }
        }
    },
    "required": ["readiness_score", "summary", "items"]
}

async def run_review(r, app_id: str) -> dict:
    app = r.get_application(app_id)
    files = app.get("files", {})
    
    items = []
    
    # 1. Deterministic Checks
    jd = files.get("jd.md", "").strip()
    if not jd:
        items.append({
            "severity": "critical",
            "category": "missing_field",
            "title": "Missing Job Description",
            "description": "No job description text has been pasted or scraped for this application.",
            "action": "Go to the Overview tab and paste the job description text."
        })
        
    resume_yaml = files.get("resume.yaml", "").strip()
    if not resume_yaml:
        items.append({
            "severity": "critical",
            "category": "missing_field",
            "title": "Missing Resume Content",
            "description": "No tailored resume YAML file exists for this application.",
            "action": "Ensure a baseline resume template is set up."
        })

    # Perform LLM check if we have both resume and JD
    if jd and resume_yaml:
        prompt = f"""
        You are an expert technical recruiter and resume reviewer.
        Analyze the following candidate resume YAML and the job description (JD) for the role.
        Identify any keyword gaps, weak experience descriptions (lack of metrics, vague text), or areas of improvement.
        
        Job Description:
        {jd}
        
        Resume YAML:
        {resume_yaml}
        
        Provide your assessment structured EXACTLY to the requested JSON schema.
        """
        
        try:
            res_str = await run_oneshot(prompt, json_schema=REVIEW_SCHEMA)
            llm_report = json.loads(res_str)
            
            # Merge items
            llm_items = llm_report.get("items", [])
            items.extend(llm_items)
            
            # Calculate final readiness score
            readiness_score = llm_report.get("readiness_score", 100)
            if any(it["severity"] == "critical" for it in items):
                readiness_score = min(readiness_score, 50)
                
            return {
                "readiness_score": readiness_score,
                "summary": llm_report.get("summary", ""),
                "items": items
            }
        except Exception as e:
            return {
                "readiness_score": 0,
                "summary": f"Could not complete AI review: {str(e)}",
                "items": items + [{
                    "severity": "medium",
                    "category": "suggestion",
                    "title": "AI Review Failed",
                    "description": f"The LLM failed to analyze the resume: {str(e)}",
                    "action": "Try running the review again."
                }]
            }
            
    # Default fallbacks if missing crucial files
    return {
        "readiness_score": 10,
        "summary": "Crucial details are missing. Please add a job description and baseline resume before running the review.",
        "items": items
    }
