import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
import joblib

# Load Dataset
df = pd.read_csv("datasets/network/network.csv")

print("Dataset Loaded Successfully!")

# Remove missing values
df = df.dropna()

# Target Column
target_column = "Attack Type"

# Encode Target Labels
encoder = LabelEncoder()
df[target_column] = encoder.fit_transform(df[target_column])

# Features and Target
X = df.drop(target_column, axis=1)
y = df[target_column]

# Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

print("Training Network Intrusion Detection Model...")

# Random Forest Model
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# Predictions
y_pred = model.predict(X_test)

# Accuracy
accuracy = accuracy_score(y_test, y_pred)

print(f"\nAccuracy: {accuracy * 100:.2f}%")

# Save Model
joblib.dump(model, "models/network_model.pkl")
joblib.dump(encoder, "models/network_encoder.pkl")

print("\nNetwork Model Saved Successfully!")