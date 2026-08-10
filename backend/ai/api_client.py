import os
import groq
from dotenv import load_dotenv

load_dotenv()

# Load keys
keys_str = os.getenv("GROQ_API_KEYS", "")
GROQ_KEYS = [k.strip() for k in keys_str.split(",") if k.strip()]

if not GROQ_KEYS:
    raise ValueError("No GROQ_API_KEYS found in .env file.")

current_key_index = 0

def get_groq_client():
    global current_key_index
    return groq.Groq(api_key=GROQ_KEYS[current_key_index])

def rotate_key():
    global current_key_index
    current_key_index = (current_key_index + 1) % len(GROQ_KEYS)
    print(f"[API Key Rotator] Switched to Key #{current_key_index + 1}")

def execute_with_retry(func, *args, **kwargs):
    """
    Executes a function and rotates the API key if a rate limit or auth error occurs.
    Will retry up to the number of keys available.
    """
    max_retries = len(GROQ_KEYS)
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except groq.RateLimitError as e:
            print(f"[API Error] Rate limit hit: {e}")
            rotate_key()
        except groq.AuthenticationError as e:
            print(f"[API Error] Authentication failed: {e}")
            rotate_key()
        except Exception as e:
            # For other errors, don't retry, just raise
            raise e
    
    raise Exception("All Groq API keys have been exhausted or rate limited.")


def _groq_transcribe(audio_path: str):
    client = get_groq_client()
    with open(audio_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(audio_path, file.read()),
            model="whisper-large-v3",
            response_format="verbose_json",
        )
    return transcription

def groq_transcribe(audio_path: str):
    return execute_with_retry(_groq_transcribe, audio_path)


def _groq_summarize(text: str):
    client = get_groq_client()
    # Limit text slightly to ensure we don't blow past LLaMA's 128k token context window
    max_chars = 250000 
    truncated_text = text[:max_chars] if len(text) > max_chars else text
    
    prompt = f"""
    Please provide a highly detailed, comprehensive, and multi-paragraph summary of the following video transcript. 
    The transcript includes timestamps in [MM:SS] format before each spoken segment.
    Do NOT restrict the length. Provide a deep analysis of the main themes, important details, and the overall narrative.
    After the summary, extract 3-5 key moments or topics discussed.
    CRITICAL: For each key moment, extract the EXACT timestamp (in MM:SS format) from the transcript where that topic actually begins! Do NOT invent or make up timestamps.
    Finally, extract 5-10 highly relevant single-word or short-phrase keywords that represent the core topics.
    Format your response in JSON matching this exact structure, do not include any other text:
    {{
        "summary": "Your detailed multi-paragraph summary here...",
        "key_moments": [
            {{"time": "00:00", "title": "Topic 1", "description": "Brief description..."}}
        ],
        "keywords": ["Keyword1", "Keyword2", "Keyword3"]
    }}
    
    Transcript with Timestamps:
    {truncated_text}
    """
    
    completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are a professional AI summarization engine. You only output raw, valid JSON."},
            {"role": "user", "content": prompt}
        ],
        model="llama-3.1-8b-instant",
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    
    import json
    return json.loads(completion.choices[0].message.content)

def groq_summarize(text: str):
    return execute_with_retry(_groq_summarize, text)
