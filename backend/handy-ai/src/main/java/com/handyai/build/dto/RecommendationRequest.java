package com.handyai.build.dto;

import jakarta.validation.constraints.Size;
import java.util.List;

/** What the visitor tells us on the home page; every field is optional. */
public record RecommendationRequest(
        @Size(max = 400, message = "Keep the description under 400 characters")
        String goal,

        @Size(max = 120)
        String profession,

        List<String> categorySlugs,

        String pricing,

        Integer limit) {
}
