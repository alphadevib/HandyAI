package com.handyai.build.controller;

import com.handyai.build.dto.StatsResponse;
import com.handyai.build.service.ToolService;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MetaController {

    private final ToolService toolService;

    public MetaController(ToolService toolService) {
        this.toolService = toolService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "service", "HandyAI");
    }

    @GetMapping("/stats")
    public StatsResponse stats() {
        return toolService.stats();
    }
}
