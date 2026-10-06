package com.handyai.build.service;

import com.handyai.build.domain.AiTool;
import com.handyai.build.domain.PricingModel;
import com.handyai.build.dto.PageResponse;
import com.handyai.build.dto.StatsResponse;
import com.handyai.build.dto.ToolResponse;
import com.handyai.build.exception.BadRequestException;
import com.handyai.build.exception.ResourceNotFoundException;
import com.handyai.build.repository.AiToolRepository;
import com.handyai.build.repository.CategoryRepository;
import com.handyai.build.repository.FavoriteRepository;
import com.handyai.build.repository.ReviewRepository;
import com.handyai.build.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ToolService {

    private static final int MAX_PAGE_SIZE = 60;

    private final AiToolRepository toolRepository;
    private final CategoryRepository categoryRepository;
    private final FavoriteRepository favoriteRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public ToolService(AiToolRepository toolRepository, CategoryRepository categoryRepository,
                       FavoriteRepository favoriteRepository, ReviewRepository reviewRepository,
                       UserRepository userRepository) {
        this.toolRepository = toolRepository;
        this.categoryRepository = categoryRepository;
        this.favoriteRepository = favoriteRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<ToolResponse> search(String query, String categorySlug, String pricing,
                                             String sort, int page, int size, Long currentUserId) {
        Pageable pageable = PageRequest.of(Math.max(page, 0),
                clamp(size, 1, MAX_PAGE_SIZE), sortFor(sort));

        String likeQuery = (query == null || query.isBlank())
                ? null
                : "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
        String category = (categorySlug == null || categorySlug.isBlank()) ? null
                : categorySlug.trim().toLowerCase(Locale.ROOT);
        if (category != null && !categoryRepository.existsBySlug(category)) {
            throw ResourceNotFoundException.of("Category", categorySlug);
        }

        Page<AiTool> result = toolRepository.search(likeQuery, category, parsePricing(pricing),
                pageable);
        Set<Long> favorites = favoriteIds(currentUserId);
        return PageResponse.of(result, result.getContent().stream()
                .map(tool -> ToolResponse.from(tool, favorites.contains(tool.getId())))
                .toList());
    }

    @Transactional(readOnly = true)
    public ToolResponse getBySlug(String slug, Long currentUserId) {
        AiTool tool = toolRepository.findBySlug(slug)
                .orElseThrow(() -> ResourceNotFoundException.of("Tool", slug));
        return ToolResponse.from(tool, isFavorite(currentUserId, tool.getId()));
    }

    @Transactional(readOnly = true)
    public List<ToolResponse> featured(int limit, Long currentUserId) {
        Set<Long> favorites = favoriteIds(currentUserId);
        List<AiTool> tools = toolRepository.findByFeaturedTrueOrderByPopularityDesc(
                PageRequest.of(0, clamp(limit, 1, MAX_PAGE_SIZE)));
        if (tools.isEmpty()) {
            tools = toolRepository.findAllByOrderByPopularityDesc(
                    PageRequest.of(0, clamp(limit, 1, MAX_PAGE_SIZE)));
        }
        return tools.stream()
                .map(tool -> ToolResponse.from(tool, favorites.contains(tool.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ToolResponse> trending(int limit, Long currentUserId) {
        Set<Long> favorites = favoriteIds(currentUserId);
        return toolRepository.findAllByOrderByPopularityDesc(
                        PageRequest.of(0, clamp(limit, 1, MAX_PAGE_SIZE))).stream()
                .map(tool -> ToolResponse.from(tool, favorites.contains(tool.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public StatsResponse stats() {
        return new StatsResponse(toolRepository.count(), categoryRepository.count(),
                reviewRepository.count(), userRepository.count());
    }

    Set<Long> favoriteIds(Long currentUserId) {
        if (currentUserId == null) {
            return Set.of();
        }
        return new HashSet<>(favoriteRepository.findToolIdsByUser(currentUserId));
    }

    private boolean isFavorite(Long currentUserId, Long toolId) {
        return currentUserId != null
                && favoriteRepository.existsByUserIdAndToolId(currentUserId, toolId);
    }

    private PricingModel parsePricing(String pricing) {
        if (pricing == null || pricing.isBlank() || "ALL".equalsIgnoreCase(pricing)) {
            return null;
        }
        try {
            return PricingModel.valueOf(pricing.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unknown pricing filter: " + pricing);
        }
    }

    /** Java 17 has no Math.clamp, and every list endpoint needs the same guard rails. */
    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private Sort sortFor(String sort) {
        String key = sort == null ? "popular" : sort.trim().toLowerCase(Locale.ROOT);
        return switch (key) {
            case "name" -> Sort.by(Sort.Direction.ASC, "name");
            case "newest" -> Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("id").descending());
            case "rating" -> Sort.by(Sort.Direction.DESC, "ratingSum", "popularity");
            case "", "popular" -> Sort.by(Sort.Direction.DESC, "popularity").and(Sort.by("name"));
            default -> throw new BadRequestException("Unknown sort option: " + sort);
        };
    }
}
