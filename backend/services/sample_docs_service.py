from typing import List, Dict, Any
from backend.models.store import DBStore
from backend.rag.embedding import EmbeddingService

class SampleDocsService:
    @staticmethod
    def seed_sample_documents_for_student(student_id: str) -> List[Dict[str, Any]]:
        existing = DBStore.find_documents_by_student(student_id)
        if len(existing) > 0:
            return existing

        # Sample Doc 1: ML & NLP
        doc1_text = """Unit 1: Machine Learning Fundamentals & Supervised Learning
Chapter 1: Classification Metrics & Evaluation
In binary and multiclass classification, accuracy can be misleading when classes are imbalanced.
The core evaluation metrics are Precision, Recall, and F1-Score:
Precision = TP / (TP + FP)
Recall = TP / (TP + FN)
F1-Score = 2 * (Precision * Recall) / (Precision + Recall)

Where TP = True Positives, FP = False Positives, FN = False Negatives.
F1-score represents the harmonic mean of precision and recall.

Chapter 2: Gradient Descent Optimization
Optimization aims to minimize the loss function J(theta).
Gradient Descent update rule:
theta = theta - alpha * grad(J(theta))
Where alpha is the learning rate and grad(J(theta)) is the gradient vector.

Unit 2: Natural Language Processing
Chapter 3: TF-IDF and Word Representations
Term Frequency - Inverse Document Frequency evaluates word importance:
TF(t, d) = count(t in d) / total_words(d)
IDF(t, D) = log(total_documents / (1 + doc_count(t)))
TF-IDF(t, d, D) = TF(t, d) * IDF(t, D)"""

        doc1 = DBStore.create_document({
            "studentId": student_id,
            "originalName": "Machine_Learning_and_NLP_Unit_1_2.pdf",
            "fileType": "PDF",
            "fileSize": 145000,
            "totalChunks": 2,
            "status": "ready",
            "pageCount": 4,
            "courseSubject": "Machine Learning & NLP",
        })

        chunk1_text = doc1_text[:len(doc1_text)//2]
        chunk2_text = doc1_text[len(doc1_text)//2:]

        DBStore.create_chunks([
            {
                "documentId": str(doc1["_id"]),
                "studentId": student_id,
                "filename": doc1["originalName"],
                "pageNumber": 1,
                "chunkIndex": 0,
                "unit": "Unit 1: Machine Learning",
                "chapter": "Chapter 1: Evaluation Metrics",
                "text": chunk1_text,
                "embedding": EmbeddingService.generate_embedding(chunk1_text),
            },
            {
                "documentId": str(doc1["_id"]),
                "studentId": student_id,
                "filename": doc1["originalName"],
                "pageNumber": 2,
                "chunkIndex": 1,
                "unit": "Unit 2: NLP",
                "chapter": "Chapter 3: TF-IDF",
                "text": chunk2_text,
                "embedding": EmbeddingService.generate_embedding(chunk2_text),
            }
        ])

        # Sample Doc 2: Cryptography
        doc2_text = """Unit 3: Public Key Cryptography & Modern Security
Chapter 4: The RSA Cryptosystem
RSA is an asymmetric public-key cryptosystem based on the integer factorization problem.
Key Generation Algorithm:
1. Select two distinct large prime numbers p and q.
2. Compute modulus n = p * q.
3. Compute Euler totient function phi(n) = (p - 1) * (q - 1).
4. Choose integer e such that 1 < e < phi(n) and gcd(e, phi(n)) = 1.
5. Compute private exponent d such that d * e = 1 (mod phi(n)).

Encryption:
Ciphertext C = M^e (mod n)
Decryption:
Plaintext M = C^d (mod n)

Where (e, n) is the public encryption key, and (d, n) is the private decryption key."""

        doc2 = DBStore.create_document({
            "studentId": student_id,
            "originalName": "Cryptography_and_Network_Security_RSA.pdf",
            "fileType": "PDF",
            "fileSize": 112000,
            "totalChunks": 1,
            "status": "ready",
            "pageCount": 3,
            "courseSubject": "Cryptography & Network Security",
        })

        DBStore.create_chunks([
            {
                "documentId": str(doc2["_id"]),
                "studentId": student_id,
                "filename": doc2["originalName"],
                "pageNumber": 1,
                "chunkIndex": 0,
                "unit": "Unit 3: Cryptography",
                "chapter": "Chapter 4: RSA Algorithm",
                "text": doc2_text,
                "embedding": EmbeddingService.generate_embedding(doc2_text),
            }
        ])

        return DBStore.find_documents_by_student(student_id)
