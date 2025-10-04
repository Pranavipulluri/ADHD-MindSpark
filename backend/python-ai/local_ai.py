#!/usr/bin/env python3
"""
Local AI Processing Script for MindSpark
Provides text summarization, question generation, and content analysis
using HuggingFace Transformers
"""

import sys
import json
import argparse
from transformers import pipeline
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings("ignore")

class LocalAI:
    def __init__(self):
        """Initialize AI pipelines"""
        try:
            # Text summarization
            self.summarizer = pipeline(
                "summarization", 
                model="facebook/bart-large-cnn",
                device=-1  # Use CPU
            )
            
            # Question generation - using a simpler approach
            self.question_generator = None  # We'll use rule-based question generation
            
            # Text classification for content analysis - using simpler approach
            self.classifier = None  # We'll use rule-based analysis
            
        except Exception as e:
            print(f"Error initializing AI models: {e}", file=sys.stderr)
            sys.exit(1)

    def summarize_text(self, text, max_length=150, min_length=50):
        """Summarize long text content"""
        try:
            # Split long text into chunks if needed
            max_chunk_length = 1024
            if len(text) > max_chunk_length:
                chunks = [text[i:i+max_chunk_length] for i in range(0, len(text), max_chunk_length)]
                summaries = []
                
                for chunk in chunks:
                    if len(chunk.strip()) > 50:  # Only process meaningful chunks
                        summary = self.summarizer(
                            chunk,
                            max_length=max_length,
                            min_length=min_length,
                            do_sample=False
                        )
                        summaries.append(summary[0]['summary_text'])
                
                # Combine and re-summarize if multiple chunks
                if len(summaries) > 1:
                    combined = " ".join(summaries)
                    final_summary = self.summarizer(
                        combined,
                        max_length=max_length,
                        min_length=min_length,
                        do_sample=False
                    )
                    return final_summary[0]['summary_text']
                else:
                    return summaries[0] if summaries else "Unable to generate summary."
            else:
                summary = self.summarizer(
                    text,
                    max_length=max_length,
                    min_length=min_length,
                    do_sample=False
                )
                return summary[0]['summary_text']
                
        except Exception as e:
            return f"Error generating summary: {str(e)}"

    def generate_questions(self, text, num_questions=5):
        """Generate questions from text content using rule-based approach"""
        try:
            # Simple rule-based question generation
            sentences = [s.strip() for s in text.split('.') if s.strip()]
            questions = []
            
            # Generic questions
            base_questions = [
                "What are the main topics discussed in this text?",
                "What are the key points you should remember?",
                "How does this information connect to what you already know?",
                "What questions do you still have after reading this?",
                "How could you apply this information in real life?"
            ]
            
            # Try to generate specific questions from content
            for sentence in sentences[:3]:
                if len(sentence) > 20:
                    # Look for key concepts
                    if ' is ' in sentence or ' are ' in sentence:
                        parts = sentence.split(' is ' if ' is ' in sentence else ' are ')
                        if len(parts) >= 2:
                            questions.append(f"What {parts[1].split(' ')[0]} {parts[0]}?")
                    
                    # Look for processes or actions
                    if 'can' in sentence.lower() or 'will' in sentence.lower():
                        questions.append(f"How does this process work: {sentence[:50]}...?")
            
            # Fill with base questions if needed
            questions.extend(base_questions)
            
            return questions[:num_questions]
            
        except Exception as e:
            return [
                "What are the main topics discussed in this text?",
                "What are the key points you should remember?",
                "How does this information connect to what you already know?",
                "What questions do you still have after reading this?",
                "How could you apply this information in real life?"
            ]

    def analyze_content(self, text):
        """Analyze content for complexity using rule-based approach"""
        try:
            # Simple complexity analysis
            word_count = len(text.split())
            sentence_count = len([s for s in text.split('.') if s.strip()])
            avg_words_per_sentence = word_count / max(sentence_count, 1)
            
            # Determine reading level (simplified)
            if avg_words_per_sentence < 10:
                reading_level = "Elementary"
            elif avg_words_per_sentence < 15:
                reading_level = "Middle School"
            elif avg_words_per_sentence < 20:
                reading_level = "High School"
            else:
                reading_level = "College"
            
            # Simple sentiment analysis based on keywords
            positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'helpful', 'useful']
            negative_words = ['bad', 'terrible', 'difficult', 'hard', 'problem', 'issue', 'error']
            
            text_lower = text.lower()
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            if positive_count > negative_count:
                sentiment = "positive"
            elif negative_count > positive_count:
                sentiment = "negative"
            else:
                sentiment = "neutral"
            
            return {
                "word_count": word_count,
                "sentence_count": sentence_count,
                "avg_words_per_sentence": round(avg_words_per_sentence, 1),
                "reading_level": reading_level,
                "sentiment": sentiment,
                "complexity_score": min(100, max(0, int(avg_words_per_sentence * 5)))
            }
            
        except Exception as e:
            return {
                "word_count": len(text.split()),
                "sentence_count": 1,
                "avg_words_per_sentence": len(text.split()),
                "reading_level": "Elementary",
                "sentiment": "neutral",
                "complexity_score": 50,
                "error": f"Error analyzing content: {str(e)}"
            }

    def process_document(self, text, task="summarize"):
        """Main processing function"""
        if task == "summarize":
            return self.summarize_text(text)
        elif task == "questions":
            return self.generate_questions(text)
        elif task == "analyze":
            return self.analyze_content(text)
        elif task == "all":
            return {
                "summary": self.summarize_text(text),
                "questions": self.generate_questions(text),
                "analysis": self.analyze_content(text)
            }
        else:
            return {"error": f"Unknown task: {task}"}

def main():
    parser = argparse.ArgumentParser(description="Local AI Processing for MindSpark")
    parser.add_argument("--task", choices=["summarize", "questions", "analyze", "all"], 
                       default="summarize", help="AI task to perform")
    parser.add_argument("--text", type=str, help="Text to process")
    parser.add_argument("--file", type=str, help="File containing text to process")
    parser.add_argument("--output", choices=["json", "text"], default="json", 
                       help="Output format")
    
    args = parser.parse_args()
    
    # Get input text
    if args.text:
        input_text = args.text
    elif args.file:
        try:
            with open(args.file, 'r', encoding='utf-8') as f:
                input_text = f.read()
        except Exception as e:
            print(f"Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # Read from stdin
        input_text = sys.stdin.read()
    
    if not input_text.strip():
        print("Error: No input text provided", file=sys.stderr)
        sys.exit(1)
    
    # Initialize AI and process
    ai = LocalAI()
    result = ai.process_document(input_text, args.task)
    
    # Output result
    if args.output == "json":
        print(json.dumps(result, indent=2))
    else:
        if isinstance(result, dict):
            for key, value in result.items():
                print(f"{key.upper()}:")
                if isinstance(value, list):
                    for item in value:
                        print(f"  - {item}")
                else:
                    print(f"  {value}")
                print()
        else:
            print(result)

if __name__ == "__main__":
    main()