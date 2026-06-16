import google.generativeai as genai

genai.configure(api_key="YOUR_API_KEY")

try:
    models = genai.list_models()

    for model in models:
        print(model.name)

except Exception as e:
    print("ERROR:", e)