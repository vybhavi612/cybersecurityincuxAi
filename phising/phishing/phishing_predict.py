import pandas as pd
import joblib

# Load model
model = joblib.load("models/phishing_model.pkl")

# Sample URL features
sample = pd.DataFrame([{
    "url_length": 73,
    "valid_url": 0,
    "at_symbol": 0,
    "sensitive_words_count": 0,
    "path_length": 52,
    "isHttps": 0,
    "nb_dots": 5,
    "nb_hyphens": 0,
    "nb_and": 0,
    "nb_or": 0,
    "nb_www": 1,
    "nb_com": 0,
    "nb_underscore": 0
}])

prediction = model.predict(sample)

if prediction[0] == 1:
    print("⚠️ Phishing Website Detected")
else:
    print("✅ Safe Website")