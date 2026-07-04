"""
Character-level CNN branch ("URLNet-lite").

Operates directly on the raw URL string with no manual feature engineering, using
a learned character embedding + multi-kernel 1D convolutions. This lets the model
pick up on sub-word obfuscation patterns (character substitution, unusual token
structure, novel typosquat patterns) that a hand-crafted feature list can miss,
complementing the lexical-feature branch rather than duplicating it.
"""
import numpy as np
import torch
import torch.nn as nn

MAX_LEN = 200
VOCAB = " abcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=%"
CHAR_TO_IDX = {c: i + 1 for i, c in enumerate(VOCAB)}  # 0 = padding/unknown
VOCAB_SIZE = len(VOCAB) + 1


def encode_url(url: str, max_len: int = MAX_LEN) -> np.ndarray:
    url = url.lower()[:max_len]
    ids = [CHAR_TO_IDX.get(c, 0) for c in url]
    ids = ids + [0] * (max_len - len(ids))
    return np.array(ids, dtype=np.int64)


def encode_batch(urls, max_len: int = MAX_LEN) -> torch.Tensor:
    return torch.tensor(np.stack([encode_url(u, max_len) for u in urls]))


class CharCNN(nn.Module):
    def __init__(self, vocab_size=VOCAB_SIZE, embed_dim=32, num_filters=64):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.convs = nn.ModuleList([
            nn.Conv1d(embed_dim, num_filters, kernel_size=k, padding=k // 2)
            for k in (3, 5, 7)
        ])
        self.dropout = nn.Dropout(0.3)
        self.fc1 = nn.Linear(num_filters * len(self.convs), 64)
        self.fc2 = nn.Linear(64, 1)

    def forward(self, x):
        emb = self.embedding(x).transpose(1, 2)  # (batch, embed_dim, seq_len)
        pooled = [torch.amax(torch.relu(conv(emb)), dim=2) for conv in self.convs]
        h = torch.cat(pooled, dim=1)
        h = self.dropout(torch.relu(self.fc1(h)))
        return self.fc2(h).squeeze(-1)  # logits
