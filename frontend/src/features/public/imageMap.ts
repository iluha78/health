import heroCardiology from "../../assets/hero-cardiology.svg";
import monitorIllustration from "../../assets/feature-monitor.svg";
import nutritionIllustration from "../../assets/feature-nutrition.svg";
import assistantIllustration from "../../assets/feature-assistant.svg";
import subscriptionIllustration from "../../assets/feature-subscription.svg";
import newsAi from "../../assets/news-ai.svg";
import newsFood from "../../assets/news-food.svg";
import newsResearch from "../../assets/news-research.svg";
import journeyTrack from "../../assets/journey-track.svg";
import journeyCoach from "../../assets/journey-coach.svg";
import journeyCelebrate from "../../assets/journey-celebrate.svg";
import storyOlga from "../../assets/story-olga.svg";
import storyIgor from "../../assets/story-igor.svg";
import storyAlla from "../../assets/story-alla.svg";

const IMAGE_MAP: Record<string, string> = {
  "hero-cardiology": heroCardiology,
  "feature-monitor": monitorIllustration,
  "feature-nutrition": nutritionIllustration,
  "feature-assistant": assistantIllustration,
  "feature-subscription": subscriptionIllustration,
  "news-ai": newsAi,
  "news-food": newsFood,
  "news-research": newsResearch,
  "journey-track": journeyTrack,
  "journey-coach": journeyCoach,
  "journey-celebrate": journeyCelebrate,
  "story-olga": storyOlga,
  "story-igor": storyIgor,
  "story-alla": storyAlla,
};

export const resolveIllustration = (key: string): string => {
  return IMAGE_MAP[key] ?? heroCardiology;
};
