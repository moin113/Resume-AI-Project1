from backend.services.enhanced_matching_service import RealTimeLLMService
import json

service = RealTimeLLMService()
res = "Skills: Python, Flask, AWS. Experience: 5 years."
jd = "We need a Python developer with Flask and AWS."

try:
    result = service.analyze_resume_realtime(res, jd)
    print(json.dumps(result, indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
