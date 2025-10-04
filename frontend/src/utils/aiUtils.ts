// Free AI utilities without external APIs

export class FreeAIUtils {
  // Simple text summarization using extractive method
  static summarizeText(text: string, maxSentences: number = 3): string {
    if (!text || text.length < 100) return text;

    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length <= maxSentences) return text;

    // Score sentences based on word frequency and position
    const wordFreq = this.getWordFrequency(text);
    const scoredSentences = sentences.map((sentence, index) => {
      const words = sentence.toLowerCase().split(/\s+/);
      const score = words.reduce((sum, word) => {
        return sum + (wordFreq[word] || 0);
      }, 0) / words.length;
      
      // Boost score for sentences at beginning and end
      const positionBoost = index < 2 || index >= sentences.length - 2 ? 1.2 : 1;
      
      return {
        sentence: sentence.trim(),
        score: score * positionBoost,
        index
      };
    });

    // Sort by score and take top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => a.index - b.index)
      .map(s => s.sentence);

    return topSentences.join('. ') + '.';
  }

  // Get word frequency for summarization
  private static getWordFrequency(text: string): Record<string, number> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));

    const freq: Record<string, number> = {};
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1;
    });

    return freq;
  }

  // Common stop words to ignore
  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
      'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
      'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his',
      'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
      'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
      'who', 'whom', 'whose', 'this', 'that', 'these', 'those', 'am', 'is',
      'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }

  // Text-to-Speech using Web Speech API (free, built into browsers)
  static speakText(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: string;
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Text-to-speech not supported in this browser'));
        return;
      }

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set options
      utterance.rate = options.rate || 0.8;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 0.8;

      // Try to use a specific voice if requested
      if (options.voice) {
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(voice => 
          voice.name.toLowerCase().includes(options.voice!.toLowerCase())
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

      speechSynthesis.speak(utterance);
    });
  }

  // Stop current speech
  static stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  // Get available voices
  static getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) return [];
    return speechSynthesis.getVoices();
  }

  // Simple text simplification
  static simplifyText(text: string): string {
    if (!text) return text;

    let simplified = text;

    // Replace complex words with simpler alternatives
    const replacements: Record<string, string> = {
      'utilize': 'use',
      'demonstrate': 'show',
      'facilitate': 'help',
      'implement': 'do',
      'subsequently': 'then',
      'consequently': 'so',
      'furthermore': 'also',
      'nevertheless': 'but',
      'approximately': 'about',
      'sufficient': 'enough',
      'acquire': 'get',
      'commence': 'start',
      'terminate': 'end',
      'assistance': 'help',
      'endeavor': 'try',
      'accomplish': 'do',
      'participate': 'join',
      'investigate': 'look into',
      'establish': 'set up'
    };

    // Apply replacements
    Object.entries(replacements).forEach(([complex, simple]) => {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplified = simplified.replace(regex, simple);
    });

    // Break down long sentences
    simplified = simplified.replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2');

    // Add bullet points for lists
    simplified = simplified.replace(/(\d+\.\s)/g, '• ');

    return simplified;
  }

  // Extract key points from text
  static extractKeyPoints(text: string, maxPoints: number = 5): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const wordFreq = this.getWordFrequency(text);
    
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.toLowerCase().split(/\s+/);
      const score = words.reduce((sum, word) => {
        return sum + (wordFreq[word] || 0);
      }, 0) / words.length;
      
      return { sentence: sentence.trim(), score };
    });

    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPoints)
      .map(s => s.sentence);
  }
}

// Hook for using AI utilities in components
export const useAI = () => {
  const summarize = (text: string, sentences: number = 3) => {
    return FreeAIUtils.summarizeText(text, sentences);
  };

  const speak = async (text: string, options?: any) => {
    try {
      await FreeAIUtils.speakText(text, options);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  };

  const stopSpeaking = () => {
    FreeAIUtils.stopSpeaking();
  };

  const simplify = (text: string) => {
    return FreeAIUtils.simplifyText(text);
  };

  const getKeyPoints = (text: string, maxPoints: number = 5) => {
    return FreeAIUtils.extractKeyPoints(text, maxPoints);
  };

  return {
    summarize,
    speak,
    stopSpeaking,
    simplify,
    getKeyPoints,
    isSupported: 'speechSynthesis' in window
  };
};