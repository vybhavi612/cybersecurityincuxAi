import json
from flask import Flask, render_template, request
from joblib import load
from feature import FeatureExtraction

app = Flask(__name__)

model = load('phishing_model.joblib')

with open('feature_importance.json') as f:
    FEATURE_IMPORTANCE = {row['feature']: row['importance'] for row in json.load(f)}

with open('model_info.json') as f:
    MODEL_INFO = json.load(f)

FRIENDLY_NAMES = {
    'UsingIP': 'URL uses a raw IP address',
    'LongURL': 'Unusually long URL',
    'ShortURL': 'Uses a URL shortener',
    'Symbol@': "Contains '@' symbol",
    'Redirecting//': 'Suspicious "//" redirection',
    'PrefixSuffix-': "Domain contains a '-'",
    'SubDomains': 'Excessive subdomains',
    'HTTPS': 'Missing/suspicious HTTPS',
    'DomainRegLen': 'Short domain registration length',
    'Favicon': 'Favicon loaded from another domain',
    'NonStdPort': 'Non-standard port in use',
    'HTTPSDomainURL': "'https' fake-embedded in domain text",
    'RequestURL': 'Page resources loaded from external domains',
    'AnchorURL': 'Links/anchors point to external domains',
    'LinksInScriptTags': 'Scripts/links loaded from external domains',
    'ServerFormHandler': 'Form submits to a suspicious/external handler',
    'InfoEmail': 'Page contains email-harvesting markers',
    'AbnormalURL': 'URL behaves abnormally vs WHOIS record',
    'WebsiteForwarding': 'Excessive redirects',
    'StatusBarCust': 'Status bar manipulation script detected',
    'DisableRightClick': 'Right-click disabled',
    'UsingPopupWindow': 'Uses popup/alert windows',
    'IframeRedirection': 'Hidden iframe detected',
    'AgeofDomain': 'Very new domain',
    'DNSRecording': 'No/short DNS record history',
    'WebsiteTraffic': 'Low or unknown website traffic rank',
    'PageRank': 'Low page rank',
    'GoogleIndex': 'Not indexed by Google',
    'LinksPointingToPage': 'Few links point to this page',
    'StatsReport': 'Matches known phishing host/IP patterns',
}


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
                feature_extractor = FeatureExtraction(url_to_check)
                features_list = feature_extractor.getFeaturesList()

                prediction = model.predict([features_list])
                probability_phishing = model.predict_proba([features_list])[:, 1][0]

                is_phishing = bool(prediction[0] == 1)
                safe_pct = round((1 - probability_phishing) * 100, 2)
                phishing_pct = round(probability_phishing * 100, 2)

                risk_factors = []
                for name, value in zip(MODEL_INFO['feature_names'], features_list):
                    if value == -1:
                        risk_factors.append({
                            'name': FRIENDLY_NAMES.get(name, name),
                            'importance': FEATURE_IMPORTANCE.get(name, 0)
                        })
                risk_factors.sort(key=lambda r: -r['importance'])

                result = {
                    'url': url_to_check,
                    'prediction': 'Phishing' if is_phishing else 'Not Phishing',
                    'is_phishing': is_phishing,
                    'safe_pct': safe_pct,
                    'phishing_pct': phishing_pct,
                    'risk_factors': risk_factors[:6],
                    'model_name': MODEL_INFO['model_name'],
                }

                with open('response.txt', 'a') as f:
                    f.write(f"\nURL: {url_to_check}\nStatus: {result['prediction']}\n"
                            f"Safe %: {safe_pct}\n")
            except Exception as e:
                error = f"Could not analyze this URL: {e}"

    return render_template('index.html', result=result, error=error, model_info=MODEL_INFO)


if __name__ == '__main__':
    app.run(debug=True, port=5050)
