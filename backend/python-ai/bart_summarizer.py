import os
import sys
import json
import argparse
from transformers import pipeline

def setup_summarizer():
    """Initialize the summarization pipeline with BART model"""
    try:
        print("🔄 Loading BART summarization model...", file=sys.stderr)
        summarizer = pipeline(
            "summarization", 
            model="facebook/bart-large-cnn",
            device=-1  # Use CPU
        )
        print("✅ BART model loaded successfully", file=sys.stderr)
        return summarizer
    except Exception as e:
        print(f"❌ Failed to load BART model: {e}", file=sys.stderr)
        try:
            print("🔄 Falling back to DistilBART...", file=sys.stderr)
            summarizer = pipeline(
                "summarization", 
                model="sshleifer/distilbart-cnn-12-6",
                device=-1
            )
            print("✅ DistilBART model loaded successfully", file=sys.stderr)
            return summarizer
        except Exception as e2:
            print(f"❌ Failed to load DistilBART model: {e2}", file=sys.stderr)
            return None

def extract_key_points(text, max_points=5):
    """Extract key points from text using simple sentence analysis"""
    sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 30]
    
    # Simple scoring based on sentence length and position
    scored_sentences = []
    for i, sentence in enumerate(sentences[:20]):  # Limit to first 20 sentences
        score = len(sentence.split())  # Word count
        if i < 3:  # Boost early sentences
            score *= 1.5
        if any(keyword in sentence.lower() for keyword in ['important', 'key', 'main', 'significant', 'primary']):
            score *= 1.3
        scored_sentences.append((sentence, score))
    
    # Sort by score and take top points
    scored_sentences.sort(key=lambda x: x[1], reverse=True)
    key_points = [sentence for sentence, _ in scored_sentences[:max_points]]
    
    return key_points

def extract_concepts(text, max_concepts=4):
    """Extract main concepts from text"""
    # Simple keyword extraction
    common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall'}
    
    words = text.lower().split()
    word_freq = {}
    
    for word in words:
        word = word.strip('.,!?;:"()[]{}').lower()
        if len(word) > 3 and word not in common_words and word.isalpha():
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Get most frequent meaningful words as concepts
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    concepts = [word.title() for word, _ in sorted_words[:max_concepts]]
    
    return concepts

def process_document(text, max_length=150, min_length=50):
    """Process document with AI summarization and analysis"""
    try:
        # Setup summarizer
        summarizer = setup_summarizer()
        
        if not summarizer:
            return {
                "error": "Failed to load summarization model",
                "summary": text[:300] + "...",
                "keyPoints": extract_key_points(text),
                "concepts": extract_concepts(text),
                "processedBy": "Text Analysis Only"
            }
        
        # Split text into chunks if too long (BART has token limits)
        max_chunk_length = 1000  # Conservative limit
        chunks = []
        
        if len(text) > max_chunk_length:
            words = text.split()
            current_chunk = []
            current_length = 0
            
            for word in words:
                current_chunk.append(word)
                current_length += len(word) + 1
                
                if current_length >= max_chunk_length:
                    chunks.append(' '.join(current_chunk))
                    current_chunk = []
                    current_length = 0
            
            if current_chunk:
                chunks.append(' '.join(current_chunk))
        else:
            chunks = [text]
        
        print(f"📝 Processing {len(chunks)} chunks...", file=sys.stderr)
        
        # Summarize each chunk
        summaries = []
        for i, chunk in enumerate(chunks):
            try:
                print(f"🧠 Summarizing chunk {i+1}/{len(chunks)}...", file=sys.stderr)
                summary = summarizer(
                    chunk, 
                    max_length=max_length, 
                    min_length=min_length, 
                    do_sample=False
                )
                summaries.append(summary[0]['summary_text'])
            except Exception as e:
                print(f"❌ Failed to summarize chunk {i+1}: {e}", file=sys.stderr)
                # Fallback to first few sentences
                sentences = chunk.split('.')[:3]
                summaries.append('. '.join(sentences) + '.')
        
        # Combine summaries
        final_summary = ' '.join(summaries)
        
        # Extract additional information
        key_points = extract_key_points(text)
        concepts = extract_concepts(text)
        
        result = {
            "summary": final_summary,
            "keyPoints": key_points,
            "concepts": concepts,
            "importance": "This document contains valuable information for study and reference purposes.",
            "processedBy": "BART AI Summarization",
            "timestamp": "2025-10-04T21:00:00Z",
            "chunkCount": len(chunks)
        }
        
        print("✅ AI summarization completed successfully", file=sys.stderr)
        return result
        
    except Exception as e:
        print(f"❌ Error in document processing: {e}", file=sys.stderr)
        return {
            "error": str(e),
            "summary": text[:300] + "...",
            "keyPoints": extract_key_points(text),
            "concepts": extract_concepts(text),
            "processedBy": "Error Fallback"
        }

def main():
    parser = argparse.ArgumentParser(description='Process document with AI summarization')
    parser.add_argument('--text', required=True, help='Text content to process')
    parser.add_argument('--max-length', type=int, default=150, help='Maximum summary length')
    parser.add_argument('--min-length', type=int, default=50, help='Minimum summary length')
    
    args = parser.parse_args()
    
    result = process_document(args.text, args.max_length, args.min_length)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()