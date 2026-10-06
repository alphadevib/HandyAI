package com.handyai.build.service;

import com.handyai.build.domain.AiTool;
import com.handyai.build.domain.PricingModel;
import com.handyai.build.dto.RecommendationRequest;
import com.handyai.build.dto.RecommendationResponse;
import com.handyai.build.dto.RecommendationResponse.Recommendation;
import com.handyai.build.dto.ToolResponse;
import com.handyai.build.repository.AiToolRepository;
import com.handyai.build.repository.FavoriteRepository;
import com.handyai.build.repository.ReviewRepository;
import com.handyai.build.repository.UserRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Explainable, fully local scoring: the point of the product is to surface platforms people have
 * never heard of, so every suggestion comes back with the reasons that earned it a place.
 *
 * <p>Scoring is pure in-memory work over an already-loaded snapshot of the catalogue. No external
 * calls, no locks, no shared mutable state between requests.
 */
@Service
public class RecommendationService {

    private static final int DEFAULT_LIMIT = 6;
    private static final int MAX_LIMIT = 24;

    /** Words that carry no intent, dropped before matching. */
    private static final Set<String> STOP_WORDS = Set.of(
            "the", "and", "for", "with", "that", "this", "have", "has", "from", "your", "you",
            "our", "are", "want", "need", "help", "using", "use", "make", "get", "some", "about",
            "into", "more", "best", "good", "able", "work", "working", "would", "like", "can",
            "will", "any", "all", "what", "when", "how", "tool", "tools", "app", "apps", "ai");

    /** Profession/intent hints mapped onto category slugs the seeder creates. */
    private static final Map<String, List<String>> INTENT_CATEGORIES = Map.ofEntries(
            Map.entry("developer", List.of("coding", "productivity")),
            Map.entry("engineer", List.of("coding", "productivity")),
            Map.entry("programmer", List.of("coding")),
            Map.entry("code", List.of("coding")),
            Map.entry("software", List.of("coding")),
            Map.entry("designer", List.of("design", "image")),
            Map.entry("design", List.of("design", "image")),
            Map.entry("ux", List.of("design")),
            Map.entry("marketer", List.of("marketing", "writing")),
            Map.entry("marketing", List.of("marketing", "writing")),
            Map.entry("seo", List.of("marketing")),
            Map.entry("writer", List.of("writing")),
            Map.entry("writing", List.of("writing")),
            Map.entry("blog", List.of("writing", "marketing")),
            Map.entry("copy", List.of("writing", "marketing")),
            Map.entry("student", List.of("research", "productivity", "writing")),
            Map.entry("teacher", List.of("research", "productivity")),
            Map.entry("research", List.of("research")),
            Map.entry("researcher", List.of("research")),
            Map.entry("analyst", List.of("data", "research")),
            Map.entry("data", List.of("data")),
            Map.entry("spreadsheet", List.of("data", "productivity")),
            Map.entry("founder", List.of("productivity", "marketing", "automation")),
            Map.entry("startup", List.of("productivity", "automation")),
            Map.entry("manager", List.of("productivity", "meetings")),
            Map.entry("meeting", List.of("meetings")),
            Map.entry("notes", List.of("meetings", "productivity")),
            Map.entry("video", List.of("video")),
            Map.entry("editor", List.of("video", "writing")),
            Map.entry("youtube", List.of("video")),
            Map.entry("podcast", List.of("audio", "video")),
            Map.entry("audio", List.of("audio")),
            Map.entry("music", List.of("audio")),
            Map.entry("voice", List.of("audio")),
            Map.entry("image", List.of("image", "design")),
            Map.entry("photo", List.of("image", "design")),
            Map.entry("logo", List.of("image", "design")),
            Map.entry("automate", List.of("automation")),
            Map.entry("automation", List.of("automation")),
            Map.entry("workflow", List.of("automation", "productivity")),
            Map.entry("support", List.of("automation", "chatbots")),
            Map.entry("chatbot", List.of("chatbots")),
            Map.entry("assistant", List.of("chatbots", "productivity")));

    private final AiToolRepository toolRepository;
    private final FavoriteRepository favoriteRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public RecommendationService(AiToolRepository toolRepository,
                                 FavoriteRepository favoriteRepository,
                                 ReviewRepository reviewRepository,
                                 UserRepository userRepository) {
        this.toolRepository = toolRepository;
        this.favoriteRepository = favoriteRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public RecommendationResponse recommend(RecommendationRequest request, Long currentUserId) {
        int limit = request.limit() == null
                ? DEFAULT_LIMIT
                : Math.max(1, Math.min(MAX_LIMIT, request.limit()));

        String profession = request.profession() != null && !request.profession().isBlank()
                ? request.profession()
                : professionOf(currentUserId);

        String goal = request.goal() == null ? "" : request.goal();
        Set<String> keywords = tokenise(goal + " " + (profession == null ? "" : profession));
        Set<String> wantedCategories = new HashSet<>(normalise(request.categorySlugs()));
        wantedCategories.addAll(intentCategories(keywords));

        PricingModel pricing = parsePricing(request.pricing());
        Set<Long> favoriteToolIds = currentUserId == null
                ? Set.of()
                : new HashSet<>(favoriteRepository.findToolIdsByUser(currentUserId));
        Set<Long> affinityCategoryIds = currentUserId == null ? Set.of() : affinity(currentUserId);

        List<AiTool> catalogue = toolRepository.findAllByOrderByPopularityDesc(
                org.springframework.data.domain.PageRequest.of(0, 500));

        List<Recommendation> ranked = catalogue.stream()
                // A stated budget is a filter, not a preference: it means the same thing here as
                // it does on the catalogue's pricing filter.
                .filter(tool -> pricing == null || tool.getPricingModel() == pricing)
                .map(tool -> score(tool, keywords, wantedCategories, pricing, favoriteToolIds,
                        affinityCategoryIds))
                .filter(scored -> scored.matchScore() > 0)
                .sorted(Comparator.comparingInt(Recommendation::matchScore).reversed()
                        .thenComparing(item -> item.tool().name()))
                .limit(limit)
                .toList();

        if (ranked.isEmpty()) {
            // Nothing matched the wording: fall back to the strongest all-round picks rather than
            // sending the visitor away empty handed.
            ranked = catalogue.stream()
                    .filter(tool -> pricing == null || tool.getPricingModel() == pricing)
                    .limit(limit)
                    .map(tool -> new Recommendation(
                            ToolResponse.from(tool, favoriteToolIds.contains(tool.getId())),
                            50,
                            List.of("A well-rounded starting point while you refine your search")))
                    .toList();
        }

        return new RecommendationResponse(summary(goal, profession, ranked.size()), ranked);
    }

    private Recommendation score(AiTool tool, Set<String> keywords, Set<String> wantedCategories,
                                 PricingModel pricing, Set<Long> favoriteToolIds,
                                 Set<Long> affinityCategoryIds) {
        int score = 0;
        List<String> reasons = new ArrayList<>();

        String name = tool.getName().toLowerCase(Locale.ROOT);
        String tagline = tool.getTagline().toLowerCase(Locale.ROOT);
        String description = tool.getDescription().toLowerCase(Locale.ROOT);
        Set<String> tags = new HashSet<>(tool.tagList().stream()
                .map(tag -> tag.toLowerCase(Locale.ROOT))
                .toList());

        int keywordHits = 0;
        List<String> matchedTags = new ArrayList<>();
        for (String keyword : keywords) {
            boolean hit = false;
            if (tags.contains(keyword)) {
                score += 14;
                matchedTags.add(keyword);
                hit = true;
            } else if (tags.stream().anyMatch(tag -> tag.contains(keyword))) {
                score += 9;
                matchedTags.add(keyword);
                hit = true;
            }
            if (name.contains(keyword)) {
                score += 10;
                hit = true;
            }
            if (tagline.contains(keyword)) {
                score += 7;
                hit = true;
            } else if (description.contains(keyword)) {
                score += 4;
                hit = true;
            }
            if (hit) {
                keywordHits++;
            }
        }
        if (!matchedTags.isEmpty()) {
            reasons.add("Built for " + String.join(", ", matchedTags.stream().distinct().limit(3).toList()));
        } else if (keywordHits > 0) {
            reasons.add("Matches what you described");
        }

        if (wantedCategories.contains(tool.getCategory().getSlug())) {
            score += 22;
            reasons.add("Top pick in " + tool.getCategory().getName());
        }

        if (pricing != null && tool.getPricingModel() == pricing) {
            score += 12;
            reasons.add(pricingLabel(pricing));
        }

        if (affinityCategoryIds.contains(tool.getCategory().getId())) {
            score += 8;
            reasons.add("Close to tools you already rate highly");
        }

        if (tool.getRatingCount() > 0 && tool.averageRating() >= 4d) {
            score += 6;
            reasons.add("Rated " + tool.averageRating() + " by the community");
        }

        if (score > 0) {
            score += tool.getPopularity() / 10;
            if (tool.isFeatured()) {
                score += 3;
            }
            // A small nudge towards free tools, but only among those that already matched: it
            // must never be the only thing keeping a tool in the list.
            if (pricing == null && tool.getPricingModel() == PricingModel.FREE) {
                score += 4;
            }
        }

        if (reasons.isEmpty() && score > 0) {
            reasons.add("A strong general-purpose option");
        }

        return new Recommendation(
                ToolResponse.from(tool, favoriteToolIds.contains(tool.getId())),
                Math.min(score, 100),
                reasons.stream().distinct().limit(3).toList());
    }

    private Set<Long> affinity(Long userId) {
        Set<Long> categoryIds = new HashSet<>(favoriteRepository.findFavoriteCategoryIds(userId));
        categoryIds.addAll(reviewRepository.findLikedCategoryIds(userId));
        return categoryIds;
    }

    private String professionOf(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).map(user -> user.getProfession()).orElse(null);
    }

    private Set<String> intentCategories(Set<String> keywords) {
        Set<String> slugs = new HashSet<>();
        for (String keyword : keywords) {
            List<String> mapped = INTENT_CATEGORIES.get(keyword);
            if (mapped != null) {
                slugs.addAll(mapped);
            }
        }
        return slugs;
    }

    private Set<String> tokenise(String text) {
        if (text == null || text.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(text.toLowerCase(Locale.ROOT).split("[^a-z0-9+#]+"))
                .map(String::trim)
                .filter(word -> word.length() > 2)
                .filter(word -> !STOP_WORDS.contains(word))
                .limit(40)
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));
    }

    private List<String> normalise(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .toList();
    }

    private PricingModel parsePricing(String pricing) {
        if (pricing == null || pricing.isBlank() || "ALL".equalsIgnoreCase(pricing)) {
            return null;
        }
        try {
            return PricingModel.valueOf(pricing.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String pricingLabel(PricingModel pricing) {
        return switch (pricing) {
            case FREE -> "Completely free to use";
            case FREEMIUM -> "Usable free, upgrade only if you need more";
            case TRIAL -> "Offers a trial before you commit";
            case PAID -> "Paid, and worth it for serious use";
        };
    }

    private String summary(String goal, String profession, int count) {
        StringBuilder summary = new StringBuilder(count + " tool");
        if (count != 1) {
            summary.append('s');
        }
        summary.append(" picked");
        boolean hasProfession = profession != null && !profession.isBlank();
        if (hasProfession) {
            summary.append(" for a ").append(profession.trim().toLowerCase(Locale.ROOT));
        }
        if (goal != null && !goal.isBlank()) {
            summary.append(hasProfession ? " who wants to " : " to help you ")
                    .append(goal.trim().toLowerCase(Locale.ROOT));
        }
        summary.append('.');
        return summary.toString();
    }
}
