from faster_whisper import WhisperModel
from transformers import pipeline

# Load AI Models globally so they aren't re-loaded for every video
# Using smaller models to ensure they run well on CPU without running out of memory

print("Loading Whisper model...")
whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")

print("Loading Summarization model...")
summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6", framework="pt")

def get_whisper_model():
    return whisper_model

def get_summarizer():
    return summarizer
