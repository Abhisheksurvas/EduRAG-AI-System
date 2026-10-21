import crypto from 'crypto';
import { DBStore } from '../models/store.js';
import { EmbeddingService } from '../rag/embedding.js';

export const SAMPLE_ML_NLP_DOCUMENT_NAME = 'CS802_Machine_Learning_and_Natural_Language_Processing_Notes.txt';

export const SAMPLE_ML_NLP_TEXT = `================================================================================
COLLEGE OF ENGINEERING & TECHNOLOGY
DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
COURSE CODE: CS802 | MACHINE LEARNING & NATURAL LANGUAGE PROCESSING
SEMESTER VIII - COURSE STUDY MATERIAL & LECTURE NOTES
================================================================================

[PAGE 1: UNIT 1 - MACHINE LEARNING (ML) CONCEPTS, TAXONOMY & EXAMPLES]

1. DEFINITION OF MACHINE LEARNING:
According to Arthur Samuel (1959), Machine Learning is the field of study that gives computers the ability to learn without being explicitly programmed.
According to Tom Mitchell (1997), "A computer program is said to learn from experience E with respect to some class of tasks T and performance measure P, if its performance at tasks in T, as measured by P, improves with experience E."

2. TAXONOMY OF MACHINE LEARNING WITH EXAMPLES:

A. SUPERVISED LEARNING:
The algorithm is trained on labeled input-output pairs (X, Y) where the correct target output is provided during training.
Concrete Real-World Examples:
1. Email Spam Detection: Classifying incoming emails into 'Spam' or 'Ham' (Not Spam) using features like subject line keywords, sender reputation, and frequency of promotional phrases.
2. Medical Diagnosis: Automated detection of diabetic retinopathy or pneumonia from patient chest X-ray images labeled by expert radiologists.
3. Real Estate House Price Prediction: Regression model predicting continuous home market values based on square footage, zip code, and number of bedrooms.

B. UNSUPERVISED LEARNING:
The algorithm learns patterns, hidden groupings, and intrinsic structures from unlabeled input data (X) without target output supervision.
Concrete Real-World Examples:
1. Customer Segmentation in E-Commerce: Grouping millions of shoppers into distinct behavioral personas (e.g., bargain hunters, high-end spenders) using K-Means clustering on purchase history.
2. Anomaly & Fraud Detection in Banking: Identifying rare anomalous transactions on credit cards that deviate substantially from normal customer expenditure patterns.
3. Market Basket Analysis: Discovering associated products frequently bought together (e.g., bread and butter) using the Apriori association rule algorithm.

C. REINFORCEMENT LEARNING:
An autonomous agent learns to achieve a goal in an interactive environment through sequential trial and error, receiving feedback as scalar rewards or penalties.
Concrete Real-World Examples:
1. Autonomous Self-Driving Vehicles: Training self-driving agents to keep lanes, brake appropriately, and navigate obstacles based on situational safety reward functions.
2. Game Playing AI: DeepMind's AlphaGo and chess-playing algorithms mastering grandmaster gameplay through self-play reinforcement learning.

--------------------------------------------------------------------------------

[PAGE 2: UNIT 2 - NATURAL LANGUAGE PROCESSING (NLP) & PRACTICAL EXAMPLES]

1. DEFINITION OF NATURAL LANGUAGE PROCESSING:
Natural Language Processing (NLP) is an interdisciplinary branch of Artificial Intelligence, Computer Science, and Computational Linguistics focused on enabling computers to read, decipher, understand, synthesize, and generate human language in a meaningful and valuable manner.

2. THE NLP PROCESSING PIPELINE:
The standard pipeline includes:
- Sentence Segmentation: Dividing a text corpus into individual sentences.
- Tokenization: Splitting sentences into discrete words or sub-word tokens.
- Stop-Word Removal: Filtering out high-frequency grammatical words (e.g., "is", "the", "and") that carry low semantic value.
- Stemming and Lemmatization: Reducing inflected word forms to their root lemma (e.g., "studying", "studied" -> "study").
- Part-of-Speech (POS) Tagging: Labeling each token as noun, verb, adjective, etc.
- Named Entity Recognition (NER): Extracting real-world entities such as persons, locations, organizations, and dates.

3. CONCRETE REAL-WORLD EXAMPLES OF NLP:
1. Sentiment Analysis on Product Reviews: E-commerce platforms (such as Amazon and Yelp) analyzing customer text reviews to classify sentiment as Positive, Neutral, or Negative to monitor customer satisfaction.
2. Conversational Virtual Assistants: Intelligent agents like Apple Siri, Amazon Alexa, and customer support chatbots that comprehend spoken/typed human queries, infer user intent, and generate contextual vocal responses.
3. Neural Machine Translation: Real-time multi-lingual translation systems like Google Translate converting documents seamlessly between languages (e.g., English to Spanish, German, or Hindi).
4. Information Extraction & Clinical NER: Extracting clinical entities (patient symptoms, diagnoses, drug names, and dosages) from electronic health records.
5. Email Smart Reply & Autocomplete: Predictive text generation in Gmail suggesting full sentences and auto-completions as the user types.

--------------------------------------------------------------------------------

[PAGE 3: UNIT 3 - SYNERGISTIC RELATIONSHIP: ML IN NLP & COMPARISON]

1. HOW MACHINE LEARNING POWERS NATURAL LANGUAGE PROCESSING:
NLP provides the linguistic domain modeling, feature extraction, and text representations, while Machine Learning algorithms provide the statistical reasoning, pattern detection, and generation capabilities:
- Traditional ML in NLP: Naive Bayes and Support Vector Machines (SVM) for spam detection and topic categorization using Bag-of-Words and TF-IDF representations.
- Deep Learning & Transformer Models: Recurrent Neural Networks (LSTM/GRU) and Transformer architectures (BERT, RoBERTa, T5, GPT) that capture bidirectional contextual relationships across words.

2. COMPARISON TABLE: MACHINE LEARNING (ML) VS. NATURAL LANGUAGE PROCESSING (NLP):
- Scope: ML is a general AI discipline focused on learning patterns from structured or unstructured data. NLP is a specialized AI discipline focused specifically on human textual and vocal language.
- Input Data: ML handles tabular numerical data, sensor feeds, images, or audio. NLP focuses primarily on textual sequences, syntax, and spoken linguistics.
- Core Challenges: ML deals with overfitting, underfitting, and high dimensionality. NLP deals with linguistic ambiguity, sarcasm, polysemy, idiom expressions, and multilingual variations.
- Core Metrics: ML uses Accuracy, MSE, ROC-AUC. NLP uses BLEU (translation), ROUGE (summarization), Perplexity, and Token-level F1-Score.

3. KEY EXAM FORMULAS:
- Precision = True Positives / (True Positives + False Positives)
- Recall = True Positives / (True Positives + False Negatives)
- F1-Score = 2 * (Precision * Recall) / (Precision + Recall)
- TF-IDF = Term Frequency (TF) * Inverse Document Frequency (IDF)
`;

export class SampleDocsService {
  /**
   * Automatically seed sample ML & NLP notes for a student if not already present
   */
  static async seedSampleDocumentsForStudent(studentId: string): Promise<any> {
    try {
      const existingDocs = await DBStore.findDocumentsByStudent(studentId);
      const alreadyHasMlDoc = existingDocs.some(
        (d) => d.originalName === SAMPLE_ML_NLP_DOCUMENT_NAME
      );

      if (alreadyHasMlDoc) {
        return null;
      }

      console.log(`[SampleDocs] Provisioning sample ML & NLP study material for student ${studentId}...`);

      const buffer = Buffer.from(SAMPLE_ML_NLP_TEXT, 'utf-8');
      const hash = crypto.createHash('md5').update(buffer).digest('hex');

      // 1. Create document entry
      const doc = await DBStore.createDocument({
        studentId,
        filename: `${Date.now()}_${SAMPLE_ML_NLP_DOCUMENT_NAME}`,
        originalName: SAMPLE_ML_NLP_DOCUMENT_NAME,
        fileType: 'TXT',
        fileSize: buffer.length,
        status: 'ready',
        processingProgress: 100,
        totalPages: 3,
        hash,
        uploadedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      });

      // 2. Create chunks for the 3 pages
      const pages = [
        {
          pageNumber: 1,
          unit: 'Unit 1: Machine Learning Foundations & Examples',
          chapter: 'Machine Learning Concepts & Taxonomy',
          text: `COLLEGE OF ENGINEERING - CS802 MACHINE LEARNING & NATURAL LANGUAGE PROCESSING
[PAGE 1: UNIT 1 - MACHINE LEARNING (ML) CONCEPTS, TAXONOMY & EXAMPLES]

1. DEFINITION OF MACHINE LEARNING:
According to Arthur Samuel (1959), Machine Learning is the field of study that gives computers the ability to learn without being explicitly programmed.
According to Tom Mitchell (1997), "A computer program is said to learn from experience E with respect to some class of tasks T and performance measure P, if its performance at tasks in T, as measured by P, improves with experience E."

2. TAXONOMY OF MACHINE LEARNING WITH EXAMPLES:

A. SUPERVISED LEARNING:
The algorithm is trained on labeled input-output pairs (X, Y) where the correct target output is provided during training.
Concrete Real-World Examples:
1. Email Spam Detection: Classifying incoming emails into 'Spam' or 'Ham' (Not Spam) using features like subject line keywords, sender reputation, and promotional phrases.
2. Medical Diagnosis: Automated detection of diabetic retinopathy or pneumonia from patient chest X-ray images labeled by expert radiologists.
3. Real Estate House Price Prediction: Regression model predicting continuous home market values based on square footage, zip code, and number of bedrooms.

B. UNSUPERVISED LEARNING:
The algorithm learns patterns, hidden groupings, and intrinsic structures from unlabeled input data (X) without target output supervision.
Concrete Real-World Examples:
1. Customer Segmentation in E-Commerce: Grouping millions of shoppers into distinct behavioral personas (e.g., bargain hunters, high-end spenders) using K-Means clustering on purchase history.
2. Anomaly & Fraud Detection in Banking: Identifying rare anomalous transactions on credit cards that deviate substantially from normal customer expenditure patterns.
3. Market Basket Analysis: Discovering associated products frequently bought together (e.g., bread and butter) using the Apriori association rule algorithm.

C. REINFORCEMENT LEARNING:
An autonomous agent learns to achieve a goal in an interactive environment through sequential trial and error, receiving feedback as scalar rewards or penalties.
Concrete Real-World Examples:
1. Autonomous Self-Driving Vehicles: Training self-driving agents to keep lanes, brake appropriately, and navigate obstacles based on situational safety reward functions.
2. Game Playing AI: DeepMind's AlphaGo and chess-playing algorithms mastering grandmaster gameplay through self-play reinforcement learning.`,
        },
        {
          pageNumber: 2,
          unit: 'Unit 2: Natural Language Processing & Examples',
          chapter: 'NLP Concepts, Pipeline & Applications',
          text: `COLLEGE OF ENGINEERING - CS802 MACHINE LEARNING & NATURAL LANGUAGE PROCESSING
[PAGE 2: UNIT 2 - NATURAL LANGUAGE PROCESSING (NLP) & PRACTICAL EXAMPLES]

1. DEFINITION OF NATURAL LANGUAGE PROCESSING:
Natural Language Processing (NLP) is an interdisciplinary branch of Artificial Intelligence, Computer Science, and Computational Linguistics focused on enabling computers to read, decipher, understand, synthesize, and generate human language in a meaningful and valuable manner.

2. THE NLP PROCESSING PIPELINE:
The standard pipeline includes:
- Sentence Segmentation: Dividing a text corpus into individual sentences.
- Tokenization: Splitting sentences into discrete words or sub-word tokens.
- Stop-Word Removal: Filtering out high-frequency grammatical words (e.g., "is", "the", "and") that carry low semantic value.
- Stemming and Lemmatization: Reducing inflected word forms to their root lemma (e.g., "studying", "studied" -> "study").
- Part-of-Speech (POS) Tagging: Labeling each token as noun, verb, adjective, etc.
- Named Entity Recognition (NER): Extracting real-world entities such as persons, locations, organizations, and dates.

3. CONCRETE REAL-WORLD EXAMPLES OF NLP:
1. Sentiment Analysis on Product Reviews: E-commerce platforms (such as Amazon and Yelp) analyzing customer text reviews to classify sentiment as Positive, Neutral, or Negative to monitor customer satisfaction.
2. Conversational Virtual Assistants: Intelligent agents like Apple Siri, Amazon Alexa, and customer support chatbots that comprehend spoken/typed human queries, infer user intent, and generate contextual vocal responses.
3. Neural Machine Translation: Real-time multi-lingual translation systems like Google Translate converting documents seamlessly between languages (e.g., English to Spanish, German, or Hindi).
4. Information Extraction & Clinical NER: Extracting clinical entities (patient symptoms, diagnoses, drug names, and dosages) from electronic health records.
5. Email Smart Reply & Autocomplete: Predictive text generation in Gmail suggesting full sentences and auto-completions as the user types.`,
        },
        {
          pageNumber: 3,
          unit: 'Unit 3: ML in NLP & Comparison',
          chapter: 'Synergy between ML and NLP & Exam Summary',
          text: `COLLEGE OF ENGINEERING - CS802 MACHINE LEARNING & NATURAL LANGUAGE PROCESSING
[PAGE 3: UNIT 3 - SYNERGISTIC RELATIONSHIP: ML IN NLP & COMPARISON]

1. HOW MACHINE LEARNING POWERS NATURAL LANGUAGE PROCESSING:
NLP provides the linguistic domain modeling, feature extraction, and text representations, while Machine Learning algorithms provide the statistical reasoning, pattern detection, and generation capabilities:
- Traditional ML in NLP: Naive Bayes and Support Vector Machines (SVM) for spam detection and topic categorization using Bag-of-Words and TF-IDF representations.
- Deep Learning & Transformer Models: Recurrent Neural Networks (LSTM/GRU) and Transformer architectures (BERT, RoBERTa, T5, GPT) that capture bidirectional contextual relationships across words.

2. COMPARISON TABLE: MACHINE LEARNING (ML) VS. NATURAL LANGUAGE PROCESSING (NLP):
- Scope: ML is a general AI discipline focused on learning patterns from structured or unstructured data. NLP is a specialized AI discipline focused specifically on human textual and vocal language.
- Input Data: ML handles tabular numerical data, sensor feeds, images, or audio. NLP focuses primarily on textual sequences, syntax, and spoken linguistics.
- Core Challenges: ML deals with overfitting, underfitting, and high dimensionality. NLP deals with linguistic ambiguity, sarcasm, polysemy, idiom expressions, and multilingual variations.
- Core Metrics: ML uses Accuracy, MSE, ROC-AUC. NLP uses BLEU (translation), ROUGE (summarization), Perplexity, and Token-level F1-Score.

3. KEY EXAM FORMULAS:
- Precision = True Positives / (True Positives + False Positives)
- Recall = True Positives / (True Positives + False Negatives)
- F1-Score = 2 * (Precision * Recall) / (Precision + Recall)
- TF-IDF = Term Frequency (TF) * Inverse Document Frequency (IDF)`,
        },
      ];

      // 3. Generate embeddings for all 3 chunks
      const texts = pages.map((p) => p.text);
      const embeddings = await EmbeddingService.generateBatchEmbeddings(texts);

      const chunkDocs = pages.map((p, idx) => ({
        studentId,
        documentId: doc._id.toString(),
        filename: SAMPLE_ML_NLP_DOCUMENT_NAME,
        pageNumber: p.pageNumber,
        unit: p.unit,
        chapter: p.chapter,
        chunkIndex: idx,
        text: p.text,
        embedding: embeddings[idx] || [],
      }));

      await DBStore.insertChunks(chunkDocs);
      console.log(`[SampleDocs] Successfully seeded 3 chunks for ${SAMPLE_ML_NLP_DOCUMENT_NAME}`);

      return doc;
    } catch (err: any) {
      console.error('[SampleDocs] Error seeding sample documents:', err);
      return null;
    }
  }

  /**
   * Seed sample documents for all students currently registered
   */
  static async seedAllExistingStudents(): Promise<void> {
    try {
      const allStudents = await DBStore.findAllStudents();
      for (const student of allStudents) {
        await this.seedSampleDocumentsForStudent(student._id.toString());
      }
    } catch (err) {
      console.error('[SampleDocs] Error seeding existing students:', err);
    }
  }
}
