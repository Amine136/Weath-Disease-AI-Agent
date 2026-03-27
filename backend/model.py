# ============================================================
# Wheat Disease Model — EfficientNet-B3 Inference
# Ported from notebook Supervisor_Agent(1).ipynb
# ============================================================
import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

# 14 wheat condition classes (must match training order)
CLASS_NAMES = [
    "Aphid", "Black Rust", "Blast", "Brown Rust", "Fusarium Head Blight",
    "Healthy Wheat", "Leaf Blight", "Mildew", "Mite", "Septoria",
    "Smut", "Stem fly", "Tan spot", "Yellow Rust",
]

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Image preprocessing — must match training normalization
PREPROCESS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.4616, 0.4831, 0.3297],
        std=[0.2015, 0.1954, 0.1890],
    ),
])

_model = None


def load_model(model_path: str):
    """Load the EfficientNet-B3 model with custom classifier head."""
    global _model
    if _model is not None:
        return _model

    print(f"[Model] Loading EfficientNet-B3 from {model_path} ...")
    model = models.efficientnet_b3(weights=None)
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, len(CLASS_NAMES))

    model.load_state_dict(torch.load(model_path, map_location=DEVICE))
    model = model.to(DEVICE)
    model.eval()

    _model = model
    print(f"[Model] Loaded successfully on {DEVICE}")
    return model


def predict_wheat_disease(image_path: str) -> tuple[str, float]:
    """
    Run inference on a wheat leaf image.
    Returns (predicted_class, confidence_percent).
    """
    if _model is None:
        raise RuntimeError("Model not loaded — call load_model() first")

    img = Image.open(image_path).convert("RGB")
    input_tensor = PREPROCESS(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        output = _model(input_tensor)

    probs = torch.nn.functional.softmax(output[0], dim=0)
    confidence, predicted_idx = torch.max(probs, 0)

    predicted_class = CLASS_NAMES[predicted_idx.item()]
    confidence_pct = confidence.item() * 100

    print(f"[Model] Prediction: {predicted_class} ({confidence_pct:.1f}%)")
    return predicted_class, confidence_pct
