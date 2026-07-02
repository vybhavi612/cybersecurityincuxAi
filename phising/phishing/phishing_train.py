import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib

# ==========================
# LOAD DATASET
# ==========================
df = pd.read_csv("datasets/phishing/phishing.csv")

print("Dataset Loaded Successfully!")
print("Dataset Shape:", df.shape)

# ==========================
# FEATURES AND TARGET
# ==========================
X = df.drop("target", axis=1)
y = df["target"]

# ==========================
# TRAIN TEST SPLIT
# ==========================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

print("Training Records:", len(X_train))
print("Testing Records:", len(X_test))

# ==========================
# MODEL TRAINING
# ==========================
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

print("\nTraining Model...")

model.fit(X_train, y_train)

# ==========================
# PREDICTION
# ==========================
y_pred = model.predict(X_test)

# ==========================
# EVALUATION
# ==========================
accuracy = accuracy_score(y_test, y_pred)

print(f"\nAccuracy: {accuracy * 100:.2f}%")

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# ==========================
# SAVE MODEL
# ==========================
joblib.dump(
    model,
    "models/phishing_model.pkl"
)

print("\nModel Saved Successfully!")
print("Location: models/phishing_model.pkl")