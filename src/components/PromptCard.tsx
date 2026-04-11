const PROMPTS = [
  "What's one object you'd never throw away — and why does it matter?",
  "Describe a sound that takes you somewhere else entirely.",
  "What's a meal that felt like more than food?",
  "Tell me about a moment that changed the way you see yourself.",
  "Who taught you something without meaning to?",
];

const PromptCard = () => {
  // For MVP, pick a deterministic daily prompt
  const dayIndex = Math.floor(Date.now() / 86400000) % PROMPTS.length;
  const prompt = PROMPTS[dayIndex];

  return (
    <div className="rounded-lg bg-card px-5 py-6">
      <p className="font-playfair text-lg italic leading-relaxed text-foreground">
        "{prompt}"
      </p>
    </div>
  );
};

export default PromptCard;
