#!/usr/bin/env python3
"""
Simple AI Processing Script for MindSpark
Provides basic text processing without heavy AI models
"""

import sys
import json
import argparse
import re

def simple_summarize(text, max_sentences=3):
    """Create a simple summary by extracting key sentences"""
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    
    if len(sentences) <= max_sentences:
        return '. '.join(sentences) + '.'
    
    # Score sentences based on length and position
    scored_sentences = []
    for i, sentence in enumerate(sentences):
        score = len(sentence.split())  # Word count
        if i == 0:  # First sentence bonus
            score += 10
        if i < len(sentences) // 2:  # First half bonus
            score += 5
        scored_sentences.append((score, sentence))
    
    # Get top sentences
    scored_sentences.sort(reverse=True)
    top_sentences = [s[1] for s in scored_sentences[:max_sentences]]
    
    # Maintain original order
    summary_sentences = []
    for sentence in sentences:
        if sentence in top_sentences:
            summary_sentences.append(sentence)
    
    return '. '.join(summary_sentences) + '.'

def generate_questions(text, num_questions=5):
    """Generate questions from text content"""
    questions = [
        "What are the main topics discussed in this text?",
        "What are the key points you should remember?",
        "How does this information connect to what you already know?",
        "What questions do you still have after reading this?",
        "How could you apply this information in real life?"
    ]
    
    # Try to generate specific questions from content
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    specific_questions = []
    
    for sentence in sentences[:3]:
        if len(sentence) > 20:
            # Look for definitions
            if ' is ' in sentence or ' are ' in sentence:
                parts = re.split(r' (is|are) ', sentence)
                if len(parts) >= 3:
                    specific_questions.append(f"What {parts[2].split(' ')[0]} {parts[0]}?")
            
            # Look for processes
            if any(word in sentence.lower() for word in ['can', 'will', 'helps', 'allows']):
                specific_questions.append(f"How does this work: {sentence[:40]}...?")
    
    # Combine specific and generic questions
    all_questions = specific_questions + questions
    return all_questions[:num_questions]

def analyze_content(text):
    """Analyze content complexity"""
    words = text.split()
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    
    word_count = len(words)
    sentence_count = len(sentences)
    avg_words_per_sentence = word_count / max(sentence_count, 1)
    
    # Reading level assessment
    if avg_words_per_sentence < 8:
        reading_level = "Elementary"
    elif avg_words_per_sentence < 12:
        reading_level = "Middle School"
    elif avg_words_per_sentence < 18:
        reading_level = "High School"
    else:
        reading_level = "College"
    
    # Simple sentiment
    positive_words = ['good', 'great', 'excellent', 'amazing', 'helpful', 'useful', 'important']
    negative_words = ['bad', 'difficult', 'hard', 'problem', 'issue', 'error', 'wrong']
    
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
        "complexity_score": min(100, max(0, int(avg_words_per_sentence * 4)))
    }

def process_document(text, task="all"):
    """Main processing function"""
    if task == "summarize":
        return simple_summarize(text)
    elif task == "questions":
        return generate_questions(text)
    elif task == "analyze":
        return analyze_content(text)
    elif task == "all":
        return {
            "summary": simple_summarize(text),
            "questions": generate_questions(text),
            "analysis": analyze_content(text)
        }
    else:
        return {"error": f"Unknown task: {task}"}

def main():
    parser = argparse.ArgumentParser(description="Simple AI Processing for MindSpark")
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
    
    # Process
    result = process_document(input_text, args.task)
    
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