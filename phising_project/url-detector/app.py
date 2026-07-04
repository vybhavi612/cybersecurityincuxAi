from flask import Flask, render_template, request

from pipeline.predict import get_predictor

app = Flask(__name__)
predictor = get_predictor()
MODEL_INFO = predictor.model_info


@app.route('/', methods=['GET', 'POST'])
def index1():
    result = None
    error = None

    if request.method == 'POST':
        url_to_check = request.form['url'].strip()

        if not url_to_check:
            error = "Please enter a URL."
        else:
            if not url_to_check.startswith(('http://', 'https://')):
                url_to_check = 'http://' + url_to_check

            try:
                result = predictor.predict(url_to_check)
                result['model_name'] = 'Hybrid (XGBoost + CharCNN)'

                with open('response.txt', 'a') as f:
                    f.write(f"\nURL: {url_to_check}\nStatus: {result['prediction']}\n"
                            f"Safe %: {result['safe_pct']}\n")
            except Exception as e:
                error = f"Could not analyze this URL: {e}"

    ensemble_metrics = MODEL_INFO['metrics']['hybrid_ensemble']
    template_model_info = {**MODEL_INFO, 'accuracy': ensemble_metrics['accuracy']}

    return render_template('index.html', result=result, error=error, model_info=template_model_info)


if __name__ == '__main__':
    app.run(debug=True, port=5050)
